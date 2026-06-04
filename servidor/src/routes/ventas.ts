import { Router } from 'express';
import { pool } from '../config/db.js';
import { autenticar, RequestAutenticado } from '../middleware/autenticar.js';
import { autorizar } from '../middleware/autorizar.js';
import { registrarAuditoria } from '../config/auditoria.js';

const router = Router();

// GET /api/clientes
// Accessible by admin, vendedor
router.get('/clientes', autenticar, autorizar(['administrador', 'vendedor']), async (req, res) => {
  try {
    const clientsRes = await pool.query('SELECT * FROM clientes ORDER BY nombres ASC, apellidos ASC');
    return res.status(200).json(clientsRes.rows);
  } catch (error: any) {
    console.error('[Clientes List] Error:', error);
    return res.status(500).json({ mensaje: 'Error al obtener clientes.' });
  }
});

// POST /api/clientes
// Accessible by admin, vendedor
router.post('/clientes', autenticar, autorizar(['administrador', 'vendedor']), async (req, res) => {
  const { nombres, apellidos, cedula, email, telefono } = req.body;

  if (!nombres || !apellidos) {
    return res.status(400).json({ mensaje: 'Nombres y apellidos son requeridos.' });
  }

  try {
    if (cedula) {
      const cedulaCheck = await pool.query('SELECT id FROM clientes WHERE cedula = $1', [cedula]);
      if (cedulaCheck.rows.length > 0) {
        return res.status(409).json({ mensaje: 'Un cliente con esta cédula ya existe.' });
      }
    }

    const insertRes = await pool.query(
      `INSERT INTO clientes (nombres, apellidos, cedula, email, telefono)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nombres, apellidos, cedula || null, email || null, telefono || null]
    );

    return res.status(201).json(insertRes.rows[0]);
  } catch (error: any) {
    console.error('[Clientes Post] Error:', error);
    return res.status(500).json({ mensaje: 'Error al registrar cliente.' });
  }
});

// PUT /api/clientes/:id
// Accessible by admin, vendedor
router.put('/clientes/:id', autenticar, autorizar(['administrador', 'vendedor']), async (req, res) => {
  const { id } = req.params;
  const { nombres, apellidos, cedula, email, telefono } = req.body;

  if (!nombres || !apellidos) {
    return res.status(400).json({ mensaje: 'Nombres y apellidos son requeridos.' });
  }

  try {
    const clientCheck = await pool.query('SELECT * FROM clientes WHERE id = $1', [id]);
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Cliente no encontrado.' });
    }

    if (cedula) {
      const cedulaCheck = await pool.query('SELECT id FROM clientes WHERE cedula = $1 AND id <> $2', [cedula, id]);
      if (cedulaCheck.rows.length > 0) {
        return res.status(409).json({ mensaje: 'Un cliente con esta cédula ya existe.' });
      }
    }

    const updateRes = await pool.query(
      `UPDATE clientes
       SET nombres = $1, apellidos = $2, cedula = $3, email = $4, telefono = $5, actualizado_en = NOW()
       WHERE id = $6
       RETURNING *`,
      [nombres, apellidos, cedula || null, email || null, telefono || null, id]
    );

    return res.status(200).json(updateRes.rows[0]);
  } catch (error: any) {
    console.error('[Clientes Put] Error:', error);
    return res.status(500).json({ mensaje: 'Error al actualizar cliente.' });
  }
});

// POST /api/ventas
// Registra una venta en una transacción ACID (Admin, Vendedor)
router.post('/ventas', autenticar, autorizar(['administrador', 'vendedor']), async (req: RequestAutenticado, res) => {
  const { id_cliente, items } = req.body;

  if (!id_cliente || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ mensaje: 'ID de cliente e items de compra son requeridos.' });
  }

  const dbClient = await pool.connect();

  try {
    // 1. Verificar si cliente existe
    const clientRes = await dbClient.query('SELECT * FROM clientes WHERE id = $1', [id_cliente]);
    if (clientRes.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Cliente no existe o está inactivo.' });
    }

    await dbClient.query('BEGIN');

    let subtotal = 0;
    const validatedItems: any[] = [];

    // 2. Validar cada item
    for (const item of items) {
      const { id_repuesto, cantidad } = item;
      const parsedCantidad = parseInt(cantidad);

      if (!id_repuesto || isNaN(parsedCantidad) || parsedCantidad <= 0) {
        throw { status: 400, mensaje: 'Cada ítem debe tener un id_repuesto y una cantidad mayor a 0.' };
      }

      // SELECT FOR UPDATE locks the rows to prevent race conditions during transaction
      const partRes = await dbClient.query(
        'SELECT * FROM repuestos WHERE id = $1 FOR UPDATE',
        [id_repuesto]
      );

      if (partRes.rows.length === 0 || partRes.rows[0].eliminado_en !== null) {
        throw { status: 422, mensaje: `El repuesto con ID ${id_repuesto} no existe o fue eliminado.` };
      }

      const repuesto = partRes.rows[0];

      if (repuesto.cantidad_stock < parsedCantidad) {
        throw {
          status: 409,
          mensaje: `Stock insuficiente para repuesto "${repuesto.nombre_repuesto}". Disponible: ${repuesto.cantidad_stock}, solicitado: ${parsedCantidad}.`
        };
      }

      const precioUnitario = parseFloat(repuesto.precio_venta);
      const subtotalLinea = precioUnitario * parsedCantidad;
      subtotal += subtotalLinea;

      validatedItems.push({
        repuesto,
        cantidad: parsedCantidad,
        precioUnitario
      });
    }

    // Calculate taxes (15% Nicaraguan VAT default, configurable via process.env.PORCENTAJE_IVA)
    const porcentajeIva = parseFloat(process.env.PORCENTAJE_IVA || '15.00');
    const montoIva = subtotal * (porcentajeIva / 100);
    const total = subtotal + montoIva;
    const creadoPor = req.usuario?.id;

    // 3. Crear cabecera de la venta (Trigger trg_numero_venta autogenera numero_venta)
    const saleInsertRes = await dbClient.query(
      `INSERT INTO ventas (id_cliente, subtotal, porcentaje_iva, monto_iva, total, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id_cliente, subtotal, porcentajeIva, montoIva, total, creadoPor]
    );

    const ventaObj = saleInsertRes.rows[0];

    // 4. Insertar detalles y restar stock
    for (const item of validatedItems) {
      // Registrar detalle
      await dbClient.query(
        `INSERT INTO detalle_ventas (id_venta, id_repuesto, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4)`,
        [ventaObj.id, item.repuesto.id, item.cantidad, item.precioUnitario]
      );

      // Descontar stock
      const stockUpdateRes = await dbClient.query(
        `UPDATE repuestos 
         SET cantidad_stock = cantidad_stock - $1 
         WHERE id = $2 AND cantidad_stock >= $1`,
        [item.cantidad, item.repuesto.id]
      );

      if (stockUpdateRes.rowCount === 0) {
        // Concurrency guard failed (should be extremely rare due to SELECT FOR UPDATE)
        throw { status: 409, mensaje: `Error de concurrencia al actualizar stock para "${item.repuesto.nombre_repuesto}".` };
      }
    }

    await dbClient.query('COMMIT');

    // Audit log (done asynchronously/outside transaction for efficiency but logged immediately)
    await registrarAuditoria(
      'ventas',
      'INSERT',
      ventaObj.numero_venta,
      null,
      ventaObj,
      creadoPor || null,
      req.ip || null
    );

    return res.status(201).json(ventaObj);
  } catch (error: any) {
    await dbClient.query('ROLLBACK');
    console.error('[Ventas Register] Rollback triggered:', error);

    const errStatus = error.status || 500;
    const errMessage = error.mensaje || 'Error al procesar la venta en el servidor.';
    return res.status(errStatus).json({ mensaje: errMessage });
  } finally {
    dbClient.release();
  }
});

