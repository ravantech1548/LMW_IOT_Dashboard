const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Create an admin token
const token = jwt.sign(
  { id: 1, email: 'admin@example.com', role: 'admin' },
  process.env.JWT_SECRET || 'secret-key', // Use fallback if not loaded properly
  { expiresIn: '1h' }
);

const config = { headers: { Authorization: `Bearer ${token}` } };

(async () => {
    try {
        console.log('Testing Location API Update...');
        // Let's update location '1' to 'LOC-1'
        const putRes = await axios.put('http://localhost:5000/api/locations/1', {
            id: 'LOC-1',
            name: 'Irugur-HQ-Edited'
        }, config);
        
        console.log('Update Result:', putRes.data);
    } catch(e) {
        console.error('Error during update:', e.response?.data || e.message);
    }
})();
