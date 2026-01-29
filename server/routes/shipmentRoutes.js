// server/routes/shipmentRoutes.js
const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/shipmentController');
const authMiddleware = require('../middleware/authMiddleware');

// Create shipment (admin only)
router.post('/create', authMiddleware.protect, shipmentController.createShipment);

// Schedule pickup (admin only)
router.post('/schedule-pickup', authMiddleware.protect, shipmentController.schedulePickup);

// Get tracking info (public - can be accessed with waybill)
router.get('/track', shipmentController.getTracking);

// Delhivery webhook (no auth)
router.post('/webhook/delhivery', shipmentController.delhiveryWebhook);

// List all shipments (admin only)
router.get('/', authMiddleware.protect, shipmentController.listShipments);

module.exports = router;
