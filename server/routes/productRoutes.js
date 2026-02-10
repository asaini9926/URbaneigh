// server/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, checkPermission } = require('../middleware/authMiddleware');


// Multer for File Uploads
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Public: Anyone can view products
router.get('/', productController.getProducts);
router.get('/filters', productController.getFilters);
router.get('/:id', productController.getProductById);

// Protected: Only Admin can create/edit
router.post('/', protect, checkPermission('product.create'), productController.createProduct);
router.get('/export', protect, checkPermission('product.view'), productController.exportProducts); // EXPORT
router.post('/import', protect, checkPermission('product.create'), upload.single('file'), productController.importProducts); // IMPORT

router.post('/bulk-delete', protect, checkPermission('product.delete'), productController.bulkDeleteProducts);
router.post('/bulk-status', protect, checkPermission('product.update'), productController.bulkUpdateStatus);
router.put('/:id', protect, checkPermission('product.update'), productController.updateProduct);
router.delete('/:id', protect, checkPermission('product.delete'), productController.deleteProduct);

module.exports = router;