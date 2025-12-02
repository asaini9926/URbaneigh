// server/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, checkPermission } = require('../middleware/authMiddleware');


// Public: Anyone can view products
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);

// Protected: Only Admin can create
router.post('/', protect, checkPermission('product.create'), productController.createProduct);
router.put('/:id', protect, checkPermission('product.update'), productController.updateProduct);
router.delete('/:id', protect, checkPermission('product.delete'), productController.deleteProduct);

module.exports = router;