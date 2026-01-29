const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../middleware/authMiddleware');
const returnController = require('../controllers/returnController');

/**
 * Return Management Routes
 */

// Customer creates a return request
router.post('/create', protect, returnController.createReturnRequest);

// Get a specific return request details
router.get('/details/:returnId', protect, returnController.getReturnRequest);

// Get return tracking status
router.get('/track/:returnId', protect, returnController.getReturnTracking);

// Admin: Get all return requests with filters
router.get('/admin/list', protect, checkPermission(['admin']), returnController.listReturnRequests);

// Admin: Approve return request
router.post('/admin/approve/:returnId', protect, checkPermission(['admin']), returnController.approveReturnRequest);

// Admin: Reject return request
router.post('/admin/reject/:returnId', protect, checkPermission(['admin']), returnController.rejectReturnRequest);

// Schedule return pickup (Delhivery RTO)
router.post('/schedule-pickup/:returnId', protect, checkPermission(['admin']), returnController.scheduleReturnPickup);

// Mark return as received (goods arrived)
router.post('/mark-received/:returnId', protect, checkPermission(['admin']), returnController.markReturnReceived);

module.exports = router;
