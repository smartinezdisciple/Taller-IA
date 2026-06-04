import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { pool } from '../config/db.js';

describe('Auth Endpoints Integration Tests', () => {

  // Make sure admin user is unlocked before running tests
  beforeAll(async () => {
    await pool.query(
      "UPDATE usuarios SET intentos_fallidos = 0, bloqueado_en = NULL, activo = TRUE WHERE nombre_usuario = 'admin'"
    );
  });

  // Unlock admin user again after test runs
  afterAll(async () => {
    await pool.query(
      "UPDATE usuarios SET intentos_fallidos = 0, bloqueado_en = NULL WHERE nombre_usuario = 'admin'"
    );
  });

  // IT-001
  it('IT-001: POST /api/auth/login con credenciales válidas retorna 200 y accessToken', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        nombre_usuario: 'admin',
        contrasena: 'Taller123!_Pro'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.usuario.nombre_completo).toBe('Carlos Méndez');
    expect(res.body.usuario.rol).toBe('administrador');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  // IT-002
  it('IT-002: POST /api/auth/login con contraseña incorrecta retorna 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        nombre_usuario: 'admin',
        contrasena: 'ClaveIncorrecta123!'
      });

    expect(res.status).toBe(401);
    expect(res.body.mensaje).toBe('Credenciales inválidas.');
  });

  // IT-003
  it('IT-003: 3er intento fallido consecutivo bloquea la cuenta y retorna 423', async () => {
    // We already have 1 failed attempt from the previous test (intentos_fallidos = 1)
    // Run 2nd failed attempt
    const res2 = await request(app)
      .post('/api/auth/login')
      .send({
        nombre_usuario: 'admin',
        contrasena: 'ClaveIncorrecta123!'
      });
    expect(res2.status).toBe(401);

    // Run 3rd failed attempt (this locks the account)
    const res3 = await request(app)
      .post('/api/auth/login')
      .send({
        nombre_usuario: 'admin',
        contrasena: 'ClaveIncorrecta123!'
      });
    expect(res3.status).toBe(423);
    expect(res3.body.mensaje).toBe('Cuenta bloqueada. Contacte al administrador.');

    // Verifying it remains blocked even with correct password now
    const res4 = await request(app)
      .post('/api/auth/login')
      .send({
        nombre_usuario: 'admin',
        contrasena: 'Taller123!_Pro'
      });
    expect(res4.status).toBe(423);
    expect(res4.body.mensaje).toBe('Cuenta bloqueada. Contacte al administrador.');
  });
});
