import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '55432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'northwind',
});

// A quick check function to test database connectivity at startup
export const testDbConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    console.log(`[Database] Connected successfully to Northwind. Server time: ${res.rows[0].now}`);
    return true;
  } catch (error) {
    console.error('[Database] Connection failed:', error.message);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
};

export const query = (text, params) => pool.query(text, params);

export default pool;
