const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const crypto = require('crypto');

/**
 * Refund Controller - Handles payment refunds for returns/cancellations
 * - Paytm refund API integration for prepaid orders
 * - COD refund tracking (manual/bank transfer)
 * - Refund status tracking
 * - Dispute handling
 */

// Paytm Configuration
const PAYTM_MERCHANT_ID = process.env.PAYTM_MERCHANT_ID;
const PAYTM_MERCHANT_KEY = process.env.PAYTM_MERCHANT_KEY;
const PAYTM_REFUND_API_URL = process.env.PAYTM_REFUND_API_URL || 'https://securegw.paytm.in/refund/apply';
const PAYTM_REFUND_STATUS_URL = process.env.PAYTM_REFUND_STATUS_URL || 'https://securegw.paytm.in/refund/status';

/**
 * Helper: Generate Paytm checksum for refund request
 */
function generateRefundChecksum(data, salt) {
  const saltedData = data.concat(':').concat(salt);
  const hash = crypto.createHash('sha256').update(saltedData).digest('hex');
  return hash;
}

/**
 * Initiate refund for Paytm orders
 * Called after return is accepted or order is cancelled
 */
exports.initiateRefund = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: { payment: true, return: { where: { status: 'RETURNED' } } },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Only prepaid (Paytm) orders can be refunded
    if (order.paymentMethod !== 'PAYTM') {
      return res.status(400).json({
        error: `Cannot refund ${order.paymentMethod} orders. This endpoint is for Paytm refunds only.`,
      });
    }

    // Order must be returned or cancelled
    if (!['RETURNED', 'CANCELLED'].includes(order.status)) {
      return res.status(400).json({
        error: `Cannot refund order with status: ${order.status}. Order must be RETURNED or CANCELLED.`,
      });
    }

    // Check if refund already initiated
    if (order.payment?.refund_txn_id) {
      return res.status(400).json({
        error: 'Refund already initiated for this order',
        refund_txn_id: order.payment.refund_txn_id,
        refunded_amount: order.payment.refund_amount,
      });
    }

    // Get refund amount from return request if exists
    let refundAmount = order.totalAmount;
    if (order.return && order.return.length > 0) {
      refundAmount = order.return[0].approvedRefundAmount || order.totalAmount;
    }

    // Generate refund transaction ID
    const refundTxnId = `REFUND-${order.orderNumber}-${Date.now()}`;

    // Build Paytm refund payload
    const paytmRefundData = {
      MID: PAYTM_MERCHANT_ID,
      ORDERID: order.orderNumber,
      REFUNDID: refundTxnId,
      REFUNDAMOUNT: refundAmount.toString(),
      TXN_ID: order.payment?.paytm_txn_id,
    };

    // Generate checksum
    const checksum = generateRefundChecksum(
      Object.keys(paytmRefundData)
        .sort()
        .map(key => `${key}=${paytmRefundData[key]}`)
        .join('&'),
      PAYTM_MERCHANT_KEY
    );

    paytmRefundData.CHECKSUM = checksum;

    // Call Paytm Refund API
    let paytmResponse;
    try {
      const response = await axios.post(PAYTM_REFUND_API_URL, paytmRefundData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      paytmResponse = response.data;

      // Check Paytm response status
      if (paytmResponse.STATUS !== 'SUCCESS') {
        return res.status(400).json({
          error: 'Paytm refund request failed',
          paytm_status: paytmResponse.STATUS,
          paytm_message: paytmResponse.MESSAGE,
        });
      }
    } catch (error) {
      console.error('Paytm refund API error:', error);
      return res.status(500).json({
        error: 'Failed to call Paytm refund API',
        details: error.message,
      });
    }

    const now = new Date();

    // Update payment record
    const updatedPayment = await prisma.payment.update({
      where: { orderId: parseInt(orderId) },
      data: {
        refund_txn_id: refundTxnId,
        refund_amount: refundAmount,
        refunded_at: now,
        status: 'REFUNDED',
      },
    });

    // Log refund in payment's gateway_response
    await prisma.payment.update({
      where: { id: updatedPayment.id },
      data: {
        gateway_response: {
          ...JSON.parse(updatedPayment.gateway_response || '{}'),
          refund: {
            initiated_at: now.toISOString(),
            refund_txn_id: refundTxnId,
            paytm_response: paytmResponse,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Refund initiated successfully',
      order_id: orderId,
      refund_txn_id: refundTxnId,
      refund_amount: refundAmount,
      paytm_status: paytmResponse.STATUS,
      initiated_at: now.toISOString(),
    });
  } catch (error) {
    console.error('Error initiating refund:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Check refund status with Paytm
 */
exports.checkRefundStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: { payment: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.payment?.refund_txn_id) {
      return res.status(400).json({
        error: 'No refund initiated for this order',
      });
    }

    // Build Paytm status check payload
    const statusData = {
      MID: PAYTM_MERCHANT_ID,
      ORDERID: order.orderNumber,
      REFUNDID: order.payment.refund_txn_id,
    };

    // Generate checksum
    const checksum = generateRefundChecksum(
      Object.keys(statusData)
        .sort()
        .map(key => `${key}=${statusData[key]}`)
        .join('&'),
      PAYTM_MERCHANT_KEY
    );

    statusData.CHECKSUM = checksum;

    // Call Paytm Status API
    let paytmResponse;
    try {
      const response = await axios.post(PAYTM_REFUND_STATUS_URL, statusData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      paytmResponse = response.data;
    } catch (error) {
      console.error('Paytm status check error:', error);
      return res.status(500).json({
        error: 'Failed to check refund status with Paytm',
        details: error.message,
      });
    }

    // If status is COMPLETE or REFUNDED, update our records
    if (['COMPLETE', 'REFUNDED'].includes(paytmResponse.STATUS)) {
      await prisma.payment.update({
        where: { orderId: parseInt(orderId) },
        data: { status: 'REFUNDED' },
      });
    }

    return res.status(200).json({
      order_id: orderId,
      refund_txn_id: order.payment.refund_txn_id,
      refund_amount: order.payment.refund_amount,
      paytm_status: paytmResponse.STATUS,
      paytm_message: paytmResponse.MESSAGE,
      refunded_at: order.payment.refunded_at,
    });
  } catch (error) {
    console.error('Error checking refund status:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Initiate COD refund (manual bank transfer)
 * Admin marks COD refund as initiated
 */
exports.initiateCODRefund = async (req, res) => {
  try {
    const { orderId, bankDetails } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: { payment: true, user: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Only COD orders
    if (order.paymentMethod !== 'COD') {
      return res.status(400).json({
        error: `Cannot process COD refund for ${order.paymentMethod} orders`,
      });
    }

    // Must be returned or cancelled
    if (!['RETURNED', 'CANCELLED'].includes(order.status)) {
      return res.status(400).json({
        error: `Cannot refund order with status: ${order.status}`,
      });
    }

    // Check if refund already initiated
    if (order.payment?.refund_txn_id) {
      return res.status(400).json({
        error: 'Refund already initiated for this order',
      });
    }

    const now = new Date();
    const refundTxnId = `REFUND-COD-${order.orderNumber}-${Date.now()}`;

    // Update payment record
    await prisma.payment.update({
      where: { orderId: parseInt(orderId) },
      data: {
        refund_txn_id: refundTxnId,
        refund_amount: order.totalAmount,
        refunded_at: now,
        status: 'REFUNDED',
        gateway_response: {
          refund_type: 'COD_MANUAL_BANK_TRANSFER',
          bank_details: bankDetails,
          initiated_at: now.toISOString(),
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: 'COD refund initiated. Amount will be transferred to customer bank account.',
      order_id: orderId,
      refund_txn_id: refundTxnId,
      refund_amount: order.totalAmount,
      customer_bank_account: bankDetails?.account_number ? `****${bankDetails.account_number.slice(-4)}` : 'N/A',
      initiated_at: now.toISOString(),
    });
  } catch (error) {
    console.error('Error initiating COD refund:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get refund history/details
 */
exports.getRefundDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: { payment: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.payment?.refund_txn_id) {
      return res.status(404).json({
        error: 'No refund found for this order',
      });
    }

    return res.status(200).json({
      order_id: orderId,
      payment_method: order.paymentMethod,
      refund_txn_id: order.payment.refund_txn_id,
      refund_amount: order.payment.refund_amount,
      status: order.payment.status,
      refunded_at: order.payment.refunded_at,
      initiated_at: order.payment.refund_txn_id ? order.payment.refunded_at : null,
    });
  } catch (error) {
    console.error('Error fetching refund details:', error);
    return res.status(500).json({ error: error.message });
  }
};
