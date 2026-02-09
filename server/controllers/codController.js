const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * COD Controller - Handles Cash on Delivery operations
 * - OTP generation for delivery verification
 * - OTP verification by delivery agent
 * - Failed delivery handling
 * - RTO (Return To Origin) management
 */

/**
 * Generate OTP when order reaches OUT_FOR_DELIVERY status
 * Called automatically by shipment webhook or manually by admin
 */
exports.generateOTP = async (req, res) => {
  try {
    const { orderId } = req.body;

    // Validate order exists and is COD
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, shipment: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.paymentMethod !== 'COD') {
      return res.status(400).json({ error: 'Order is not COD' });
    }

    // Order must be OUT_FOR_DELIVERY to generate OTP
    if (order.status !== 'OUT_FOR_DELIVERY') {
      return res.status(400).json({
        error: `Cannot generate OTP. Order status is ${order.status}, expected OUT_FOR_DELIVERY`,
      });
    }

    // OTP must not already be generated
    if (order.payment?.cod_otp) {
      return res.status(400).json({
        error: 'OTP already generated for this order',
        otp_status: 'already_generated',
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    // Store OTP in payment record
    const updatedPayment = await prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        cod_otp: otp,
        cod_otp_expires_at: otpExpiresAt,
        cod_attempts: 0,
      },
    });

    // Log in order history
    await prisma.order.update({
      where: { id: orderId },
      data: {
        notes: `${order.notes || ''}\n[${new Date().toISOString()}] OTP generated for COD verification`,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'OTP generated successfully',
      order_id: orderId,
      otp_length: 6,
      expires_in_hours: 2,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating OTP:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Verify OTP entered by customer or delivery agent
 * Success = order marked DELIVERED, payment marked COMPLETED
 * Failure = increment attempt counter, block if >3 attempts
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { orderId, otp } = req.body;

    if (!orderId || !otp) {
      return res.status(400).json({ error: 'orderId and otp required' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, shipment: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.paymentMethod !== 'COD') {
      return res.status(400).json({ error: 'Order is not COD' });
    }

    // Order must be OUT_FOR_DELIVERY
    if (order.status !== 'OUT_FOR_DELIVERY') {
      return res.status(400).json({
        error: `OTP verification only allowed for OUT_FOR_DELIVERY orders`,
      });
    }

    // OTP must exist
    if (!order.payment.cod_otp) {
      return res.status(400).json({
        error: 'No OTP generated for this order. Request OTP first.',
      });
    }

    // OTP must not be expired
    if (new Date() > new Date(order.payment.cod_otp_expires_at)) {
      return res.status(400).json({
        error: 'OTP expired. Generate new OTP.',
        expired_at: order.payment.cod_otp_expires_at,
      });
    }

    // Max 3 attempts
    if (order.payment.cod_attempts >= 3) {
      return res.status(400).json({
        error: 'Maximum OTP attempts exceeded. Mark as failed delivery.',
        attempts: order.payment.cod_attempts,
      });
    }

    // Verify OTP
    if (otp !== order.payment.cod_otp) {
      // Increment attempt counter
      const updatedPayment = await prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          cod_attempts: order.payment.cod_attempts + 1,
        },
      });

      const remainingAttempts = 3 - updatedPayment.cod_attempts;

      return res.status(400).json({
        error: 'OTP incorrect',
        attempts_remaining: remainingAttempts,
        attempts_used: updatedPayment.cod_attempts,
      });
    }

    // OTP is correct - mark order DELIVERED
    const now = new Date();

    // Atomic transaction: update order, payment, and inventory
    const result = await prisma.$transaction(async (tx) => {
      // Update payment to COMPLETED
      const updatedPayment = await tx.payment.update({
        where: { id: order.payment.id },
        data: {
          status: 'COMPLETED',
          cod_verified_at: now,
          paytm_status: null, // Not applicable for COD
        },
      });

      // Update order to DELIVERED
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'DELIVERED',
          notes: `${order.notes || ''}\n[${now.toISOString()}] COD verified via OTP. Payment marked complete.`,
        },
      });

      // Update shipment to DELIVERED
      if (order.shipment) {
        const updatedShipment = await tx.shipment.update({
          where: { id: order.shipment.id },
          data: {
            status: 'DELIVERED',
            delivered_at: now,
            delhivery_last_status_update: now,
          },
        });
      }

      return { payment: updatedPayment, order: updatedOrder };
    });

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully. Order marked DELIVERED. COD payment completed.',
      order_id: orderId,
      order_status: 'DELIVERED',
      payment_status: 'COMPLETED',
      verified_at: now.toISOString(),
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Handle failed delivery attempts
 * - Delivery agent unable to contact customer
 * - Customer refused delivery
 * - Customer not available
 * Logic: Auto-trigger RTO (Return To Origin) after specified attempts
 */
