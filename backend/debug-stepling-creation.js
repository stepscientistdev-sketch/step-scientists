const { database } = require('./dist/config/database');
const { steplingService } = require('./dist/services/steplingService');

const MOBILE_PLAYER_ID = '021cb11f-482a-44d2-b289-110400f23562';

async function debugSteplingCreation() {
  try {
    console.log('🔍 Starting stepling creation debug...');
    
    // Check if player exists
    const player = await database('players').where('id', MOBILE_PLAYER_ID).first();
    console.log('👤 Player exists:', player ? `${player.username} (${player.id})` : 'NO');
    
    // Check available species
    const species = await database('species').select('*').limit(3);
    console.log('🐾 Available species:', species.length);
    species.forEach(s => {
      console.log(`  - ${s.name} (${s.id}) - ${s.rarity_tier}`);
      console.log(`    Base stats:`, s.base_stats);
    });
    
    if (species.length === 0) {
      console.log('❌ No species found in database!');
      return;
    }
    
    // Try to create a stepling with the first species
    const testSpecies = species[0];
    console.log(`🔨 Attempting to create stepling with species: ${testSpecies.name} (${testSpecies.id})`);
    
    try {
      const newStepling = await steplingService.createStepling(MOBILE_PLAYER_ID, testSpecies.id);
      console.log('✅ Stepling created successfully!');
      console.log('📋 Stepling details:', {
        id: newStepling.id,
        species_id: newStepling.species_id,
        level: newStepling.level,
        fusion_level: newStepling.fusion_level,
        current_stats: newStepling.current_stats
      });
      
      // Verify it was saved to database
      const savedStepling = await database('steplings').where('id', newStepling.id).first();
      console.log('💾 Saved to database:', savedStepling ? 'YES' : 'NO');
      
    } catch (createError) {
      console.error('❌ Stepling creation failed:', createError.message);
      console.error('📋 Full error:', createError);
    }
    
    // Check current steplings count
    const steplingsCount = await database('steplings').where('player_id', MOBILE_PLAYER_ID).count('* as count').first();
    console.log('📊 Total steplings for player:', steplingsCount.count);
    
    // Show existing steplings
    const existingSteplings = await database('steplings')
      .leftJoin('species', 'steplings.species_id', 'species.id')
      .where('steplings.player_id', MOBILE_PLAYER_ID)
      .select('steplings.*', 'species.name as species_name')
      .limit(5);
    
    console.log('📋 Existing steplings:');
    existingSteplings.forEach((s, i) => {
      console.log(`  ${i+1}. ${s.species_name} Lv.${s.level} F.${s.fusion_level}`);
    });
    
  } catch (error) {
    console.error('💥 Debug script error:', error);
  } finally {
    await database.destroy();
  }
}

debugSteplingCreation();