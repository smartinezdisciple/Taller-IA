import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface UsuarioPayload {
  id: string;
  nombre_usuario: string;
  rol: 'administrador' | 'vendedor' | 'comprador';
}

export interface RequestAutenticado extends Request {
  usuario?: UsuarioPayload;
}

export function autenticar(req: RequestAutenticado, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ mensaje: 'Token de acceso ausente. Inicie sesión.' });
  }

  const secreto = process.env.JWT_SECRETO || 'secreto_desarrollo_token_3821';

  jwt.verify(token, secreto, (err, decoded) => {
    if (err) {
      return res.status(401).json({ mensaje: 'Token de acceso inválido o expirado.', codigo: 'TOKEN_EXPIRADO' });
    }

    req.usuario = decoded as UsuarioPayload;
    next();
  });
}
