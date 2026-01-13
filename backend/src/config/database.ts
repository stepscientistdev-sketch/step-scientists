import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'step_monsters',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: '../migrations',
  },
  seeds: {
    directory: '../seeds',
  },
};

export const database = knex(config);

// Test connection function
export async function testConnection(): Promise<boolean> {
  try {
    await database.raw('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}