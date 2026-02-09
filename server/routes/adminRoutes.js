const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

// Only users with 'user.manage_roles' (SuperAdmin) can access these
router.get('/permissions', protect, checkPermission('user.manage_roles'), adminController.getPermissions);
router.get('/roles', protect, checkPermission('user.manage_roles'), adminController.getRoles);
router.post('/roles', protect, checkPermission('user.manage_roles'), adminController.createRole);
router.get('/users', protect, checkPermission('user.manage_roles'), adminController.getAllUsers);
router.put('/users/role', protect, checkPermission('user.manage_roles'), adminController.updateUserRole);
router.post('/users', protect, checkPermission('user.manage_roles'), adminController.createUser);
router.delete('/users/:id', protect, checkPermission('user.manage_roles'), adminController.deleteUser);

// Enhanced Customer & Cart Routes
router.get('/customers', protect, checkPermission('user.manage_roles'), adminController.getCustomers);
router.get('/carts', protect, checkPermission('user.manage_roles'), adminController.getAllCarts);

router.get('/stats', protect, checkPermission('dashboard.view'), adminController.getDashboardStats);

module.exports = router;