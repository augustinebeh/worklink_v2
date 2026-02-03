#!/usr/bin/env node

const WebSocket = require('ws');
const fetch = require('node-fetch');

const SERVER_URL = 'http://localhost:8080';
const WS_URL = 'ws://localhost:8080';

async function debugAdminWebSocket() {
    console.log('🔍 Admin WebSocket Debug Script');
    console.log('================================\n');

    // Step 1: Get admin token
    console.log('1. Getting admin token...');
    let adminToken;
    try {
        const response = await fetch(`${SERVER_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@worklink.sg',
                password: 'admin123'
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message);
        }

        adminToken = data.token;
        console.log('✅ Admin token obtained');
        console.log(`   Role: ${data.user.role}`);
        console.log(`   Token: ${adminToken.substring(0, 20)}...\n`);
    } catch (error) {
        console.error('❌ Failed to get admin token:', error.message);
        return;
    }

    // Step 2: Test WebSocket connection
    console.log('2. Testing WebSocket connection...');
    const wsUrl = `${WS_URL}/ws?admin=true&token=${adminToken}`;
    console.log(`   URL: ${wsUrl}\n`);

    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
        console.log('✅ WebSocket connected successfully');
        
        // Send a test message
        const testMessage = { type: 'admin_test', message: 'Test from debug script' };
        console.log('📤 Sending test message:', testMessage);
        ws.send(JSON.stringify(testMessage));
    });

    ws.on('message', (data) => {
        console.log('📨 Received:', data.toString());
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
    });

    ws.on('close', (code, reason) => {
        console.log(`🔌 WebSocket closed: ${code} ${reason}`);
    });

    // Keep alive for 15 seconds
    setTimeout(() => {
        console.log('\n🏁 Closing connection...');
        ws.close();
        process.exit(0);
    }, 15000);
}

// Run the debug
debugAdminWebSocket().catch(console.error);
