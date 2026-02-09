const axios = require('axios');

// Admin Token (You might need to login first or use a known token, 
// for test purposes we assume one can be pasted or we can login)
// Actually, this script needs to login as admin.

const API_URL = 'import.meta.env.VITE_API_URL';

async function testAnalytics() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/dev-login`, {
            email: 'admin@comfortclothing.com'
        });

        const token = loginRes.data.token;
        console.log('Login successful. Token acquired.');

        const headers = { Authorization: `Bearer ${token}` };

        const endpoints = [
            '/analytics/orders?days=30',
            '/analytics/revenue?days=30',
            '/analytics/customers?days=30',
            '/analytics/products?days=30',
            '/analytics/fulfillment?days=30',
            '/analytics/payments?days=30',
            '/analytics/settlement?days=30',
            '/analytics/kpi?days=30'
        ];

        for (const ep of endpoints) {
            console.log(`Testing ${ep}...`);
            try {
                const res = await axios.get(`${API_URL}${ep}`, { headers });
                if (res.status === 200 && res.data.success) {
                    console.log(`✅ ${ep} Passed`);
                    // console.log(JSON.stringify(res.data, null, 2).substring(0, 200) + '...');
                } else {
                    console.error(`❌ ${ep} Failed`, res.data);
                }
            } catch (err) {
                console.error(`❌ ${ep} Error:`, err.response ? err.response.data : err.message);
            }
        }

    } catch (error) {
        console.error('Test Failed:', error.response ? error.response.data : error.message);
    }
}

testAnalytics();
