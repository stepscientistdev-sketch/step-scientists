const { database } = require('./dist/config/database');

const MOBILE_PLAYER_ID = '021cb11f-482a-44d2-b289-110400f23562';

async function debugSteplingsQuery() {
  try {
    console.log('🔍 Testing steplings query directly...');
    
    // Test the exact query from the service
    const steplings = await database('steplings')
      .leftJoin('species', 'steplings.species_id', 'species.id')
      .where('steplings.player_id', MOBILE_PLAYER_ID)
      .select(
        'steplings.*',
        'species.name as species_name',
        'species.rarity_tier as species_rarity'
      )
      .limit(3);
    
    console.log(`📊 Query returned ${steplings.length} steplings`);
    
    if (steplings.length > 0) {
      console.log('📋 Raw query results:');
      steplings.forEach((s, i) => {
        console.log(`  ${i+1}. Raw stepling data:`);
        console.log(`     ID: ${s.id}`);
        console.log(`     Species ID: ${s.species_id}`);
        console.log(`     Species Name: ${s.species_name}`);
        console.log(`     Species Rarity: ${s.species_rarity}`);
        console.log(`     Level: ${s.level}`);
        console.log(`     Fusion Level: ${s.fusion_level}`);
        console.log('     ---');
      });
    }
    
    // Also check if species exist
    console.log('🐾 Checking species table...');
    const allSpecies = await database('species').select('*').limit(5);
    console.log(`📊 Species table has ${allSpecies.length} entries`);
    allSpecies.forEach(s => {
      console.log(`  - ${s.name} (${s.id}) - ${s.rarity_tier}`);
    });
    
    // Check if there are steplings with invalid species_id
    console.log('🔍 Checking for orphaned steplings...');
    const orphanedSteplings = await database('steplings')
      .leftJoin('species', 'steplings.species_id', 'species.id')
      .where('steplings.player_id', MOBILE_PLAYER_ID)
      .whereNull('species.id')
      .select('steplings.id', 'steplings.species_id')
      .limit(5);
    
    if (orphanedSteplings.length > 0) {
      console.log(`❌ Found ${orphanedSteplings.length} orphaned steplings (invalid species_id):`);
      orphanedSteplings.forEach(s => {
        console.log(`  - Stepling ${s.id} references non-existent species ${s.species_id}`);
      });
    } else {
      console.log('✅ No orphaned steplings found');
    }
    
  } catch (error) {
    console.error('💥 Query error:', error);
  } finally {
    await database.destroy();
  }
}

debugSteplingsQuery();