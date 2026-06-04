import { Router } from 'express';
import { pool } from '../config/db.js';
import { autenticar, RequestAutenticado } from '../middleware/autenticar.js';
import { autorizar } from '../middleware/autorizar.js';
import { registrarAuditoria } from '../config/auditoria.js';

const router = Router();

// GET /api/marcas
// Accessible by admin, vendedor, comprador
router.get('/marcas', autenticar, autorizar(['administrador', 'vendedor', 'comprador']), async (req, res) => {
  try {
    const brandsRes = await pool.query(
      'SELECT id, nombre_marca FROM marcas_vehiculo WHERE eliminado_en IS NULL ORDER BY nombre_marca ASC'
    );
    return res.status(200).json(brandsRes.rows);
  } catch (error: any) {
    console.error('[Repuestos Marcas] Error:', error);
    return res.status(500).json({ mensaje: 'Error al obtener marcas.' });
  }
});

// GET /api/repuestos/alertas-stock
// Accessible by admin only (returns low stock items using SQL view)
router.get('/alertas-stock', autenticar, autorizar(['administrador']), async (req, res) => {
  try {
    const alertsRes = await pool.query('SELECT * FROM vista_stock_bajo');
    return res.status(200).json(alertsRes.rows);
  } catch (error: any) {
    console.error('[Repuestos Alertas] Error:', error);
    return res.status(500).json({ mensaje: 'Error al obtener alertas de stock.' });
  }
});

// GET /api/repuestos/:id/historial-precios
// Accessible by admin only (returns cost price history)
router.get('/:id/historial-precios', autenticar, autorizar(['administrador']), async (req, res) => {
  const { id } = req.params;
  const { desde, hasta } = req.query;

  try {
    let query = `
      SELECT hpc.id, hpc.id_orden, hpc.precio_costo, hpc.cantidad, hpc.registrado_en, oc.numero_orden
      FROM historial_precios_costo hpc
      JOIN ordenes_compra oc ON hpc.id_orden = oc.id
      WHERE hpc.id_repuesto = $1
    `;
    const params: any[] = [id];

    if (desde) {
      params.push(desde);
      query += ` AND hpc.registrado_en >= $${params.length}`;
    }
    if (hasta) {
      params.push(hasta);
      query += ` AND hpc.registrado_en <= $${params.length}`;
    }

    query += ' ORDER BY hpc.registrado_en DESC';

    const historyRes = await pool.query(query, params);
    return res.status(200).json(historyRes.rows);
  } catch (error: any) {
    console.error('[Repuestos Historial Costos] Error:', error);
    return res.status(500).json({ mensaje: 'Error al obtener historial de costos.' });
  }
});

