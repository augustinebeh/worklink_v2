#!/usr/bin/env node

const webpush = require('web-push');

console.log('🔐 Generating VAPID keys for push notifications...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID Keys Generated:');
console.log(`\nVAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:notifications@worklink.sg`);

console.log('\n📝 Copy these to your .env file:');
console.log('─'.repeat(80));
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:notifications@worklink.sg`);
console.log('─'.repeat(80));

// Update .env file
const fs = require('fs');
const path = require('path');

try {
  let envContent = fs.readFileSync('.env', 'utf8');

  // Update or add VAPID keys
  envContent = envContent
    .replace(/VAPID_PUBLIC_KEY=.*/, `VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`)
    .replace(/VAPID_PRIVATE_KEY=.*/, `VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`)
    .replace(/VAPID_EMAIL=.*/, `VAPID_EMAIL=mailto:notifications@worklink.sg`);

  // If keys weren't found, add them
  if (!envContent.includes('VAPID_PUBLIC_KEY')) {
    envContent += `\n# VAPID Keys for Push Notifications\n`;
    envContent += `VAPID_PUBLIC_KEY=${vapidKeys.publicKey}\n`;
    envContent += `VAPID_PRIVATE_KEY=${vapidKeys.privateKey}\n`;
    envContent += `VAPID_EMAIL=mailto:notifications@worklink.sg\n`;
  }

  fs.writeFileSync('.env', envContent);
  console.log('\n✅ .env file updated with new VAPID keys');

} catch (error) {
  console.log(`\n❌ Could not update .env file: ${error.message}`);
  console.log('💡 Please manually add the keys above to your .env file');
}