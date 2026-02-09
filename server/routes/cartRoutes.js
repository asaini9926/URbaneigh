const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

router.post('/sync', protect, cartController.syncCart);
router.get('/', protect, cartController.getCart);
router.post('/add', protect, cartController.addToCart);
router.put('/update', protect, cartController.updateQuantity);
router.delete('/remove/:variantId', protect, cartController.removeFromCart);
router.delete('/clear', protect, cartController.clearCart);

module.exports = router;
