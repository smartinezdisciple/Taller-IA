import bcrypt from 'bcrypt';
import { pool } from './db.js';

export async function sembrarUsuarios() {
  try {
    const resCount = await pool.query('SELECT COUNT(*) FROM usuarios');
    const totalUsers = parseInt(resCount.rows[0].count);

    if (totalUsers === 0) {
      console.log('[Semilla] Tabla de usuarios vacía. Sembrando usuarios por defecto...');

      // Password compliance with specification
      const contrasenaClara = 'Taller123!_Pro';
      const saltRounds = 12;
      const hash = await bcrypt.hash(contrasenaClara, saltRounds);

      // Seed admin user
      await pool.query(
        `INSERT INTO usuarios (nombre_usuario, contrasena_hash, nombre_completo, rol, activo)
         VALUES ($1, $2, $3, $4, $5)`,
        ['admin', hash, 'Carlos Méndez', 'administrador', true]
      );

      // Seed vendedor user
      await pool.query(
        `INSERT INTO usuarios (nombre_usuario, contrasena_hash, nombre_completo, rol, activo)
         VALUES ($1, $2, $3, $4, $5)`,
        ['vendedor', hash, 'Ana Vendedora', 'vendedor', true]
      );

      // Seed comprador user
      await pool.query(
        `INSERT INTO usuarios (nombre_usuario, contrasena_hash, nombre_completo, rol, activo)
         VALUES ($1, $2, $3, $4, $5)`,
        ['comprador', hash, 'Pedro Comprador', 'comprador', true]
      );

      console.log('[Semilla] Usuarios sembrados exitosamente. Contraseña común: Taller123!_Pro');
    } else {
      console.log(`[Semilla] Tabla de usuarios ya contiene ${totalUsers} registro(s). Saltando sembrado.`);
    }
  } catch (error) {
    console.error('[Semilla] Error al sembrar usuarios:', error);
  }
}