// GET /api/repuestos
// Accessible by admin, vendedor, comprador (reads parts list with search/filter/pagination)
router.get('/', autenticar, autorizar(['administrador', 'vendedor', 'comprador']), async (req: RequestAutenticado, res) => {
  const { pagina = '1', limite = '20', buscar, marca, soloActivos = 'true' } = req.query;
  const pageNum = parseInt(pagina as string) || 1;
  const limitNum = Math.min(parseInt(limite as string) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  try {
    let whereClauses: string[] = [];
    const params: any[] = [];

    // Filter soft deleted rows
    if (soloActivos === 'true') {
      whereClauses.push('r.eliminado_en IS NULL');
    }

    // GIN Index-based full text search on name
    if (buscar && typeof buscar === 'string' && buscar.trim() !== '') {
      params.push(buscar.trim());
      whereClauses.push(`to_tsvector('spanish', r.nombre_repuesto) @@ plainto_tsquery('spanish', $${params.length})`);
    }

    // Brand filter
    if (marca) {
      params.push(parseInt(marca as string));
      whereClauses.push(`r.id_marca_vehiculo = $${params.length}`);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) AS total 
      FROM repuestos r
      ${whereStr}
    `;
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0].total);

    // Get paginated rows
    const dataParams = [...params];
    dataParams.push(limitNum, offset);
    const dataQuery = `
      SELECT r.*, m.nombre_marca
      FROM repuestos r
      JOIN marcas_vehiculo m ON r.id_marca_vehiculo = m.id
      ${whereStr}
      ORDER BY r.creado_en DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;
    const dataRes = await pool.query(dataQuery, dataParams);

    // If roles other than administrador, map rows to omit cost prices for security
    const isUserAdmin = req.usuario?.rol === 'administrador';
    const repuestos = dataRes.rows.map(row => {
      if (!isUserAdmin) {
        const copy = { ...row };
        delete copy.precio_costo;
        return copy;
      }
      return row;
    });

    return res.status(200).json({
      repuestos,
      total,
      pagina: pageNum,
      limite: limitNum
    });
  } catch (error: any) {
    console.error('[Repuestos List] Error:', error);
    return res.status(500).json({ mensaje: 'Error al obtener repuestos.' });
  }
});

// GET /api/repuestos/:id
// Accessible by admin, vendedor, comprador
router.get('/:id', autenticar, autorizar(['administrador', 'vendedor', 'comprador']), async (req: RequestAutenticado, res) => {
  const { id } = req.params;
  try {
    const itemRes = await pool.query(
      `SELECT r.*, m.nombre_marca
       FROM repuestos r
       JOIN marcas_vehiculo m ON r.id_marca_vehiculo = m.id
       WHERE r.id = $1 AND r.eliminado_en IS NULL`,
      [id]
    );

    if (itemRes.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Repuesto no encontrado.' });
    }

    const row = itemRes.rows[0];
    const isUserAdmin = req.usuario?.rol === 'administrador';
    if (!isUserAdmin) {
      delete row.precio_costo;
    }

    return res.status(200).json(row);
  } catch (error: any) {
    console.error('[Repuestos Get ID] Error:', error);
    return res.status(500).json({ mensaje: 'Error al obtener repuesto.' });
  }
});

// POST /api/repuestos
// Admin only
router.post('/', autenticar, autorizar(['administrador']), async (req: RequestAutenticado, res) => {
  const {
    sku,
    nombre_repuesto,
    id_marca_vehiculo,
    precio_venta,
    cantidad_stock = 0,
    stock_minimo = 5,
    anio_desde,
    anio_hasta,
    precio_costo = 0.00,
    color,
    descripcion,
    imagen_url
  } = req.body;

  if (!sku || !nombre_repuesto || !id_marca_vehiculo || !precio_venta) {
    return res.status(400).json({ mensaje: 'SKU, nombre, marca y precio de venta son requeridos.' });
  }

  if (parseFloat(precio_venta) <= 0) {
    return res.status(400).json({ mensaje: 'El precio de venta debe ser mayor a 0.' });
  }

  if (anio_desde && anio_hasta && parseInt(anio_hasta) < parseInt(anio_desde)) {
    return res.status(400).json({ mensaje: 'El año de término no puede ser menor al año de inicio.' });
  }

  try {
    // Check if brand exists
    const brandCheck = await pool.query('SELECT id FROM marcas_vehiculo WHERE id = $1 AND eliminado_en IS NULL', [id_marca_vehiculo]);
    if (brandCheck.rows.length === 0) {
      return res.status(422).json({ mensaje: 'La marca de vehículo especificada no existe.' });
    }

    // Check SKU uniqueness among active records
    const skuCheck = await pool.query('SELECT id FROM repuestos WHERE sku = $1 AND eliminado_en IS NULL', [sku]);
    if (skuCheck.rows.length > 0) {
      return res.status(409).json({ mensaje: 'El SKU ya existe.' });
    }

    const createdBy = req.usuario?.id || null;

    const insertRes = await pool.query(
      `INSERT INTO repuestos (
        sku, nombre_repuesto, id_marca_vehiculo, cantidad_stock, stock_minimo, 
        precio_venta, precio_costo, color, descripcion, imagen_url, creado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        sku,
        nombre_repuesto,
        id_marca_vehiculo,
        parseInt(cantidad_stock) || 0,
        parseInt(stock_minimo) || 0,
        parseFloat(precio_venta),
        parseFloat(precio_costo),
        color || null,
        descripcion || null,
        imagen_url || null,
        createdBy
      ]
    );

    const newPart = insertRes.rows[0];

    // Log audit
    await registrarAuditoria(
      'repuestos',
      'INSERT',
      newPart.id.toString(),
      null,
      newPart,
      createdBy,
      req.ip || null
    );

    return res.status(201).json(newPart);
  } catch (error: any) {
    console.error('[Repuestos Post] Error:', error);
    return res.status(500).json({ mensaje: 'Error al registrar repuesto.' });
  }
});

// PUT /api/repuestos/:id
// Admin only
router.put('/:id', autenticar, autorizar(['administrador']), async (req: RequestAutenticado, res) => {
  const { id } = req.params;
  const {
    nombre_repuesto,
    id_marca_vehiculo,
    precio_venta,
    cantidad_stock,
    stock_minimo,
    anio_desde,
    anio_hasta,
    precio_costo,
    color,
    descripcion,
    imagen_url
  } = req.body;

  if (!nombre_repuesto || !id_marca_vehiculo || !precio_venta) {
    return res.status(400).json({ mensaje: 'Nombre, marca y precio de venta son requeridos.' });
  }

  if (parseFloat(precio_venta) <= 0) {
    return res.status(400).json({ mensaje: 'El precio de venta debe ser mayor a 0.' });
  }

  if (anio_desde && anio_hasta && parseInt(anio_hasta) < parseInt(anio_desde)) {
    return res.status(400).json({ mensaje: 'El año de término no puede ser menor al año de inicio.' });
  }

  try {
    // Get current repuesto state
    const currentRes = await pool.query('SELECT * FROM repuestos WHERE id = $1 AND eliminado_en IS NULL', [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Repuesto no encontrado.' });
    }
    const currentPart = currentRes.rows[0];

    // Verify brand
    const brandCheck = await pool.query('SELECT id FROM marcas_vehiculo WHERE id = $1 AND eliminado_en IS NULL', [id_marca_vehiculo]);
    if (brandCheck.rows.length === 0) {
      return res.status(422).json({ mensaje: 'La marca de vehículo especificada no existe.' });
    }

    const updateRes = await pool.query(
      `UPDATE repuestos
       SET nombre_repuesto = $1,
           id_marca_vehiculo = $2,
           precio_venta = $3,
           cantidad_stock = $4,
           stock_minimo = $5,
           color = $6,
           descripcion = $7,
           imagen_url = $8,
           precio_costo = $9,
           actualizado_en = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        nombre_repuesto,
        id_marca_vehiculo,
        parseFloat(precio_venta),
        parseInt(cantidad_stock) !== undefined ? parseInt(cantidad_stock) : currentPart.cantidad_stock,
        parseInt(stock_minimo) !== undefined ? parseInt(stock_minimo) : currentPart.stock_minimo,
        color !== undefined ? color : currentPart.color,
        descripcion !== undefined ? descripcion : currentPart.descripcion,
        imagen_url !== undefined ? imagen_url : currentPart.imagen_url,
        precio_costo !== undefined ? parseFloat(precio_costo) : currentPart.precio_costo,
        id
      ]
    );

    const updatedPart = updateRes.rows[0];

    // Audit log
    await registrarAuditoria(
      'repuestos',
      'UPDATE',
      id,
      currentPart,
      updatedPart,
      req.usuario?.id || null,
      req.ip || null
    );

    return res.status(200).json(updatedPart);
  } catch (error: any) {
    console.error('[Repuestos Put] Error:', error);
    return res.status(500).json({ mensaje: 'Error al actualizar repuesto.' });
  }
});

// DELETE /api/repuestos/:id
// Admin only
router.delete('/:id', autenticar, autorizar(['administrador']), async (req: RequestAutenticado, res) => {
  const { id } = req.params;

  try {
    const currentRes = await pool.query('SELECT * FROM repuestos WHERE id = $1 AND eliminado_en IS NULL', [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Repuesto no encontrado.' });
    }
    const currentPart = currentRes.rows[0];

    // Soft delete
    const deleteRes = await pool.query(
      'UPDATE repuestos SET eliminado_en = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    const deletedPart = deleteRes.rows[0];

    // Audit log
    await registrarAuditoria(
      'repuestos',
      'DELETE',
      id,
      currentPart,
      deletedPart,
      req.usuario?.id || null,
      req.ip || null
    );

    return res.status(200).json({ mensaje: 'Repuesto eliminado exitosamente.' });
  } catch (error: any) {
    console.error('[Repuestos Delete] Error:', error);
    return res.status(500).json({ mensaje: 'Error al eliminar repuesto.' });
  }
});

export default router;
