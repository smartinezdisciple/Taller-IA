import { Router } from 'express';
import { pool } from '../config/db.js';
import { autenticar } from '../middleware/autenticar.js';
import { autorizar } from '../middleware/autorizar.js';

const router = Router();

// GET /api/reportes/dashboard
// Returns general KPIs, stock alerts, weekly chart data and audit logs. Admin only.
router.get('/dashboard', autenticar, autorizar(['administrador']), async (req, res) => {
  try {
    // 1. Ventas del mes
    const ventasMesRes = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total 
       FROM ventas 
       WHERE creado_en >= date_trunc('month', now())`
    );
    const ventasMes = parseFloat(ventasMesRes.rows[0].total);

    // 2. Compras del mes
    const comprasMesRes = await pool.query(
      `SELECT COALESCE(SUM(subtotal_linea), 0) AS total 
       FROM detalle_ordenes_compra doc 
       JOIN ordenes_compra oc ON doc.id_orden = oc.id 
       WHERE oc.creado_en >= date_trunc('month', now()) AND oc.estado = 'recibido'`
    );
    const comprasMes = parseFloat(comprasMesRes.rows[0].total);

    // 3. Cantidad de repuestos en stock crítico
    const stockCriticoCountRes = await pool.query(
      `SELECT COUNT(*) AS total FROM vista_stock_bajo`
    );
    const stockCriticoCount = parseInt(stockCriticoCountRes.rows[0].total);

    // 4. Cantidad de órdenes activas (aprobado o pendiente)
    const ordenesActivasRes = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM ordenes_compra 
       WHERE estado = 'pendiente' OR estado = 'aprobado'`
    );
    const ordenesActivas = parseInt(ordenesActivasRes.rows[0].total);

    // 5. Tabla de repuestos en stock crítico (últimos 5)
    const stockCriticoListRes = await pool.query(
      `SELECT id, sku, nombre_repuesto, cantidad_stock, stock_minimo, precio_venta, color
       FROM vista_stock_bajo 
       LIMIT 5`
    );

    // 6. Actividad reciente (combinando auditoría y ventas)
    const auditRes = await pool.query(
      `SELECT a.tabla_afectada, a.operacion, a.id_registro, a.creado_en, u.nombre_completo
       FROM auditoria a
       LEFT JOIN usuarios u ON a.id_usuario = u.id
       ORDER BY a.creado_en DESC 
       LIMIT 5`
    );
    const actividades = auditRes.rows.map(row => {
      let titulo = 'Actividad del Sistema';
      let detalle = `Registro modificado en la tabla ${row.tabla_afectada}`;

      if (row.operacion === 'INSERT') {
        if (row.tabla_afectada === 'ventas') {
          titulo = 'Nueva Venta Registrada';
          detalle = `Factura #${row.id_registro} creada por ${row.nombre_completo || 'Usuario'}`;
        } else if (row.tabla_afectada === 'repuestos') {
          titulo = 'Nuevo Repuesto Creado';
          detalle = `Repuesto ID ${row.id_registro} añadido al inventario`;
        }
      } else if (row.tabla_afectada === 'usuarios') {
        titulo = `Usuario ${row.operacion.toLowerCase()}`;
        detalle = `Cuenta de usuario ${row.id_registro} modificada`;
      }

      return {
        titulo,
        detalle,
        tiempo: row.creado_en,
        tipo: row.operacion === 'INSERT' ? 'success' : 'info'
      };
    });

    return res.status(200).json({
      kpis: {
        ventasMes,
        comprasMes,
        stockCriticoCount,
        ordenesActivas
      },
      stockCritico: stockCriticoListRes.rows,
      actividades
    });
  } catch (error) {
    console.error('[Dashboard Report] Error:', error);
    return res.status(500).json({ mensaje: 'Error al generar reporte de dashboard.' });
  }
});

// GET /api/reportes/ventas-por-mes
router.get('/ventas-por-mes', autenticar, autorizar(['administrador']), async (req, res) => {
  try {
    const reportRes = await pool.query('SELECT * FROM vista_ventas_por_mes LIMIT 12');
    return res.status(200).json(reportRes.rows);
  } catch (error) {
    console.error('[Sales Report] Error:', error);
    return res.status(500).json({ mensaje: 'Error al generar reporte mensual.' });
  }
});

export default router;
