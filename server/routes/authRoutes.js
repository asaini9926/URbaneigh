const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login-otp', authController.loginWithOtp);
router.post('/logout', authController.logout);
router.post('/dev-login', authController.loginDev);
// Legacy routes (optional to keep or remove)
// router.post('/login', authController.login);
// router.post('/register', authController.register);

module.exports = router;