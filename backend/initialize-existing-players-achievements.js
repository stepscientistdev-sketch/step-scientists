// Script to initialize lifetime achievements for existing players
// Run with: node backend/initialize-existing-players-achievements.js

const { database } = require('./dist/config/database');

async function initializeExistingPlayers() {
  try {
    console.log('🔄 Initializing lifetime achievements for existing players...\n');

    // Get all players
    const players = await database('players').select('id', 'step_data');
    console.log(`Found ${players.length} players\n`);

    let initialized = 0;
    let skipped = 0;

    for (const player of players) {
      // Check if player already has achievements
      const existing = await database('lifetime_achievements')
        .where('player_id', player.id)
        .first();

      if (existing) {
        console.log(`⏭️  Player ${player.id}: Already has achievements, skipping`);
        skipped++;
        continue;
      }

      // Parse step data
      let totalSteps = 0;
      try {
        const stepData = typeof player.step_data === 'string' 
          ? JSON.parse(player.step_data) 
          : player.step_data;
        totalSteps = stepData.totalSteps || stepData.total_steps || 0;
      } catch (error) {
        console.log(`⚠️  Player ${player.id}: Could not parse step data, using 0 steps`);
      }

      // Create achievement record
      await database('lifetime_achievements').insert({
        player_id: player.id,
        bonus_cells_per_day: 0,
        discovery_efficiency: 0,
        training_efficiency: 0,
        click_power: 1,
        experience_bank_cap: 100,
        training_roster_slots: 10,
        release_xp_bonus: 0,
        unlocked_achievements: '[]',
        last_daily_bonus_claim: null,
      });

      console.log(`✅ Player ${player.id}: Initialized with ${totalSteps.toLocaleString()} total steps`);
      initialized++;

      // Note: The actual achievement calculation will happen when they next log in
      // and the frontend calls updateAchievements with their total steps
    }

    console.log('\n=====================================');
    console.log(`✅ Initialization complete!`);
    console.log(`   - Initialized: ${initialized} players`);
    console.log(`   - Skipped: ${skipped} players (already had achievements)`);
    console.log(`   - Total: ${players.length} players`);
    console.log('=====================================\n');
    console.log('Note: Achievement bonuses will be calculated when players next log in.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing players:', error);
    process.exit(1);
  }
}

initializeExistingPlayers();
