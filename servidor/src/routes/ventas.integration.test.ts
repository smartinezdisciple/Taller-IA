import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { pool } from '../config/db.js';

describe('Ventas Endpoints Integration Tests (ACID)', () => {
  let token = '';
  let clienteId = 0;
  let repuestoId = 0;

  beforeAll(async () => {
    // 1. Get auth token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        nombre_usuario: 'admin',
        contrasena: 'Taller123!_Pro'
      });
    token = loginRes.body.accessToken;

    // 2. Insert test client
    const clientRes = await pool.query(
      `INSERT INTO clientes (nombres, apellidos, cedula) 
       VALUES ('Carlos', 'Pruebas', '999-TEST-999') 
       RETURNING id`
    );
    clienteId = clientRes.rows[0].id;

    // 3. Insert test part with 5 stock units
    const partRes = await pool.query(
      `INSERT INTO repuestos (sku, nombre_repuesto, id_marca_vehiculo, cantidad_stock, stock_minimo, precio_venta, precio_costo) 
       VALUES ('TEST-SKU-ACID', 'Filtro Test ACID', 1, 5, 2, 100.00, 50.00) 
       RETURNING id`
    );
    repuestoId = partRes.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM detalle_ventas WHERE id_repuesto = $1', [repuestoId]);
    await pool.query('DELETE FROM ventas WHERE id_cliente = $1', [clienteId]);
    await pool.query('DELETE FROM repuestos WHERE id = $1', [repuestoId]);
    await pool.query('DELETE FROM clientes WHERE id = $1', [clienteId]);
  });

  // IT-010
  it('IT-010: POST /api/ventas retorna 404 si el cliente no existe', async () => {
    const res = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id_cliente: 999999, // Non-existent client ID
        items: [{ id_repuesto: repuestoId, cantidad: 2 }]
      });

    expect(res.status).toBe(404);
    expect(res.body.mensaje).toBe('Cliente no existe o está inactivo.');
  });

  // IT-009
  it('IT-009: POST /api/ventas retorna 409 si el stock es insuficiente', async () => {
    const res = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id_cliente: clienteId,
        items: [{ id_repuesto: repuestoId, cantidad: 10 }] // Requesting 10, but stock is 5
      });

    expect(res.status).toBe(409);
    expect(res.body.mensaje).toContain('Stock insuficiente');
  });

  // IT-011 / IT-008
  it('IT-008 & IT-011: POST /api/ventas registra la venta con stock suficiente e IVA al 15%', async () => {
    // Requesting 2 units (original stock is 5)
    const res = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id_cliente: clienteId,
        items: [{ id_repuesto: repuestoId, cantidad: 2 }]
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('numero_venta');
    expect(parseFloat(res.body.subtotal)).toBe(200.00); // 2 * 100.00
    expect(parseFloat(res.body.monto_iva)).toBe(30.00); // 200 * 15%
    expect(parseFloat(res.body.total)).toBe(230.00); // 200 + 30

    // Check stock decremented to 3
    const stockRes = await pool.query('SELECT cantidad_stock FROM repuestos WHERE id = $1', [repuestoId]);
    expect(stockRes.rows[0].cantidad_stock).toBe(3);
  });

  // IT-012 (Rollback verify)
  it('IT-012: POST /api/ventas realiza ROLLBACK total si la transacción falla a la mitad', async () => {
    // Current stock is 3
    // We send two items: first one is valid (quantity 1), second one is invalid (quantity 10 - exceeds stock)
    const res = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id_cliente: clienteId,
        items: [
          { id_repuesto: repuestoId, cantidad: 1 }, // Valid (1 < 3)
          { id_repuesto: repuestoId, cantidad: 10 } // Insufficient (10 > 3)
        ]
      });

    expect(res.status).toBe(409);

    // Verify stock is still 3 (the first item wasn't decremented due to rollback!)
    const stockRes = await pool.query('SELECT cantidad_stock FROM repuestos WHERE id = $1', [repuestoId]);
    expect(stockRes.rows[0].cantidad_stock).toBe(3);
  });
});
