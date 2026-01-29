const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../middleware/authMiddleware');
const codController = require('../controllers/codController');

/**
 * COD Routes
 * All routes require authentication
 * Admin-only routes marked with checkPermission middleware
 */

// Generate OTP for OUT_FOR_DELIVERY order
// Can be called by admin or automatically by shipment webhook
// POST /api/cod/generate-otp
router.post('/generate-otp', protect, codController.generateOTP);

// Verify OTP entered by customer
// Called by delivery agent app or customer portal
// POST /api/cod/verify-otp
router.post('/verify-otp', protect, codController.verifyOTP);

// Handle failed delivery attempt
// Called by admin or delivery partner system
// POST /api/cod/failed-delivery
router.post('/failed-delivery', protect, checkPermission, codController.handleFailedDelivery);

// Get COD status for specific order
// Customer can check their own order, Admin can check any
// GET /api/cod/status/:orderId
router.get('/status/:orderId', protect, codController.getCODStatus);

// List all pending COD orders (admin only)
// Filtered by status (default: OUT_FOR_DELIVERY)
// GET /api/cod/pending?status=OUT_FOR_DELIVERY&limit=20&offset=0
router.get('/pending', protect, checkPermission, codController.getPendingCODOrders);

module.exports = router;
