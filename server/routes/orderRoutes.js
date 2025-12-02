// server/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

// All order routes require login
router.post('/', protect, orderController.createOrder);
router.get('/my-orders', protect, orderController.getMyOrders);
router.get('/admin/all', protect, checkPermission('order.read'), orderController.getAllOrders);
router.put('/:id/status', protect, checkPermission('order.update_status'), orderController.updateOrderStatus);

module.exports = router;