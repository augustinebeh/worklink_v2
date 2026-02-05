/**
 * Test Login API directly
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testLogin() {
  console.log('🔐 Testing Login API...\n');

  try {
    const response = await fetch('http://localhost:8080/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@worklink.sg',
        password: 'admin123',
        type: 'admin'
      })
    });

    const data = await response.json();

    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📋 Response Data:`, data);

    if (response.ok && data.success) {
      console.log('✅ Login API working correctly');
      console.log(`🎫 Token received: ${data.token ? 'Yes' : 'No'}`);
      return true;
    } else {
      console.log('❌ Login API failed');
      return false;
    }

  } catch (error) {
    console.error('❌ Login API error:', error.message);
    return false;
  }
}

if (require.main === module) {
  testLogin().then(success => {
    console.log(`\n🏁 Login API test ${success ? 'passed' : 'failed'}`);
    process.exit(success ? 0 : 1);
  });
}