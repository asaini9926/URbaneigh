// server/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

// All order routes require login
router.post('/', protect, orderController.createOrder);
router.get('/my-orders', protect, orderController.getMyOrders);
router.get('/admin/all', protect, checkPermission('order.read'), orderController.getAllOrders);
router.get('/admin/:id', protect, checkPermission('order.read'), orderController.getAdminOrderById); // New Admin ID route
router.post('/admin/bulk-delete', protect, checkPermission('order.delete'), orderController.bulkDeleteOrders);
router.put('/:id/status', protect, checkPermission('order.update_status'), orderController.updateOrderStatus);
router.put('/:id/fulfillment', protect, checkPermission('order.update_status'), orderController.updateFulfillmentStatus);

module.exports = router;