/**
 * Test script to verify multiple sensors can be active simultaneously
 * 
 * Usage:
 *   node src/scripts/testMultiSensor.js
 */

const { getIO } = require('../services/socketHandler');
// Mocking getIO if running standalone (since we're not starting the full server)
// However, the actual server needs to be running for the frontend to receive it.
// This script assumes it's running in a context where it can emit to the socket.
// Wait, this script needs to be run separate from the server.
// The best way to test this "end-to-end" without a full mock environment is to publish MQTT messages 
// if the backend is listening to MQTT, OR to use a socket client to "fake" it, 
// BUT the backend is the one emitting socket events based on MQTT.
// So the robust way is to publish MQTT messages.

const mqtt = require('mqtt');
require('dotenv').config();

const mqttConfig = {
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
    topic: 'voltas/test', // We'll use a test topic or the default one
};

// Use the topic expected by the backend logic, or a common one. 
// Ideally we should start the backend and then run this script.
// Let's assume the backend is listening to 'voltas/#' or similar.

async function runTest() {
    console.log('Connecting to MQTT broker...', mqttConfig.brokerUrl);
    const client = mqtt.connect(mqttConfig.brokerUrl);

    client.on('connect', () => {
        console.log('connected to mqtt');

        // Sequence:
        // 1. Turn CH01 ON
        // 2. Turn CH02 ON (Verify CH01 stays ON)
        // 3. Turn CH01 OFF (Verify CH02 stays ON)

        const deviceId = 'test_device_multi';
        const topic = 'voltas/test/multi';

        // 1. CH01 ON
        console.log('Sending: CH01 ON');
        const payload1 = {
            did: deviceId,
            date: new Date().toISOString(),
            data: [{ s1: 1, st: Date.now() }]
        };
        client.publish(topic, JSON.stringify(payload1));

        setTimeout(() => {
            // 2. CH02 ON
            console.log('Sending: CH02 ON (CH01 should stay ON)');
            const payload2 = {
                did: deviceId,
                date: new Date().toISOString(),
                data: [{ s2: 1, st: Date.now() }]
            };
            client.publish(topic, JSON.stringify(payload2));

            setTimeout(() => {
                // 3. CH01 OFF
                console.log('Sending: CH01 OFF (CH02 should stay ON)');
                const payload3 = {
                    did: deviceId,
                    date: new Date().toISOString(),
                    data: [{ s1: 0, st: Date.now() }]
                };
                client.publish(topic, JSON.stringify(payload3));

                setTimeout(() => {
                    console.log('Test sequence finished. Press Ctrl+C to exit.');
                    client.end();
                }, 2000);

            }, 3000);

        }, 3000);
    });

    client.on('error', (err) => {
        console.error('MQTT Error:', err);
        process.exit(1);
    });
}

runTest();
