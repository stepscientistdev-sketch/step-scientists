const knex = require('knex');
const config = require('./knexfile');

const db = knex(config.development);

async function updateTurtleFlag() {
  try {
    console.log('🔍 Looking for fusion level 2 steplings...');
    
    // First, let's see what steplings we have
    const steplings = await db('steplings')
      .select('id', 'species_id', 'level', 'fusion_level', 'has_suboptimal_fusion')
      .where('fusion_level', 2);
    
    console.log('Found steplings:', steplings);
    
    if (steplings.length === 0) {
      console.log('❌ No fusion level 2 steplings found');
      return;
    }
    
    // Update the first fusion level 2 stepling to be imperfect
    const targetStepling = steplings[0];
    console.log(`🎯 Updating stepling ${targetStepling.id} (${targetStepling.species_id}) to be imperfect...`);
    
    const result = await db('steplings')
      .where('id', targetStepling.id)
      .update({ has_suboptimal_fusion: true });
    
    console.log(`✅ Updated ${result} stepling(s)`);
    
    // Verify the update
    const updated = await db('steplings')
      .select('id', 'species_id', 'level', 'fusion_level', 'has_suboptimal_fusion')
      .where('id', targetStepling.id)
      .first();
    
    console.log('Updated stepling:', updated);
    
  } catch (error) {
    console.error('❌ Error updating stepling:', error);
  } finally {
    await db.destroy();
  }
}

updateTurtleFlag();