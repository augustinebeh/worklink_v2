const http = require('http');

// First, login to get token
const loginData = JSON.stringify({
  email: 'admin@worklink.sg',
  password: 'admin123',
  type: 'admin'
});

console.log('🔐 Step 1: Logging in...\n');

const loginReq = http.request({
  hostname: 'localhost',
  port: 8080,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
}, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    const loginResponse = JSON.parse(body);
    
    if (!loginResponse.token) {
      console.log('❌ Login failed');
      return;
    }
    
    const token = loginResponse.token;
    console.log('✅ Login successful!');
    console.log('Token:', token.substring(0, 50) + '...\n');
    
    // Now test candidates endpoint
    console.log('👥 Step 2: Fetching candidates...\n');
    
    const candidatesReq = http.request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/v1/candidates',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let candidatesBody = '';
      res.on('data', (chunk) => candidatesBody += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        
        try {
          const candidatesResponse = JSON.parse(candidatesBody);
          console.log('Success:', candidatesResponse.success);
          
          if (candidatesResponse.success && candidatesResponse.data) {
            console.log('✅ CANDIDATES RETURNED:', candidatesResponse.data.length);
            console.log('');
            
            if (candidatesResponse.data.length > 0) {
              console.log('📋 Candidates:');
              candidatesResponse.data.forEach((c, i) => {
                console.log(`   ${i + 1}. ${c.name} - ${c.email} - Status: ${c.status}`);
              });
            } else {
              console.log('⚠️  No candidates in response (empty array)');
            }
          } else {
            console.log('❌ Request failed');
            console.log('Error:', candidatesResponse.error || 'Unknown');
            console.log('Full response:', JSON.stringify(candidatesResponse, null, 2));
          }
        } catch (e) {
          console.log('Could not parse response:', candidatesBody);
        }
      });
    });
    
    candidatesReq.on('error', (error) => {
      console.error('Error:', error.message);
    });
    
    candidatesReq.end();
  });
});

loginReq.on('error', (error) => {
  console.error('Login error:', error.message);
});

loginReq.write(loginData);
loginReq.end();
