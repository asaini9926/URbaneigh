const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../middleware/authMiddleware');
const refundController = require('../controllers/refundController');

/**
 * Refund Management Routes
 */

// Initiate refund for Paytm orders
router.post('/paytm/initiate', protect, checkPermission(['admin']), refundController.initiateRefund);

// Check Paytm refund status
router.get('/paytm/status/:orderId', protect, refundController.checkRefundStatus);

// Initiate COD refund (manual bank transfer)
router.post('/cod/initiate', protect, checkPermission(['admin']), refundController.initiateCODRefund);

// Get refund details for any order
router.get('/details/:orderId', protect, refundController.getRefundDetails);

module.exports = router;
