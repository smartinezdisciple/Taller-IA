import { Router } from 'express';
import { pool } from '../config/db.js';
import { autenticar, RequestAutenticado } from '../middleware/autenticar.js';
import { autorizar } from '../middleware/autorizar.js';
import { registrarAuditoria } from '../config/auditoria.js';

const router = Router();

// ==========================================
// PROVEEDORES CRUD
// ==========================================

// GET /api/proveedores
// List all suppliers (accessible by administrador and comprador)
router.get('/proveedores', autenticar, autorizar(['administrador', 'comprador']), async (req, res) => {
  try {
    const suppliersRes = await pool.query('SELECT * FROM proveedores ORDER BY nombre_empresa ASC');
    return res.status(200).json(suppliersRes.rows);
  } catch (error: any) {
    console.error('[Proveedores List] Error:', error);
    return res.status(500).json({ mensaje: 'Error al obtener proveedores.' });
  }
});

// POST /api/proveedores
// Create a supplier (accessible by administrador only)
router.post('/proveedores', autenticar, autorizar(['administrador']), async (req: RequestAutenticado, res) => {
  const { nombre_empresa, ruc, email, telefono } = req.body;

  if (!nombre_empresa) {
    return res.status(400).json({ mensaje: 'El nombre de la empresa es requerido.' });
  }

  try {
    if (ruc) {
      const rucCheck = await pool.query('SELECT id FROM proveedores WHERE ruc = $1', [ruc]);
      if (rucCheck.rows.length > 0) {
        return res.status(409).json({ mensaje: 'Un proveedor con este RUC ya existe.' });
      }
    }

    const insertRes = await pool.query(
      `INSERT INTO proveedores (nombre_empresa, ruc, email, telefono)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [nombre_empresa, ruc || null, email || null, telefono || null]
    );

    const supplier = insertRes.rows[0];

    // Audit log
    await registrarAuditoria(
      'proveedores',
      'INSERT',
      String(supplier.id),
      null,
      supplier,
      req.usuario?.id || null,
      req.ip || null
    );

    return res.status(201).json(supplier);
  } catch (error: any) {
    console.error('[Proveedores Post] Error:', error);
    return res.status(500).json({ mensaje: 'Error al registrar proveedor.' });
  }
});

// PUT /api/proveedores/:id
// Update a supplier (accessible by administrador only)
router.put('/proveedores/:id', autenticar, autorizar(['administrador']), async (req: RequestAutenticado, res) => {
  const { id } = req.params;
  const { nombre_empresa, ruc, email, telefono } = req.body;

  if (!nombre_empresa) {
    return res.status(400).json({ mensaje: 'El nombre de la empresa es requerido.' });
  }

  try {
    const checkRes = await pool.query('SELECT * FROM proveedores WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Proveedor no encontrado.' });
    }

    const originalSupplier = checkRes.rows[0];

    if (ruc) {
      const rucCheck = await pool.query('SELECT id FROM proveedores WHERE ruc = $1 AND id <> $2', [ruc, id]);
      if (rucCheck.rows.length > 0) {
        return res.status(409).json({ mensaje: 'Un proveedor con este RUC ya existe.' });
      }
    }

    const updateRes = await pool.query(
      `UPDATE proveedores
       SET nombre_empresa = $1, ruc = $2, email = $3, telefono = $4, actualizado_en = NOW()
       WHERE id = $5
       RETURNING *`,
      [nombre_empresa, ruc || null, email || null, telefono || null, id]
    );

    const updatedSupplier = updateRes.rows[0];

    // Audit log
    await registrarAuditoria(
      'proveedores',
      'UPDATE',
      String(id),
      originalSupplier,
      updatedSupplier,
      req.usuario?.id || null,
      req.ip || null
    );

    return res.status(200).json(updatedSupplier);
  } catch (error: any) {
    console.error('[Proveedores Put] Error:', error);
    return res.status(500).json({ mensaje: 'Error al actualizar proveedor.' });
  }
});

// ==========================================
// ORDENES DE COMPRA CRUD & STATE MACHINE
// ==========================================

// GET /api/ordenes
// List purchase orders with pagination and filters (accessible by administrador, comprador)
router.get('/ordenes', autenticar, autorizar(['administrador', 'comprador']), async (req, res) => {
  const { pagina = '1', limite = '20', estado } = req.query;
  const pageNum = parseInt(pagina as string) || 1;
  const limitNum = Math.min(parseInt(limite as string) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  try {
    let whereClauses: string[] = [];
    const params: any[] = [];

    if (estado) {
      params.push(estado);
      whereClauses.push(`oc.estado = $${params.length}`);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await pool.query(
      `SELECT COUNT(*) AS total FROM ordenes_compra oc ${whereStr}`,
      params
    );
    const total = parseInt(countRes.rows[0].total);

    const dataParams = [...params];
    dataParams.push(limitNum, offset);
    const dataQuery = `
      SELECT oc.*, p.nombre_empresa, u.nombre_completo AS creador_nombre, u2.nombre_completo AS aprobador_nombre
      FROM ordenes_compra oc
      JOIN proveedores p ON oc.id_proveedor = p.id
      JOIN usuarios u ON oc.creado_por = u.id
      LEFT JOIN usuarios u2 ON oc.aprobado_por = u2.id
      ${whereStr}
      ORDER BY oc.creado_en DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;
    const dataRes = await pool.query(dataQuery, dataParams);

    return res.status(200).json({
      ordenes: dataRes.rows,
      total,
      pagina: pageNum,
      limite: limitNum
    });
  } catch (error: any) {
    console.error('[Ordenes List] Error:', error);
    return res.status(500).json({ mensaje: 'Error al obtener ordenes de compra.' });
  }
});

// POST /api/ordenes
// Create a purchase order in 'pendiente' state in an ACID transaction (accessible by administrador, comprador)
router.post('/ordenes', autenticar, autorizar(['administrador', 'comprador']), async (req: RequestAutenticado, res) => {
  const { id_proveedor, items } = req.body;

  if (!id_proveedor || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ mensaje: 'ID de proveedor e items de compra son requeridos.' });
  }

  const dbClient = await pool.connect();

  try {
    // 1. Verify supplier exists
    const supplierRes = await dbClient.query('SELECT * FROM proveedores WHERE id = $1', [id_proveedor]);
    if (supplierRes.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Proveedor no existe.' });
    }

    await dbClient.query('BEGIN');

    const validatedItems: any[] = [];

    // 2. Validate each item
    for (const item of items) {
      const { id_repuesto, cantidad, precio_costo } = item;
      const parsedCantidad = parseInt(cantidad);
      const parsedCosto = parseFloat(precio_costo);

      if (!id_repuesto || isNaN(parsedCantidad) || parsedCantidad <= 0 || isNaN(parsedCosto) || parsedCosto < 0) {
        throw { status: 400, mensaje: 'Cada ítem debe tener un id_repuesto, cantidad > 0, y precio_costo >= 0.' };
      }

      // Verify repuesto exists and is not deleted
      const partRes = await dbClient.query(
        'SELECT id, nombre_repuesto, eliminado_en FROM repuestos WHERE id = $1',
        [id_repuesto]
      );

      if (partRes.rows.length === 0 || partRes.rows[0].eliminado_en !== null) {
        throw { status: 422, mensaje: `El repuesto con ID ${id_repuesto} no existe o fue eliminado.` };
      }

      validatedItems.push({
        id_repuesto,
        cantidad: parsedCantidad,
        precio_costo: parsedCosto,
        nombre: partRes.rows[0].nombre_repuesto
      });
    }

    const creadoPor = req.usuario?.id;

    // 3. Create purchase order header (trigger trg_numero_orden generates numero_orden)
    const orderInsertRes = await dbClient.query(
      `INSERT INTO ordenes_compra (id_proveedor, estado, creado_por)
       VALUES ($1, 'pendiente', $2)
       RETURNING *`,
      [id_proveedor, creadoPor]
    );

    const orderObj = orderInsertRes.rows[0];

    // 4. Insert details
    for (const item of validatedItems) {
      await dbClient.query(
        `INSERT INTO detalle_ordenes_compra (id_orden, id_repuesto, cantidad, precio_costo)
         VALUES ($1, $2, $3, $4)`,
        [orderObj.id, item.id_repuesto, item.cantidad, item.precio_costo]
      );
    }

    await dbClient.query('COMMIT');

    // Audit log
    await registrarAuditoria(
      'ordenes_compra',
      'INSERT',
      orderObj.numero_orden,
      null,
      orderObj,
      creadoPor || null,
      req.ip || null
    );

    return res.status(201).json(orderObj);
  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error('[Ordenes Post] Rollback triggered:', error);

    const errStatus = error.status || 500;
    const errMessage = error.mensaje || 'Error al procesar la orden de compra en el servidor.';
    return res.status(errStatus).json({ mensaje: errMessage });
  } finally {
    dbClient.release();
  }
});