exports.handleFailedDelivery = async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    if (!orderId || !reason) {
      return res.status(400).json({
        error: 'orderId and reason required',
        valid_reasons: [
          'customer_not_available',
          'customer_refused',
          'address_invalid',
          'address_inaccessible',
          'customer_postponed',
        ],
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, shipment: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.paymentMethod !== 'COD') {
      return res.status(400).json({ error: 'Order is not COD' });
    }

    // Must be OUT_FOR_DELIVERY
    if (order.status !== 'OUT_FOR_DELIVERY') {
      return res.status(400).json({
        error: `Cannot mark failed. Order status is ${order.status}`,
      });
    }

    const now = new Date();

    // Get current failed attempts count (stored in notes or create new tracking)
    const failedAttempts = (order.failed_delivery_attempts || 0) + 1;
    const maxAttempts = 2; // Trigger RTO after 2 failed attempts
    const triggerRTO = failedAttempts >= maxAttempts;

    const result = await prisma.$transaction(async (tx) => {
      // Update order
      let newStatus = 'OUT_FOR_DELIVERY'; // Retry
      if (triggerRTO) {
        newStatus = 'RETURN_INITIATED'; // Start RTO process
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          failed_delivery_attempts: failedAttempts,
          notes: `${order.notes || ''}\n[${now.toISOString()}] Failed delivery attempt #${failedAttempts}. Reason: ${reason}${triggerRTO ? ' → RTO initiated.' : ' → Will retry.'}`,
        },
      });

      // Update shipment
      if (order.shipment) {
        const shipmentStatus = triggerRTO ? 'RETURN_INITIATED' : 'OUT_FOR_DELIVERY';
        const updatedShipment = await tx.shipment.update({
          where: { id: order.shipment.id },
          data: {
            status: shipmentStatus,
            delhivery_last_status_update: now,
          },
        });
      }

      return { order: updatedOrder, triggerRTO };
    });

    return res.status(200).json({
      success: true,
      message: triggerRTO
        ? `Failed delivery recorded. RTO initiated after ${failedAttempts} attempts.`
        : `Failed delivery recorded. Will retry (attempt ${failedAttempts}/${maxAttempts}).`,
      order_id: orderId,
      order_status: result.order.status,
      failed_attempts: failedAttempts,
      rto_triggered: triggerRTO,
      recorded_at: now.toISOString(),
    });
  } catch (error) {
    console.error('Error handling failed delivery:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get COD verification status for a specific order
 * Used by delivery agent app / admin dashboard
 */
exports.getCODStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        shipment: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.paymentMethod !== 'COD') {
      return res.status(400).json({ error: 'Order is not COD' });
    }

    const codStatus = {
      order_id: orderId,
      payment_method: 'COD',
      order_status: order.status,
      cod_amount: order.totalAmount,
      customer_name: order.user.name,
      customer_phone: order.user.phone,
      delivery_address: order.shipping_address,
      otp_generated: !!order.payment?.cod_otp,
      otp_verified: !!order.payment?.cod_verified_at,
      otp_attempts: order.payment?.cod_attempts || 0,
      failed_delivery_attempts: order.failed_delivery_attempts || 0,
      delivery_notes: order.notes,
      created_at: order.created_at,
      expected_delivery: order.shipment?.estimated_delivery_date,
    };

    return res.status(200).json(codStatus);
  } catch (error) {
    console.error('Error fetching COD status:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * List all COD orders pending verification (for admin dashboard)
 */
exports.getPendingCODOrders = async (req, res) => {
  try {
    const { status = 'OUT_FOR_DELIVERY', limit = 20, offset = 0 } = req.query;

    const orders = await prisma.order.findMany({
      where: {
        paymentMethod: 'COD',
        status: status || 'OUT_FOR_DELIVERY',
      },
      include: {
        payment: true,
        shipment: true,
        user: { select: { id: true, name: true, phone: true, email: true } },
      },
      orderBy: { created_at: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.order.count({
      where: {
        paymentMethod: 'COD',
        status: status || 'OUT_FOR_DELIVERY',
      },
    });

    return res.status(200).json({
      data: orders,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error('Error fetching pending COD orders:', error);
    return res.status(500).json({ error: error.message });
  }
};