// GET /api/ventas
// List sales with pagination and optional date filters
router.get('/ventas', autenticar, autorizar(['administrador', 'vendedor']), async (req, res) => {
  const { pagina = '1', limite = '20', desde, hasta } = req.query;
  const pageNum = parseInt(pagina as string) || 1;
  const limitNum = Math.min(parseInt(limite as string) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  try {
    let whereClauses: string[] = [];
    const params: any[] = [];

    if (desde) {
      params.push(desde);
      whereClauses.push(`v.creado_en >= $${params.length}`);
    }
    if (hasta) {
      params.push(hasta);
      whereClauses.push(`v.creado_en <= $${params.length}`);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await pool.query(
      `SELECT COUNT(*) AS total FROM ventas v ${whereStr}`,
      params
    );
    const total = parseInt(countRes.rows[0].total);

    const dataParams = [...params];
    dataParams.push(limitNum, offset);
    const dataQuery = `
      SELECT v.*, c.nombres, c.apellidos, u.nombre_completo AS vendedor_nombre
      FROM ventas v
      JOIN clientes c ON v.id_cliente = c.id
      JOIN usuarios u ON v.creado_por = u.id
      ${whereStr}
      ORDER BY v.creado_en DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;
    const dataRes = await pool.query(dataQuery, dataParams);

    return res.status(200).json({
      ventas: dataRes.rows,
      total,
      pagina: pageNum,
      limite: limitNum
    });
  } catch (error: any) {
    console.error('[Ventas List] Error:', error);
    return res.status(500).json({ mensaje: 'Error al obtener listado de ventas.' });
  }
});

// GET /api/ventas/:id
// Get detailed sale information with lines
router.get('/ventas/:id', autenticar, autorizar(['administrador', 'vendedor']), async (req, res) => {
  const { id } = req.params;

  try {
    const saleRes = await pool.query(
      `SELECT v.*, c.nombres, c.apellidos, c.cedula, c.email, c.telefono, u.nombre_completo AS vendedor_nombre
       FROM ventas v
       JOIN clientes c ON v.id_cliente = c.id
       JOIN usuarios u ON v.creado_por = u.id
       WHERE v.id = $1`,
      [id]
    );

    if (saleRes.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Venta no encontrada.' });
    }

    const detailsRes = await pool.query(
      `SELECT dv.*, r.nombre_repuesto, r.sku
       FROM detalle_ventas dv
       JOIN repuestos r ON dv.id_repuesto = r.id
       WHERE dv.id_venta = $1`,
      [id]
    );

    const venta = saleRes.rows[0];
    venta.items = detailsRes.rows;

    return res.status(200).json(venta);
  } catch (error: any) {
    console.error('[Ventas Get ID] Error:', error);
    return res.status(500).json({ mensaje: 'Error al obtener detalle de venta.' });
  }
});

export default router;
