import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { pool } from '../config/db.js';

describe('Compras and Reportes Endpoints Integration Tests', () => {
  let adminToken = '';
  let compradorToken = '';

  let supplierId = 0;
  let repuestoId = 0;
  let orderId = 0;

  beforeAll(async () => {
    // 1. Authenticate users
    const adminLogin = await request(app).post('/api/auth/login').send({
      nombre_usuario: 'admin',
      contrasena: 'Taller123!_Pro'
    });
    adminToken = adminLogin.body.accessToken;

    const compradorLogin = await request(app).post('/api/auth/login').send({
      nombre_usuario: 'comprador',
      contrasena: 'Taller123!_Pro'
    });
    compradorToken = compradorLogin.body.accessToken;

    // 2. Insert test supplier
    const supplierRes = await pool.query(
      `INSERT INTO proveedores (nombre_empresa, ruc, email, telefono)
       VALUES ('Proveedor Test S.A.', '1799999999001', 'test@supplier.com', '0999999999')
       RETURNING id`
    );
    supplierId = supplierRes.rows[0].id;

    // 3. Insert test part with 5 stock units
    const partRes = await pool.query(
      `INSERT INTO repuestos (sku, nombre_repuesto, id_marca_vehiculo, cantidad_stock, stock_minimo, precio_venta, precio_costo) 
       VALUES ('COMPRAS-SKU-TEST', 'Repuesto Test Compras', 1, 10, 5, 20.00, 10.00) 
       RETURNING id`
    );
    repuestoId = partRes.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    if (orderId) {
      await pool.query('DELETE FROM detalle_ordenes_compra WHERE id_orden = $1', [orderId]);
      await pool.query('DELETE FROM historial_precios_costo WHERE id_orden = $1', [orderId]);
      await pool.query('DELETE FROM ordenes_compra WHERE id = $1', [orderId]);
    }
    await pool.query('DELETE FROM repuestos WHERE id = $1', [repuestoId]);
    await pool.query('DELETE FROM proveedores WHERE id = $1', [supplierId]);
  });

  describe('Proveedores CRUD', () => {
    it('GET /api/proveedores retorna 200 para comprador y admin', async () => {
      const res = await request(app)
        .get('/api/proveedores')
        .set('Authorization', `Bearer ${compradorToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((p: any) => p.id === supplierId)).toBe(true);
    });

    it('POST /api/proveedores retorna 403 para comprador', async () => {
      const res = await request(app)
        .post('/api/proveedores')
        .set('Authorization', `Bearer ${compradorToken}`)
        .send({ nombre_empresa: 'Intento Fallido', ruc: '1234567890001' });

      expect(res.status).toBe(403);
    });

    it('POST y PUT /api/proveedores exitosos para administrador', async () => {
      const postRes = await request(app)
        .post('/api/proveedores')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre_empresa: 'Proveedor Admin POST',
          ruc: '1788888888001',
          email: 'adminpost@test.com'
        });

      expect(postRes.status).toBe(201);
      const createdId = postRes.body.id;

      const putRes = await request(app)
        .put(`/api/proveedores/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre_empresa: 'Proveedor Admin PUT Modificado',
          ruc: '1788888888001',
          email: 'adminput@test.com'
        });

      expect(putRes.status).toBe(200);
      expect(putRes.body.nombre_empresa).toBe('Proveedor Admin PUT Modificado');

      // Clean up the created provider
      await pool.query('DELETE FROM proveedores WHERE id = $1', [createdId]);
    });
  });

  describe('Ordenes de Compra & State Machine', () => {
    // IT-013
    it('IT-013: POST /api/ordenes crea una orden en estado pendiente', async () => {
      const res = await request(app)
        .post('/api/ordenes')
        .set('Authorization', `Bearer ${compradorToken}`)
        .send({
          id_proveedor: supplierId,
          items: [
            { id_repuesto: repuestoId, cantidad: 5, precio_costo: 8.50 }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.estado).toBe('pendiente');
      expect(res.body).toHaveProperty('numero_orden');
      orderId = res.body.id;
    });

    // IT-014
    it('IT-014: PUT /api/ordenes/:id/estado retorna 403 si un operario no admin intenta cambiar el estado', async () => {
      const res = await request(app)
        .put(`/api/ordenes/${orderId}/estado`)
        .set('Authorization', `Bearer ${compradorToken}`)
        .send({ estado: 'aprobado' });

      expect(res.status).toBe(403);
    });

    // IT-015
    it('IT-015: PUT /api/ordenes/:id/estado retorna 409 ante una transición inválida (ej. pendiente -> recibido)', async () => {
      const res = await request(app)
        .put(`/api/ordenes/${orderId}/estado`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'recibido' }); // Violates state machine: pendiente -> aprobado -> recibido

      expect(res.status).toBe(409);
      expect(res.body.mensaje).toContain('Transición de estado no permitida');
    });

    // IT-016
    it('IT-016: PUT /api/ordenes/:id/estado transiciona de pendiente a aprobado para admin', async () => {
      const res = await request(app)
        .put(`/api/ordenes/${orderId}/estado`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'aprobado' });

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('aprobado');
    });

    // IT-021
    it('IT-021: PUT /api/ordenes/:id/estado transiciona de aprobado a recibido, incrementando stock y costo', async () => {
      // Current stock is 10, cost is 10.00. Order has quantity 5 at cost 8.50.
      const res = await request(app)
        .put(`/api/ordenes/${orderId}/estado`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'recibido' });

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('recibido');

      // Check that DB triggers incremented quantity to 15, and cost updated to 8.50
      const partRes = await pool.query('SELECT cantidad_stock, precio_costo FROM repuestos WHERE id = $1', [repuestoId]);
      expect(partRes.rows[0].cantidad_stock).toBe(15);
      expect(parseFloat(partRes.rows[0].precio_costo)).toBe(8.50);

      // Check that a record was inserted in the cost price history
      const historyRes = await pool.query('SELECT * FROM historial_precios_costo WHERE id_orden = $1', [orderId]);
      expect(historyRes.rows.length).toBe(1);
      expect(historyRes.rows[0].id_repuesto).toBe(repuestoId);
      expect(parseFloat(historyRes.rows[0].precio_costo)).toBe(8.50);
      expect(historyRes.rows[0].cantidad).toBe(5);
    });
  });

  describe('Reportes Avanzados', () => {
    it('GET /api/reportes/* retorna 403 para comprador/vendedor y 200 para administrador', async () => {
      const resTopComp = await request(app)
        .get('/api/reportes/top-repuestos')
        .set('Authorization', `Bearer ${compradorToken}`);
      expect(resTopComp.status).toBe(403);

      const resTopAdmin = await request(app)
        .get('/api/reportes/top-repuestos')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resTopAdmin.status).toBe(200);
      expect(Array.isArray(resTopAdmin.body)).toBe(true);

      const resBestAdmin = await request(app)
        .get('/api/reportes/mejores-clientes')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resBestAdmin.status).toBe(200);
      expect(Array.isArray(resBestAdmin.body)).toBe(true);

      const resLowStockAdmin = await request(app)
        .get('/api/reportes/stock-bajo')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resLowStockAdmin.status).toBe(200);
      expect(Array.isArray(resLowStockAdmin.body)).toBe(true);
    });
  });
});
