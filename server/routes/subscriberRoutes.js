const express = require('express');
const router = express.Router();
const controller = require('../controllers/subscriberController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

// Public
router.post('/subscribe', controller.subscribe);

// Admin
router.get('/', protect, checkPermission('users.view'), controller.getAllSubscribers);

module.exports = router;
