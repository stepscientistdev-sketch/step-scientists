const { steplingService } = require('./dist/services/steplingService');

const MOBILE_PLAYER_ID = '021cb11f-482a-44d2-b289-110400f23562';

async function testSteplingsAPI() {
  try {
    console.log('🔍 Testing steplings service directly...');
    
    const steplings = await steplingService.getPlayerSteplings(MOBILE_PLAYER_ID);
    
    console.log(`📊 Service returned ${steplings.length} steplings`);
    
    if (steplings.length > 0) {
      console.log('📋 First few steplings:');
      steplings.slice(0, 3).forEach((s, i) => {
        console.log(`  ${i+1}. ${s.species?.name || 'Unknown'} Lv.${s.level} F.${s.fusion_level}`);
        console.log(`     ID: ${s.id}`);
        console.log(`     Species: ${JSON.stringify(s.species)}`);
      });
    } else {
      console.log('❌ No steplings returned by service');
    }
    
  } catch (error) {
    console.error('💥 Service error:', error);
  }
}

testSteplingsAPI();