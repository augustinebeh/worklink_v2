const http = require('http');

const data = JSON.stringify({
  email: 'admin@worklink.sg',
  password: 'admin123',
  type: 'admin'
});

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
    
    try {
      const json = JSON.parse(body);
      if (json.token) {
        console.log('\n✅ LOGIN SUCCESSFUL!');
        console.log('Token:', json.token.substring(0, 50) + '...');
        console.log('\n📋 Use this email in admin portal:');
        console.log('   Email: admin@worklink.sg');
        console.log('   Password: admin123');
      } else {
        console.log('\n❌ LOGIN FAILED');
      }
    } catch (e) {
      console.log('Could not parse response');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.write(data);
req.end();
