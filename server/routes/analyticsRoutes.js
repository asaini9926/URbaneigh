const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

/**
 * Analytics Routes - Admin Only
 * GET /api/analytics/orders - Get order metrics
 * GET /api/analytics/returns - Get return analytics
 * GET /api/analytics/customers - Get customer insights
 * GET /api/analytics/payments - Get payment analytics
 * GET /api/analytics/settlement - Get settlement/COD analytics
 * GET /api/analytics/kpi - Get KPI summary
 * GET /api/analytics/export - Export report (CSV)
 */

// All analytics routes require admin authentication
router.use(protect, checkPermission(['SuperAdmin', 'Admin']));

// Get order metrics
router.get('/orders', analyticsController.getOrderMetrics);

// Get return analytics
router.get('/returns', analyticsController.getReturnAnalytics);

// Get customer insights
router.get('/customers', analyticsController.getCustomerInsights);

// Get payment analytics
router.get('/payments', analyticsController.getPaymentAnalytics);

// Get settlement analytics
router.get('/settlement', analyticsController.getSettlementAnalytics);

// Get KPI summary
router.get('/kpi', analyticsController.getKPISummary);

// Export report
router.get('/export', analyticsController.exportReport);

module.exports = router;
