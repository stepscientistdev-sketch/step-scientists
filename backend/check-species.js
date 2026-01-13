const knex = require('knex');
const config = require('./knexfile');

const db = knex(config.development);

async function checkSpecies() {
  try {
    const species = await db('species')
      .select('id', 'name')
      .where('id', 'd4a09c90-17ea-4778-85db-3b83c54654ef')
      .first();
    
    console.log('Species:', species);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

checkSpecies();