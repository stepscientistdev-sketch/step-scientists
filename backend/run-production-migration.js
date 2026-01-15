// Run migrations on production database
const knex = require('knex');
const knexConfig = require('./knexfile');

async function runMigration() {
  console.log('🔄 Running production migration...');
  
  const db = knex(knexConfig.production);
  
  try {
    await db.migrate.latest();
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await db.destroy();
  }
}

runMigration();
