require('dotenv').config();
const paytmService = require('../services/paytmService');
const Paytm = require('paytm-pg-node-sdk');

async function run() {
    try {
        Paytm.MerchantProperties.setCallbackUrl("http://localhost:5000/api/payments/webhook");
        const orderId = "TEST_" + Date.now();
        const amount = "2999.00";
        const customerId = "CUST-" + Date.now();
        const email = "test@example.com";
        const phone = "9999999999";

        const res = await paytmService.initiateTransaction(orderId, amount, customerId, email, phone);
        console.log("Response:", JSON.stringify(res, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
