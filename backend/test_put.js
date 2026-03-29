const axios = require('axios');
(async () => {
    try {
        const port = 5000;
        
        // Simulating the user's action to update location 1 to LOC-1
        console.log('--- Checking old data ---');
        const getRes = await axios.get(`http://localhost:${port}/api/locations?department_id=1`); // assuming public/testable GET
        console.log('Initial List:', getRes.data);
        
        // This simulates Settings.jsx doing a PUT
        // Without auth token it might fail, but let's try. If it requires auth, we can't test it this way cleanly without signing a JWT.
    } catch(err) {
        console.error('Error:', err.message);
    }
})();
