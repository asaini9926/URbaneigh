const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

/**
 * Notification Routes
 * POST /api/notifications/test - Send test email (admin only)
 * GET /api/notifications/user/:userId - Get user notifications
 * POST /api/notifications/:orderId/read - Mark notification as read
 * POST /api/notifications/order/confirmation/:orderId - Send order confirmation (internal)
 * POST /api/notifications/shipment/:shipmentId - Send shipment notification (internal)
 * POST /api/notifications/delivery/:orderId - Send delivery notification (internal)
 * POST /api/notifications/refund/:orderId - Send refund notification (internal)
 */

// Admin: Send test email
router.post('/test', protect, checkPermission(['SuperAdmin', 'Admin']), notificationController.sendTestEmail);

// Get user notifications
router.get('/user/:userId', protect, notificationController.getUserNotifications);

// Mark notification as read
router.post('/:orderId/read', protect, notificationController.markNotificationRead);

// Internal: Send order confirmation
router.post('/order/confirmation/:orderId', notificationController.sendOrderConfirmation);

// Internal: Send shipment notification
router.post('/shipment/:shipmentId', notificationController.sendShipmentNotification);

// Internal: Send delivery notification
router.post('/delivery/:orderId', notificationController.sendDeliveryNotification);

// Internal: Send refund notification
router.post('/refund/:orderId', notificationController.sendRefundNotification);

module.exports = router;
