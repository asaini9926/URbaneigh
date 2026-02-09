const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware'); // Assuming this exists

router.get('/profile', protect, userController.getProfile);
router.post('/address', protect, userController.addAddress);
router.put('/address/:id/default', protect, userController.setDefaultAddress);
router.delete('/address/:id', protect, userController.deleteAddress);

module.exports = router;
