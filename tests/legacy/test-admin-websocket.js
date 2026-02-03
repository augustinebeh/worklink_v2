#!/usr/bin/env node

const WebSocket = require('ws');
const fetch = require('node-fetch');

const SERVER_URL = 'http://localhost:8080';
const WS_URL = 'ws://localhost:8080';

class AdminWebSocketTester {
    constructor() {
        this.adminToken = null;
        this.ws = null;
    }

    async loginAsAdmin() {
        console.log('🔐 Step 1: Logging in as admin...');
        
        try {
            const response = await fetch(`${SERVER_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: 'admin@worklink.sg',
                    password: 'admin123'
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(`Login failed: ${data.message || response.statusText}`);
            }

            this.adminToken = data.token;
            console.log('✅ Admin login successful');
            console.log(`📝 Token: ${this.adminToken.substring(0, 50)}...`);
            console.log(`👤 User: ${data.user.email} (Role: ${data.user.role})`);
            
            return true;
        } catch (error) {
            console.error('❌ Admin login failed:', error.message);
            return false;
        }
    }

    async testWebSocketConnection() {
        console.log('\n🔌 Step 2: Testing WebSocket connection...');
        
        if (!this.adminToken) {
            console.error('❌ No admin token available');
            return false;
        }

        return new Promise((resolve) => {
            const wsUrl = `${WS_URL}/ws?admin=true&token=${this.adminToken}`;
            console.log(`🔗 Connecting to: ${wsUrl}`);
            
            this.ws = new WebSocket(wsUrl);
            
            // Set a timeout for connection
            const connectionTimeout = setTimeout(() => {
                console.error('❌ WebSocket connection timeout (10 seconds)');
                this.ws.terminate();
                resolve(false);
            }, 10000);

            this.ws.on('open', () => {
                clearTimeout(connectionTimeout);
                console.log('✅ WebSocket connection established');
                this.setupWebSocketHandlers();
                resolve(true);
            });

            this.ws.on('error', (error) => {
                clearTimeout(connectionTimeout);
                console.error('❌ WebSocket connection error:', error.message);
                resolve(false);
            });

            this.ws.on('close', (code, reason) => {
                clearTimeout(connectionTimeout);
                console.log(`🔌 WebSocket connection closed: ${code} - ${reason}`);
                resolve(false);
            });
        });
    }

    setupWebSocketHandlers() {
        this.ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log('📨 Received message:', message);
                
                // Handle different message types
                switch (message.type) {
                    case 'admin_connected':
                        console.log('🎉 Admin successfully connected to server');
                        break;
                    case 'admin_stats':
                        console.log('📊 Admin stats received:', message.data);
                        break;
                    case 'error':
                        console.error('❌ Server error:', message.message);
                        break;
                    default:
                        console.log('📩 Other message type:', message.type);
                }
            } catch (error) {
                console.error('❌ Failed to parse message:', data.toString());
            }
        });

        this.ws.on('close', (code, reason) => {
            console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
        });

        this.ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error.message);
        });
    }

    async testBidirectionalCommunication() {
        console.log('\n💬 Step 3: Testing bidirectional communication...');
        
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('❌ WebSocket not connected');
            return false;
        }

        // Test sending admin messages
        const testMessages = [
            { type: 'admin_hello', message: 'Hello from admin test client' },
            { type: 'get_stats', message: 'Requesting server stats' },
            { type: 'ping', timestamp: Date.now() }
        ];

        for (const testMessage of testMessages) {
            console.log(`📤 Sending: ${JSON.stringify(testMessage)}`);
            this.ws.send(JSON.stringify(testMessage));
            
            // Wait a bit between messages
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return true;
    }

    async checkServerAdminClients() {
        console.log('\n🔍 Step 4: Checking server admin client count...');
        
        try {
            const response = await fetch(`${SERVER_URL}/api/admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`
                }
            });

            if (response.ok) {
                const stats = await response.json();
                console.log('📊 Server stats:', stats);
                
                if (stats.adminClients !== undefined) {
                    console.log(`👥 Admin clients connected: ${stats.adminClients}`);
                } else {
                    console.log('⚠️ Admin client count not available in stats');
                }
            } else {
                console.log('⚠️ Could not fetch server stats:', response.statusText);
            }
        } catch (error) {
            console.log('⚠️ Could not fetch server stats:', error.message);
        }
    }

    async runFullTest() {
        console.log('🚀 Starting Admin WebSocket Connection Test\n');
        console.log('=' .repeat(50));

        // Step 1: Login
        const loginSuccess = await this.loginAsAdmin();
        if (!loginSuccess) {
            console.log('\n❌ Test failed at login step');
            return;
        }

        // Step 2: Connect WebSocket
        const wsSuccess = await this.testWebSocketConnection();
        if (!wsSuccess) {
            console.log('\n❌ Test failed at WebSocket connection step');
            return;
        }

        // Wait a moment for connection to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 3: Test communication
        await this.testBidirectionalCommunication();

        // Step 4: Check server stats
        await this.checkServerAdminClients();

        // Keep connection open for a bit to observe
        console.log('\n⏱️ Keeping connection open for 10 seconds to observe...');
        setTimeout(() => {
            console.log('\n🏁 Test completed. Closing connection.');
            if (this.ws) {
                this.ws.close();
            }
            process.exit(0);
        }, 10000);
    }

    cleanup() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Test interrupted');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Test terminated');
    process.exit(0);
});

// Check if server is running
async function checkServer() {
    try {
        const response = await fetch(`${SERVER_URL}/health`);
        if (response.ok) {
            console.log('✅ Server is running');
            return true;
        }
    } catch (error) {
        console.error('❌ Server is not running or not accessible:', error.message);
        console.log('💡 Make sure to start the server first with: npm run dev');
        return false;
    }
    return false;
}

// Main execution
async function main() {
    console.log('🔍 Checking server availability...');
    
    const serverRunning = await checkServer();
    if (!serverRunning) {
        process.exit(1);
    }

    const tester = new AdminWebSocketTester();
    await tester.runFullTest();
}

// Run the test
main().catch(error => {
    console.error('❌ Test script error:', error);
    process.exit(1);
});
