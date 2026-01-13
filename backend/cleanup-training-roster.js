const knex = require('knex');
const config = require('./knexfile');

const db = knex(config.development);

async function cleanupTrainingRoster() {
  try {
    console.log('🔍 Checking training roster for orphaned stepling references...');
    
    // Get all players
    const players = await db('players').select('id', 'username');
    console.log(`Found ${players.length} players`);
    
    for (const player of players) {
      console.log(`\n👤 Checking player: ${player.username} (${player.id})`);
      
      // Get player's current steplings
      const currentSteplings = await db('steplings')
        .where('player_id', player.id)
        .select('id');
      
      const currentSteplingIds = currentSteplings.map(s => s.id);
      console.log(`  Current steplings: ${currentSteplingIds.length}`);
      
      // Get player data to check training roster
      const playerData = await db('players')
        .where('id', player.id)
        .first();
      
      if (!playerData) continue;
      
      // Parse step_data to get training roster
      let stepData;
      if (typeof playerData.step_data === 'string') {
        try {
          stepData = JSON.parse(playerData.step_data);
        } catch (e) {
          console.log(`  ⚠️ Invalid step_data JSON for ${player.username}`);
          continue;
        }
      } else {
        // step_data is already an object
        stepData = playerData.step_data || {};
      }
      
      const trainingRoster = stepData.trainingRoster || [];
      console.log(`  Training roster before cleanup: ${trainingRoster.length} steplings`);
      console.log(`  Roster IDs: ${trainingRoster.join(', ')}`);
      
      // Find orphaned IDs (in roster but not in current steplings)
      const orphanedIds = trainingRoster.filter(id => !currentSteplingIds.includes(id));
      
      if (orphanedIds.length > 0) {
        console.log(`  🗑️ Found ${orphanedIds.length} orphaned stepling IDs: ${orphanedIds.join(', ')}`);
        
        // Remove orphaned IDs from training roster
        const cleanedRoster = trainingRoster.filter(id => currentSteplingIds.includes(id));
        
        // Update step_data
        stepData.trainingRoster = cleanedRoster;
        
        await db('players')
          .where('id', player.id)
          .update({
            step_data: stepData
          });
        
        console.log(`  ✅ Cleaned roster: ${cleanedRoster.length} steplings remaining`);
        console.log(`  New roster IDs: ${cleanedRoster.join(', ')}`);
      } else {
        console.log(`  ✅ No orphaned IDs found - roster is clean`);
      }
    }
    
    console.log('\n🎉 Training roster cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error cleaning up training roster:', error);
  } finally {
    await db.destroy();
  }
}

cleanupTrainingRoster();