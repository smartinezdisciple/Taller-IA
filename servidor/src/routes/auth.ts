import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { autenticar, RequestAutenticado } from '../middleware/autenticar.js';
import { autorizar } from '../middleware/autorizar.js';

const router = Router();

// Hashing helper for DB refresh tokens
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Manual cookie parser
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    list[parts.shift()!.trim()] = decodeURI(parts.join('='));
  });
  return list;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { nombre_usuario, contrasena } = req.body;

  if (!nombre_usuario || !contrasena) {
    return res.status(400).json({ mensaje: 'Usuario y contraseña son requeridos.' });
  }

  try {
    const userRes = await pool.query('SELECT * FROM usuarios WHERE nombre_usuario = $1', [nombre_usuario]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas.' });
    }

    const usuario = userRes.rows[0];

    // Check account status
    if (!usuario.activo) {
      return res.status(403).json({ mensaje: 'Cuenta desactivada.' });
    }

    // Check locking status
    if (usuario.bloqueado_en) {
      return res.status(423).json({ mensaje: 'Cuenta bloqueada. Contacte al administrador.' });
    }

    // Verify password
    const match = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!match) {
      // Increment failed attempts
      const nuevosIntentos = usuario.intentos_fallidos + 1;
      if (nuevosIntentos >= 3) {
        await pool.query('UPDATE usuarios SET intentos_fallidos = $1, bloqueado_en = NOW() WHERE id = $2', [nuevosIntentos, usuario.id]);
        return res.status(423).json({ mensaje: 'Cuenta bloqueada. Contacte al administrador.' });
      } else {
        await pool.query('UPDATE usuarios SET intentos_fallidos = $1 WHERE id = $2', [nuevosIntentos, usuario.id]);
        return res.status(401).json({ mensaje: 'Credenciales inválidas.' });
      }
    }

    // Clear failed attempts upon success
    await pool.query('UPDATE usuarios SET intentos_fallidos = 0, bloqueado_en = NULL WHERE id = $1', [usuario.id]);

    // Token creation payloads
    const payload = {
      id: usuario.id,
      nombre_usuario: usuario.nombre_usuario,
      rol: usuario.rol
    };

    const jwtSecret = process.env.JWT_SECRETO || 'secreto_desarrollo_token_3821';
    const cookieSecret = process.env.COOKIE_SECRETO || 'secreto_desarrollo_cookie_8829';

    const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: usuario.id }, cookieSecret, { expiresIn: '7d' });

    // Store hashed refresh token in DB
    const hash = hashToken(refreshToken);
    const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO tokens_refresco (id_usuario, token_hash, expira_en) VALUES ($1, $2, $3)',
      [usuario.id, hash, expiraEn]
    );

    // Set secure HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      accessToken,
      usuario: {
        id: usuario.id,
        nombre_completo: usuario.nombre_completo,
        rol: usuario.rol
      }
    });
  } catch (error) {
    console.error('[Auth Login] Error:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const refreshToken = cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ mensaje: 'Token de refresco ausente.' });
  }

  try {
    const hash = hashToken(refreshToken);
    const tokenRes = await pool.query(
      'SELECT * FROM tokens_refresco WHERE token_hash = $1 AND revocado = FALSE AND expira_en > NOW()',
      [hash]
    );

    if (tokenRes.rows.length === 0) {
      return res.status(401).json({ mensaje: 'Token de refresco inválido o revocado.' });
    }

    const cookieSecret = process.env.COOKIE_SECRETO || 'secreto_desarrollo_cookie_8829';
    let decoded: any;

    try {
      decoded = jwt.verify(refreshToken, cookieSecret);
    } catch (err) {
      return res.status(401).json({ mensaje: 'Token de refresco corrupto.' });
    }

    const userRes = await pool.query('SELECT * FROM usuarios WHERE id = $1', [decoded.id]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ mensaje: 'Usuario no encontrado.' });
    }

    const usuario = userRes.rows[0];
    if (!usuario.activo || usuario.bloqueado_en) {
      return res.status(403).json({ mensaje: 'Cuenta bloqueada o inactiva.' });
    }

    // Revoke current token (Token Rotation)
    await pool.query('UPDATE tokens_refresco SET revocado = TRUE WHERE token_hash = $1', [hash]);

    // Generate new pair
    const payload = {
      id: usuario.id,
      nombre_usuario: usuario.nombre_usuario,
      rol: usuario.rol
    };

    const jwtSecret = process.env.JWT_SECRETO || 'secreto_desarrollo_token_3821';
    const newAccessToken = jwt.sign(payload, jwtSecret, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({ id: usuario.id }, cookieSecret, { expiresIn: '7d' });

    // Store new refresh token hash in DB
    const newHash = hashToken(newRefreshToken);
    const newExpira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO tokens_refresco (id_usuario, token_hash, expira_en) VALUES ($1, $2, $3)',
      [usuario.id, newHash, newExpira]
    );

    // Refresh HttpOnly Cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      accessToken: newAccessToken,
      usuario: {
        id: usuario.id,
        nombre_completo: usuario.nombre_completo,
        rol: usuario.rol
      }
    });
  } catch (error) {
    console.error('[Auth Refresh] Error:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const refreshToken = cookies.refreshToken;

  if (refreshToken) {
    try {
      const hash = hashToken(refreshToken);
      await pool.query('UPDATE tokens_refresco SET revocado = TRUE WHERE token_hash = $1', [hash]);
    } catch (error) {
      console.error('[Auth Logout] DB Error:', error);
    }
  }

  // Clear cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  return res.status(200).json({ mensaje: 'Sesión cerrada correctamente.' });
});

