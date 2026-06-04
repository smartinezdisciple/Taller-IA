import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { pool } from './config/db.js';
import authRouter from './routes/auth.js';
import reportesRouter from './routes/reportes.js';
import { sembrarUsuarios } from './config/seed.js';

import repuestosRouter from './routes/repuestos.js';
import ventasRouter from './routes/ventas.js';
import comprasRouter from './routes/compras.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/reportes', reportesRouter);
app.use('/api/repuestos', repuestosRouter);
app.use('/api', ventasRouter);
app.use('/api', comprasRouter);

// Alias /api/marcas to the brands endpoint in repuestosRouter
app.get('/api/marcas', (req, res, next) => {
  req.url = '/marcas';
  repuestosRouter(req, res, next);
});


// Health Check Endpoint
app.get('/health', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        bd: 'OK',
        version: '2.0.0-PRO'
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(503).json({
      status: 'ERROR',
      bd: 'ERROR',
      error: error.message || error,
      timestamp: new Date().toISOString()
    });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`[Servidor] Escuchando en http://localhost:${PORT}`);
    // Seed the seed users
    await sembrarUsuarios();
  });
}

export default app;
