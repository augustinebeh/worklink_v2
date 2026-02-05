#!/usr/bin/env node
/**
 * Quick server startup test
 * Verifies all routes load without errors
 */

console.log('🧪 Testing server startup...\n');

try {
  // Test database connection
  console.log('1️⃣ Testing database connection...');
  const { db } = require('./db');
  console.log('   ✅ Database connected\n');

  // Test route loading
  console.log('2️⃣ Testing route loading...');
  
  const routes = [
    './routes/api/v1/candidates',
    './routes/api/v1/jobs',
    './routes/api/v1/clients',
    './routes/api/v1/template-responses'
  ];

  for (const route of routes) {
    try {
      require(route);
      console.log(`   ✅ ${route.split('/').pop()}`);
    } catch (error) {
      console.error(`   ❌ ${route.split('/').pop()}: ${error.message}`);
      throw error;
    }
  }

  console.log('\n✅ All tests passed! Server should start successfully.\n');
  process.exit(0);

} catch (error) {
  console.error('\n❌ Startup test failed!');
  console.error(error);
  process.exit(1);
}
