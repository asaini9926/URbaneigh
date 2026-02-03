const express = require('express');
const router = express.Router();
const marketingController = require('../controllers/marketingController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

// Public
router.get('/poster/active', marketingController.getActivePoster);

// Admin
router.get('/videos', marketingController.getVideos);

// Admin
router.get('/posters', protect, checkPermission('dashboard.view'), marketingController.getAllPosters);
router.post('/posters', protect, checkPermission('product.create'), marketingController.createPoster);
router.delete('/posters/:id', protect, checkPermission('product.create'), marketingController.deletePoster);

router.post('/videos', protect, checkPermission('product.create'), marketingController.createVideo);
router.delete('/videos/:id', protect, checkPermission('product.create'), marketingController.deleteVideo);

module.exports = router;