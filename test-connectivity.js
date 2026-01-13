#!/usr/bin/env node

const axios = require('axios');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost';
}

// Get IP from API client configuration
function getConfiguredIP() {
  try {
    const apiClientPath = path.join(__dirname, 'src', 'services', 'apiClient.ts');
    const content = fs.readFileSync(apiClientPath, 'utf8');
    
    // Look for DEVELOPMENT_IP configuration
    const match = content.match(/const DEVELOPMENT_IP = '([^']+)'/);
    if (match && match[1] !== 'YOUR_COMPUTER_IP') {
      return match[1];
    }
  } catch (error) {
    console.log('Could not read API client configuration');
  }
  return null;
}

async function testConnectivity() {
  const detectedIP = getLocalIP();
  const configuredIP = getConfiguredIP();
  
  console.log('🔍 Testing Step Monsters API Connectivity');
  console.log('==========================================');
  console.log(`Detected IP: ${detectedIP}`);
  console.log(`Configured IP: ${configuredIP || 'Not configured'}`);
  console.log('');

  // Use configured IP if available, otherwise use detected IP
  const IP = configuredIP || detectedIP;
  const BASE_URL = `http://${IP}:3000`;
  
  console.log(`Testing server at: ${BASE_URL}`);
  console.log('');

  const tests = [
    {
      name: 'Health Check',
      url: `${BASE_URL}/health`,
      method: 'GET',
      critical: true
    },
    {
      name: 'API Base',
      url: `${BASE_URL}/api`,
      method: 'GET',
      critical: false
    },
    {
      name: 'Species Endpoint',
      url: `${BASE_URL}/api/species`,
      method: 'GET',
      critical: false
    }
  ];

  let allPassed = true;
  let criticalPassed = true;

  for (const test of tests) {
    try {
      console.log(`Testing ${test.name}...`);
      const response = await axios({
        method: test.method,
        url: test.url,
        timeout: 5000
      });
      
      console.log(`✅ ${test.name}: ${response.status} ${response.statusText}`);
      
      if (test.name === 'Health Check') {
        console.log(`   Response: ${JSON.stringify(response.data)}`);
      }
      
    } catch (error) {
      const failed = true;
      allPassed = false;
      
      if (test.critical) {
        criticalPassed = false;
      }
      
      if (error.code === 'ECONNREFUSED') {
        console.log(`❌ ${test.name}: Server not running`);
        if (test.critical) {
          console.log(`   💡 Make sure to start the backend server: cd backend && npm run dev`);
        }
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`❌ ${test.name}: Connection timeout`);
        if (test.critical) {
          console.log(`   💡 Check firewall settings and network connectivity`);
        }
      } else {
        console.log(`❌ ${test.name}: ${error.response?.status || error.message}`);
      }
    }
    console.log('');
  }

  // Summary
  console.log('📊 Test Summary');
  console.log('===============');
  
  if (criticalPassed) {
    console.log('✅ Critical tests passed - Server is accessible');
  } else {
    console.log('❌ Critical tests failed - Server is not accessible');
    console.log('');
    console.log('🔧 Troubleshooting Steps:');
    console.log('1. Make sure the backend server is running: cd backend && npm run dev');
    console.log('2. Check if PostgreSQL is running');
    console.log('3. Verify firewall settings allow connections on port 3000');
    console.log('4. Ensure your computer and mobile device are on the same network');
    console.log('');
  }

  if (allPassed) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed (this may be normal if server is not fully started)');
  }

  console.log('');
  console.log('📱 Mobile Testing Instructions:');
  console.log('==============================');
  console.log(`1. Connect your mobile device to the same WiFi network`);
  console.log(`2. Open a browser on your mobile device`);
  console.log(`3. Visit: ${BASE_URL}/health`);
  console.log(`4. You should see a JSON response with server status`);
  console.log('');
  
  if (criticalPassed) {
    console.log('✅ If the mobile browser test works, your app should connect successfully!');
  } else {
    console.log('❌ Fix the server connectivity issues before testing on mobile');
  }
  
  console.log('');
  console.log('🔧 Configuration:');
  console.log(`   API Client configured for: ${configuredIP || 'Not configured'}`);
  console.log(`   Current network IP: ${detectedIP}`);
  
  if (!configuredIP || configuredIP === 'YOUR_COMPUTER_IP') {
    console.log('');
    console.log('⚠️  API client not configured! Run the setup script:');
    console.log('   Windows: setup-mobile-testing.bat');
    console.log('   Mac/Linux: ./setup-mobile-testing.sh');
  }
}

// Run the test
testConnectivity().catch(console.error);