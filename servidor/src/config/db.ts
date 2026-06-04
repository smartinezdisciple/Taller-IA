import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'taller_user',
  password: process.env.DB_PASSWORD || 'taller_pass',
  database: process.env.DB_DATABASE || 'taller_repuestos',
});
