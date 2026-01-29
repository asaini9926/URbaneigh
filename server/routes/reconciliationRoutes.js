const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../middleware/authMiddleware');
const reconciliationController = require('../controllers/reconciliationController');

/**
 * COD Reconciliation & Settlement Routes
 */

// Get pending COD orders for remittance tracking
router.get('/pending-orders', protect, checkPermission(['admin']), reconciliationController.getPendingCODOrders);

// Record COD payment received from courier
router.post('/record-payment', protect, checkPermission(['admin']), reconciliationController.recordCODPaymentReceived);

// Get settlement summary (daily, weekly, monthly)
router.get('/settlement-summary', protect, checkPermission(['admin']), reconciliationController.getSettlementSummary);

// Get reconciliation alerts (mismatches, discrepancies)
router.get('/alerts', protect, checkPermission(['admin']), reconciliationController.getReconciliationAlerts);

// Resolve a reconciliation alert
router.post('/alerts/:alertId/resolve', protect, checkPermission(['admin']), reconciliationController.resolveAlert);

// Generate reconciliation report
router.get('/report', protect, checkPermission(['admin']), reconciliationController.generateReconciliationReport);

module.exports = router;
