// server/routes/masterRoutes.js
const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');
const { protect, checkPermission } = require('../middleware/authMiddleware');


// Public Routes (Anyone can see categories)
router.get('/categories', masterController.getCategories);
router.get('/brands', masterController.getBrands);

// Protected Routes (Only Admin can create)
router.post('/categories', protect, checkPermission('product.create'), masterController.createCategory);
router.post('/brands', protect, checkPermission('product.create'), masterController.createBrand);
router.delete('/categories/:id', protect, checkPermission('product.create'), masterController.deleteCategory);
router.delete('/brands/:id', protect, checkPermission('product.create'), masterController.deleteBrand);

module.exports = router;