// GET /api/ordenes/:id
// Get detailed purchase order with items (accessible by administrador, comprador)
router.get('/ordenes/:id', autenticar, autorizar(['administrador', 'comprador']), async (req, res) => {
  const { id } = req.params;

  try {
    const orderRes = await pool.query(
      `SELECT oc.*, p.nombre_empresa, p.ruc, p.email, p.telefono,
              u.nombre_completo AS creador_nombre,
              u2.nombre_completo AS aprobador_nombre
       FROM ordenes_compra oc
       JOIN proveedores p ON oc.id_proveedor = p.id
       JOIN usuarios u ON oc.creado_por = u.id
       LEFT JOIN usuarios u2 ON oc.aprobado_por = u2.id
       WHERE oc.id = $1`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Orden de compra no encontrada.' });
    }

    const detailsRes = await pool.query(
      `SELECT doc.*, r.nombre_repuesto, r.sku
       FROM detalle_ordenes_compra doc
       JOIN repuestos r ON doc.id_repuesto = r.id
       WHERE doc.id_orden = $1`,
      [id]
    );

    const order = orderRes.rows[0];
    order.items = detailsRes.rows;

    return res.status(200).json(order);
  } catch (error: any) {
    console.error('[Ordenes Get ID] Error:', error);
    return res.status(500).json({ mensaje: 'Error al obtener detalle de orden de compra.' });
  }
});

