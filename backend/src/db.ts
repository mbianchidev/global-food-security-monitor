import mysql from 'mysql2/promise';
import { config } from './config.js';

export const pool = mysql.createPool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASS,
  database: config.DB_NAME,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: false,
  dateStrings: true,
});

export type Row = mysql.RowDataPacket;

export async function query<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

export async function queryOne<T = Row>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
