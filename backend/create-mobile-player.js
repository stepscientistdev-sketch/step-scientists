const { database } = require('./dist/config/database');

const MOBILE_PLAYER_ID = '021cb11f-482a-44d2-b289-110400f23562';

async function createMobilePlayer() {
  try {
    console.log('🔍 Checking if mobile player exists...');
    
    // Check if player already exists
    const existingPlayer = await database('players').where('id', MOBILE_PLAYER_ID).first();
    
    if (existingPlayer) {
      console.log('✅ Mobile player already exists:', existingPlayer.username);
      return;
    }
    
    console.log('🔨 Creating mobile player...');
    
    // Create the mobile player
    const playerData = {
      id: MOBILE_PLAYER_ID,
      username: 'mobile_player',
      email: 'mobile@stepscientists.app',
      password_hash: 'mobile_player_hash', // Not used for mobile
      step_data: {
        total_steps: 0,
        daily_steps: 0,
        last_updated: new Date().toISOString()
      },
      resources: {
        cells: 0,
        experience_points: 0
      },
      current_mode: 'discovery'
    };
    
    await database('players').insert(playerData);
    
    console.log('✅ Mobile player created successfully!');
    
    // Verify creation
    const createdPlayer = await database('players').where('id', MOBILE_PLAYER_ID).first();
    console.log('📋 Player details:', {
      id: createdPlayer.id,
      username: createdPlayer.username,
      email: createdPlayer.email,
      mode: createdPlayer.current_mode
    });
    
  } catch (error) {
    console.error('❌ Error creating mobile player:', error);
  } finally {
    await database.destroy();
  }
}

createMobilePlayer();