const knex = require('knex');
const config = require('./knexfile');

const db = knex(config.development);

async function checkPlayerData() {
  try {
    const player = await db('players').first();
    console.log('Player data:');
    console.log('ID:', player.id);
    console.log('Username:', player.username);
    console.log('Raw step_data:', player.step_data);
    
    // Try to parse it
    try {
      const parsed = JSON.parse(player.step_data || '{}');
      console.log('Parsed step_data:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('JSON parse error:', e.message);
      console.log('First 200 chars of step_data:', player.step_data?.substring(0, 200));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

checkPlayerData();