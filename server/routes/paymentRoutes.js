// server/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');

// Initiate Paytm payment (requires auth)
router.post('/initiate', authMiddleware.protect, paymentController.initiatePayment);

// Verify Paytm payment (requires auth)
router.post('/verify', authMiddleware.protect, paymentController.verifyPayment);

// Webhook from Paytm (no auth required - Paytm will call this)
router.post('/webhook/paytm', paymentController.paytmWebhook);

// Callback URL for redirect flow (Paytm redirects user here after payment)
router.post('/callback', paymentController.paytmCallback);

module.exports = router;
