// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

router.get('/admin-dashboard', protect, checkPermission('dashboard.view'), (req, res) => {
    res.json({ message: `Welcome Admin ${req.user.name}, you have access!` });
});

module.exports = router;