// PUT /api/auth/cambiar-contrasena
router.put('/cambiar-contrasena', autenticar, async (req: RequestAutenticado, res) => {
  const { contrasena_actual, contrasena_nueva } = req.body;

  if (!contrasena_actual || !contrasena_nueva) {
    return res.status(400).json({ mensaje: 'Contraseña actual y nueva son requeridas.' });
  }

  // Password Validation: 12 chars minimum, 1 uppercase, 1 number, 1 special character
  const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':",\\|.<>\/?]).{12,}$/;
  if (!regex.test(contrasena_nueva)) {
    return res.status(400).json({
      mensaje: 'La nueva contraseña debe tener al menos 12 caracteres, incluir una mayúscula, un número y un carácter especial.'
    });
  }

  try {
    const userRes = await pool.query('SELECT contrasena_hash FROM usuarios WHERE id = $1', [req.usuario?.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    const currentHash = userRes.rows[0].contrasena_hash;
    const match = await bcrypt.compare(contrasena_actual, currentHash);

    if (!match) {
      return res.status(401).json({ mensaje: 'La contraseña actual es incorrecta.' });
    }

    // Hash and store the new password
    const hash = await bcrypt.hash(contrasena_nueva, 12);
    await pool.query('UPDATE usuarios SET contrasena_hash = $1 WHERE id = $2', [hash, req.usuario?.id]);

    return res.status(200).json({ mensaje: 'Contraseña actualizada.' });
  } catch (error) {
    console.error('[Auth Password Change] Error:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
});

// GET /api/auth/usuarios (Admin only)
router.get('/usuarios', autenticar, autorizar(['administrador']), async (req, res) => {
  try {
    const usersRes = await pool.query(
      `SELECT id, nombre_usuario, nombre_completo, rol, intentos_fallidos, bloqueado_en, activo, creado_en 
       FROM usuarios 
       ORDER BY creado_en DESC`
    );
    return res.status(200).json(usersRes.rows);
  } catch (error) {
    console.error('[Auth Get Users] Error:', error);
    return res.status(500).json({ mensaje: 'Error al obtener usuarios.' });
  }
});

// PUT /api/auth/usuarios/:id/desbloquear (Admin only)
router.put('/usuarios/:id/desbloquear', autenticar, autorizar(['administrador']), async (req, res) => {
  const { id } = req.params;

  try {
    const userCheck = await pool.query('SELECT id FROM usuarios WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    await pool.query('UPDATE usuarios SET intentos_fallidos = 0, bloqueado_en = NULL WHERE id = $1', [id]);
    return res.status(200).json({ mensaje: 'Cuenta desbloqueada exitosamente.' });
  } catch (error) {
    console.error('[Auth Unlock User] Error:', error);
    return res.status(500).json({ mensaje: 'Error al desbloquear cuenta.' });
  }
});

export default router;
