import knex from 'knex';
import path from 'path';

const config = {
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, '../../dev.sqlite3')
  },
  useNullAsDefault: true,
  migrations: {
    tableName: 'knex_migrations',
    directory: path.join(__dirname, '../migrations'),
  },
  seeds: {
    directory: path.join(__dirname, '../seeds'),
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