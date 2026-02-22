// server/routes/shipmentRoutes.js
const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/shipmentController');
const authMiddleware = require('../middleware/authMiddleware');

// Check Serviceability (admin only)
router.post('/serviceability', authMiddleware.protect, shipmentController.checkServiceability);

// Create shipment (admin only)
router.post('/create', authMiddleware.protect, shipmentController.createShipment);

// Generate AWB (admin only)
router.post('/generate-awb', authMiddleware.protect, shipmentController.generateAWB);

// Generate Label (admin only)
router.post('/generate-label', authMiddleware.protect, shipmentController.generateLabel);

// Schedule pickup (admin only)
router.post('/schedule-pickup', authMiddleware.protect, shipmentController.schedulePickup);

// Cancel shipment (admin only)
router.post('/cancel', authMiddleware.protect, shipmentController.cancelShipment);

// Get tracking info (public - can be accessed with waybill)
router.get('/track', shipmentController.getTracking);

// Shiprocket webhook (no auth)
router.post('/webhook/shiprocket', shipmentController.shiprocketWebhook);

// List all shipments (admin only)
router.get('/', authMiddleware.protect, shipmentController.listShipments);

module.exports = router;
