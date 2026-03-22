const mqtt = require('mqtt');
require('dotenv').config();

const client = mqtt.connect('mqtt://140.245.50.20:1883', {
  username: 'iot-sense',
  password: 'Tech2026*'
});

client.on('connect', () => {
  console.log('Connected to MQTT');
  client.subscribe('iot/#', () => {
    console.log('Subscribed to iot/#');
  });
});

client.on('message', (topic, message) => {
  console.log(`Received on ${topic}:`, message.toString());
});
