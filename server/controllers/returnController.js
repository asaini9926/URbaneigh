const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');

/**
 * Return Controller - Handles product returns and RMA (Return Merchandise Authorization)
 * - Return request creation
 * - Admin approval/rejection
 * - Return pickup scheduling via Delhivery
 * - Return status tracking
 * - Refund trigger on acceptance
 */

/**
 * Create a return request by customer
 * Called when customer clicks "Return" on completed order
 */
exports.createReturnRequest = async (req, res) => {
  try {
    const { orderId, items, reason, description } = req.body;
    const userId = req.user.id; // From auth middleware

    // Validate order exists and is delivered
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: {
        user: true,
        items: { include: { variant: { include: { product: true } } } },
        payment: true,
        shipment: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Only delivered orders can be returned (check Shipment.status, not Order.status)
    const shipment = await prisma.shipment.findFirst({
      where: { orderId: parseInt(orderId) }
    });

    if (!shipment || shipment.status !== 'DELIVERED') {
      return res.status(400).json({
        error: `Cannot return order that hasn't been delivered yet. Shipment status: ${shipment?.status || 'Not created'}`,
      });
    }

    // Validate return reason
    const validReasons = [
      'product_defective',
      'wrong_product_sent',
      'not_as_described',
      'poor_quality',
      'size_fit_issue',
      'color_mismatch',
      'changed_mind',
    ];

    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        error: `Invalid reason. Valid reasons: ${validReasons.join(', ')}`,
      });
    }

    // Validate items to return (must be from this order)
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item must be selected for return' });
    }

    // Check if order is within return window (14 days)
    const returnWindowDays = 14;
    const orderDate = new Date(order.created_at);
    const currentDate = new Date();
    const daysDiff = Math.floor((currentDate - orderDate) / (1000 * 60 * 60 * 24));

    if (daysDiff > returnWindowDays) {
      return res.status(400).json({
        error: `Return window expired. Orders can be returned within ${returnWindowDays} days of delivery.`,
        days_elapsed: daysDiff,
        return_deadline: new Date(new Date(order.delivered_at).getTime() + returnWindowDays * 24 * 60 * 60 * 1000),
      });
    }

    // Validate items exist in order
    const validItemIds = order.items.map(i => i.id);
    for (const itemId of items) {
      if (!validItemIds.includes(itemId)) {
        return res.status(400).json({
          error: `Item ${itemId} not found in this order`,
        });
      }
    }

    // Calculate refund amount
    let refundAmount = 0;
    const returnItems = order.items.filter(i => items.includes(i.id));
    for (const item of returnItems) {
      refundAmount += parseFloat(item.price) * item.quantity;
    }

    // Create return request
    const returnRequest = await prisma.return.create({
      data: {
        orderId: parseInt(orderId),
        userId,
        status: 'REQUESTED',
        reason,
        description,
        items: items.join(','), // Store as comma-separated IDs
        estimatedRefundAmount: refundAmount,
        requestedAt: new Date(),
        notes: `Return requested on ${new Date().toISOString()}. Reason: ${reason}`,
      },
    });

    // NOTE: Do NOT update order.status
    // Return.status is independent from Order.status
    // Order.status only tracks PAYMENT READINESS

    return res.status(201).json({
      success: true,
      message: 'Return request created successfully',
      return_id: returnRequest.id,
      order_id: orderId,
      status: 'REQUESTED',
      estimated_refund_amount: refundAmount,
      return_window_days: returnWindowDays,
      requested_at: returnRequest.requestedAt,
    });
  } catch (error) {
    console.error('Error creating return request:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get return request details
 */
exports.getReturnRequest = async (req, res) => {
  try {
    const { returnId } = req.params;

    const returnRequest = await prisma.return.findUnique({
      where: { id: parseInt(returnId) },
      include: {
        order: { include: { user: true, items: true, shipment: true } },
      },
    });

    if (!returnRequest) {
      return res.status(404).json({ error: 'Return request not found' });
    }

    return res.status(200).json({
      id: returnRequest.id,
      order_id: returnRequest.orderId,
      status: returnRequest.status,
      reason: returnRequest.reason,
      description: returnRequest.description,
      items: returnRequest.items.split(',').map(Number),
      estimated_refund: returnRequest.estimatedRefundAmount,
      approved_refund: returnRequest.approvedRefundAmount,
      pickup_scheduled: !!returnRequest.pickupScheduledAt,
      pickup_scheduled_at: returnRequest.pickupScheduledAt,
      return_waybill: returnRequest.returnWaybill,
      return_status: returnRequest.returnStatus,
      requested_at: returnRequest.requestedAt,
      approved_at: returnRequest.approvedAt,
      completed_at: returnRequest.completedAt,
      notes: returnRequest.notes,
    });
  } catch (error) {
    console.error('Error fetching return request:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Admin: Approve return request
 * Initiates return pickup process with Delhivery
 */
exports.approveReturnRequest = async (req, res) => {
  try {
    const { returnId } = req.params;
    const { approvedAmount, notes } = req.body;

    const returnRequest = await prisma.return.findUnique({
      where: { id: parseInt(returnId) },
      include: { order: { include: { shipment: true } } },
    });

    if (!returnRequest) {
      return res.status(404).json({ error: 'Return request not found' });
    }

    if (returnRequest.status !== 'REQUESTED') {
      return res.status(400).json({
        error: `Cannot approve return with status: ${returnRequest.status}`,
      });
    }

    const now = new Date();

    // Create return shipment for reverse logistics
    // In real scenario, call Delhivery RTO API here
    // For now, we prepare the return for pickup

    const updatedReturn = await prisma.return.update({
      where: { id: parseInt(returnId) },
      data: {
        status: 'APPROVED',
        approvedRefundAmount: approvedAmount || returnRequest.estimatedRefundAmount,
        approvedAt: now,
        notes: `${returnRequest.notes}\n[${now.toISOString()}] Approved by admin. Refund: ${approvedAmount || returnRequest.estimatedRefundAmount}`,
      },
    });

    // NOTE: Do NOT update order.status
    // Return.status progresses independently of Order.status
    // Order.status only tracks PAYMENT READINESS

    return res.status(200).json({
      success: true,
      message: 'Return request approved. Reverse pickup pending.',
      return_id: returnId,
      status: 'APPROVED',
      approved_refund_amount: updatedReturn.approvedRefundAmount,
      approved_at: now.toISOString(),
    });
  } catch (error) {
    console.error('Error approving return request:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Admin: Reject return request
 */
exports.rejectReturnRequest = async (req, res) => {
  try {
    const { returnId } = req.params;
    const { reason: rejectionReason } = req.body;

    const returnRequest = await prisma.return.findUnique({
      where: { id: parseInt(returnId) },
      include: { order: true },
    });

    if (!returnRequest) {
      return res.status(404).json({ error: 'Return request not found' });
    }

    if (returnRequest.status !== 'REQUESTED') {
      return res.status(400).json({
        error: `Cannot reject return with status: ${returnRequest.status}`,
      });
    }

    const now = new Date();

    const updatedReturn = await prisma.return.update({
      where: { id: parseInt(returnId) },
      data: {
        status: 'REJECTED',
        rejectionReason,
        rejectedAt: now,
        notes: `${returnRequest.notes}\n[${now.toISOString()}] Rejected. Reason: ${rejectionReason}`,
      },
    });

    // NOTE: Do NOT update order.status
    // Return.status changes are independent of Order.status

    return res.status(200).json({
      success: true,
      message: 'Return request rejected',
      return_id: returnId,
      status: 'REJECTED',
      rejection_reason: rejectionReason,
      rejected_at: now.toISOString(),
    });
  } catch (error) {
    console.error('Error rejecting return request:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Schedule reverse pickup (RTO) with Delhivery
 * Called after return is approved
 */
exports.scheduleReturnPickup = async (req, res) => {
  try {
    const { returnId, pickupDate } = req.body;

    const returnRequest = await prisma.return.findUnique({
      where: { id: parseInt(returnId) },
      include: { order: { include: { user: true, shipment: true } } },
    });

    if (!returnRequest) {
      return res.status(404).json({ error: 'Return request not found' });
    }

    if (returnRequest.status !== 'APPROVED') {
      return res.status(400).json({
        error: `Cannot schedule pickup for return with status: ${returnRequest.status}`,
      });
    }

    // In real scenario, call Delhivery RTO API
    // delhivery.scheduleRTO({ waybill, pickup_date })

    const now = new Date();

    const updatedReturn = await prisma.return.update({
      where: { id: parseInt(returnId) },
      data: {
        pickupScheduledAt: new Date(pickupDate),
        returnStatus: 'PICKUP_SCHEDULED',
        notes: `${returnRequest.notes}\n[${now.toISOString()}] Reverse pickup scheduled for ${pickupDate}`,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Reverse pickup scheduled successfully',
      return_id: returnId,
      pickup_scheduled_at: pickupDate,
      return_status: 'PICKUP_SCHEDULED',
      scheduled_at: now.toISOString(),
    });
  } catch (error) {
    console.error('Error scheduling return pickup:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get return tracking status
 */
exports.getReturnTracking = async (req, res) => {
  try {
    const { returnId } = req.params;

    const returnRequest = await prisma.return.findUnique({
      where: { id: parseInt(returnId) },
    });

    if (!returnRequest) {
      return res.status(404).json({ error: 'Return request not found' });
    }

    return res.status(200).json({
      return_id: returnId,
      status: returnRequest.status,
      return_status: returnRequest.returnStatus,
      return_waybill: returnRequest.returnWaybill,
      requested_at: returnRequest.requestedAt,
      approved_at: returnRequest.approvedAt,
      pickup_scheduled_at: returnRequest.pickupScheduledAt,
      completed_at: returnRequest.completedAt,
      estimated_refund: returnRequest.estimatedRefundAmount,
      approved_refund: returnRequest.approvedRefundAmount,
      last_update: returnRequest.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching return tracking:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * List all return requests (admin)
 */
exports.listReturnRequests = async (req, res) => {
  try {
    const { status = 'REQUESTED', limit = 20, offset = 0 } = req.query;

    const returnRequests = await prisma.return.findMany({
      where: {
        ...(status && { status }),
      },
      include: {
        order: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
      orderBy: { requestedAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.return.count({
      where: {
        ...(status && { status }),
      },
    });

    return res.status(200).json({
      data: returnRequests,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error('Error listing return requests:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Handle return received (goods arrive back at warehouse)
 * Called by admin or Delhivery webhook
 */
exports.markReturnReceived = async (req, res) => {
  try {
    const { returnId, conditionAssessment } = req.body;

    const returnRequest = await prisma.return.findUnique({
      where: { id: parseInt(returnId) },
    });

    if (!returnRequest) {
      return res.status(404).json({ error: 'Return request not found' });
    }

    const now = new Date();

    const updatedReturn = await prisma.return.update({
      where: { id: parseInt(returnId) },
      data: {
        status: 'RETURNED',
        returnStatus: 'RECEIVED_AT_WAREHOUSE',
        conditionAssessment,
        completedAt: now,
        notes: `${returnRequest.notes}\n[${now.toISOString()}] Goods received at warehouse. Condition: ${conditionAssessment}`,
      },
    });

    // NOTE: Do NOT update order.status
    // Return completion is independent of Order.status

    return res.status(200).json({
      success: true,
      message: 'Return received and marked complete. Refund will be processed.',
      return_id: returnId,
      status: 'RETURNED',
      received_at: now.toISOString(),
    });
  } catch (error) {
    console.error('Error marking return received:', error);
    return res.status(500).json({ error: error.message });
  }
};
