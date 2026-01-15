/**
 * Script to run migrations on production database
 * Usage: node run-production-migration.js
 */

const knex = require('knex');
const knexConfig = require('./knexfile');

async function runMigration() {
  console.log('Connecting to production database...');
  
  const db = knex(knexConfig.production);
  
  try {
    console.log('Running migrations...');
    const [batch, migrations] = await db.migrate.latest();
    
    if (migrations.length === 0) {
      console.log('✓ Already up to date');
    } else {
      console.log(`✓ Batch ${batch} run: ${migrations.length} migrations`);
      migrations.forEach(migration => {
        console.log(`  - ${migration}`);
      });
    }
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runMigration();
