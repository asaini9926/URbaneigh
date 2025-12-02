const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

// Public (Protected by login only)
router.post('/verify', protect, couponController.verifyCoupon);

// Admin Routes
router.get('/', protect, checkPermission('product.create'), couponController.getAllCoupons); // Re-using permission for simplicity
router.post('/', protect, checkPermission('product.create'), couponController.createCoupon);
router.delete('/:id', protect, checkPermission('product.create'), couponController.deleteCoupon);

module.exports = router;