// PUT /api/ordenes/:id/estado
// Transition status of purchase order. (accessible by administrador only!)
router.put('/ordenes/:id/estado', autenticar, autorizar(['administrador']), async (req: RequestAutenticado, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!estado) {
    return res.status(400).json({ mensaje: 'El nuevo estado es requerido.' });
  }

  const validStates = ['pendiente', 'aprobado', 'recibido', 'cancelado'];
  if (!validStates.includes(estado)) {
    return res.status(400).json({ mensaje: 'Estado no válido.' });
  }

  const dbClient = await pool.connect();

  try {
    // 1. Fetch current order
    // Use FOR UPDATE to lock the row and prevent race conditions
    await dbClient.query('BEGIN');
    const orderRes = await dbClient.query(
      'SELECT * FROM ordenes_compra WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (orderRes.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return res.status(404).json({ mensaje: 'Orden de compra no encontrada.' });
    }

    const originalOrderObj = orderRes.rows[0];
    const oldEstado = originalOrderObj.estado;

    // 2. Validate transition
    let isValidTransition = false;
    if (oldEstado === 'pendiente' && (estado === 'aprobado' || estado === 'cancelado')) {
      isValidTransition = true;
    } else if (oldEstado === 'aprobado' && (estado === 'recibido' || estado === 'cancelado')) {
      isValidTransition = true;
    }

    if (!isValidTransition) {
      await dbClient.query('ROLLBACK');
      return res.status(409).json({
        mensaje: `Transición de estado no permitida de "${oldEstado}" a "${estado}".`
      });
    }

    const adminId = req.usuario?.id;

    // 3. Perform transition update
    let updateQuery = '';
    let updateParams: any[] = [];

    if (estado === 'aprobado' || estado === 'recibido') {
      updateQuery = `
        UPDATE ordenes_compra
        SET estado = $1, aprobado_por = $2, actualizado_en = NOW()
        WHERE id = $3
        RETURNING *
      `;
      updateParams = [estado, adminId, id];
    } else {
      // cancelado
      updateQuery = `
        UPDATE ordenes_compra
        SET estado = $1, aprobado_por = $2, actualizado_en = NOW()
        WHERE id = $3
        RETURNING *
      `;
      updateParams = [estado, adminId, id];
    }

    const updateRes = await dbClient.query(updateQuery, updateParams);
    const updatedOrderObj = updateRes.rows[0];

    await dbClient.query('COMMIT');

    // Audit log
    await registrarAuditoria(
      'ordenes_compra',
      'UPDATE',
      updatedOrderObj.numero_orden,
      originalOrderObj,
      updatedOrderObj,
      adminId || null,
      req.ip || null
    );

    return res.status(200).json(updatedOrderObj);
  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error('[Ordenes Estado Put] Rollback triggered:', error);
    return res.status(500).json({ mensaje: 'Error al cambiar estado de la orden de compra.' });
  } finally {
    dbClient.release();
  }
});

export default router;
