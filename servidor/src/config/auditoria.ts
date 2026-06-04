import { pool } from './db.js';

export async function registrarAuditoria(
  tabla: string,
  operacion: 'INSERT' | 'UPDATE' | 'DELETE',
  idRegistro: string,
  datosAnteriores: any,
  datosNuevos: any,
  idUsuario: string | null,
  ipOrigen: string | null
) {
  try {
    // Sanitizar contrasena_hash si existiera en los datos
    const limpiarDatos = (obj: any) => {
      if (!obj) return null;
      const copia = { ...obj };
      if ('contrasena_hash' in copia) {
        delete copia.contrasena_hash;
      }
      return copia;
    };

    await pool.query(
      `INSERT INTO auditoria (tabla_afectada, operacion, id_registro, datos_anteriores, datos_nuevos, id_usuario, ip_origen)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        tabla,
        operacion,
        idRegistro,
        datosAnteriores ? JSON.stringify(limpiarDatos(datosAnteriores)) : null,
        datosNuevos ? JSON.stringify(limpiarDatos(datosNuevos)) : null,
        idUsuario,
        ipOrigen
      ]
    );
  } catch (error) {
    console.error('[Auditoria] Error al registrar en tabla auditoria:', error);
  }
}
