// server/controllers/paymentController.js
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const axios = require('axios');
const { validateTransition } = require('../utils/orderTransitionGuard');
const prisma = new PrismaClient();
const PaytmChecksum = require('paytmchecksum');

// Paytm Configuration (from .env)
const PAYTM_MID = process.env.PAYTM_MID;
const PAYTM_KEY = process.env.PAYTM_MERCHANT_KEY;
const PAYTM_WEBSITE = process.env.PAYTM_WEBSITE || 'DEFAULT';
const PAYTM_CHANNEL_ID = process.env.PAYTM_CHANNEL_ID || 'WEB';
const PAYTM_INDUSTRY_TYPE = process.env.PAYTM_INDUSTRY_TYPE || 'Retail';
const PAYTM_INITIATE_URL = process.env.PAYTM_INITIATE_URL || 'https://securegw.paytm.in/theia/api/v1/initiateTransaction';
const PAYTM_VERIFY_URL = process.env.PAYTM_VERIFY_URL || 'https://securegw.paytm.in/v2/orders';

// // Helper: Generate checksum for Paytm
// function generateChecksum(data, salt) {
//   let str = '';
//   Object.keys(data)
//     .sort()
//     .forEach((key) => {
//       str += data[key] + '|';
//     });
//   str += salt;
//   return crypto.createHash('sha256').update(str).digest('hex');
// }

// // Helper: Validate Paytm checksum
// function validateChecksum(data, receivedChecksum, salt) {
//   const checksum = generateChecksum(data, salt);
//   return checksum === receivedChecksum;
// }

// Generate idempotency key for preventing duplicate orders
function generateIdempotencyKey(userId, items) {
  const itemStr = items.map((i) => `${i.id}:${i.quantity}`).join('|');
  const hash = crypto.createHash('md5').update(`${userId}:${itemStr}:${Date.now()}`).digest('hex');
  return hash;
}

// ============================================================================
// INITIATE PAYMENT (Create order with reserved stock, get Paytm token)
// ============================================================================
exports.initiatePayment = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, totalAmount } = req.body;
    const userId = req.user.id;

    if (paymentMethod !== 'PAYTM') {
      return res.status(400).json({ error: 'Invalid payment method for this endpoint' });
    }

    // Step 1: Validate items and compute totals from DB (server-side)
    let serverTotalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.id },
        include: { product: true, inventory: true }
      });

      if (!variant) {
        return res.status(400).json({ error: `Product variant ${item.id} not found` });
      }

      // Check inventory
      const availableQty = variant.inventory.quantity - variant.inventory.reserved_qty;
      if (availableQty < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${variant.product.title}. Available: ${availableQty}` 
        });
      }

      const price = Number(variant.price);
      serverTotalAmount += price * item.quantity;

      orderItemsData.push({
        variantId: variant.id,
        quantity: item.quantity,
        price: price
      });
    }

    // Add shipping
    const shippingCost = serverTotalAmount > 999 ? 0 : 99;
    const finalTotal = serverTotalAmount + shippingCost;

    // Validate frontend total matches server calculation
    if (Math.abs(finalTotal - totalAmount) > 0.01) {
      return res.status(400).json({ 
        error: 'Price mismatch detected. Please refresh and try again.' 
      });
    }

    // Step 2: Create order with PAYMENT_PENDING status and reservations
    const idempotencyKey = generateIdempotencyKey(userId, items);

    const result = await prisma.$transaction(async (prisma) => {
      // A. Create Order
      const order = await prisma.order.create({
        data: {
          userId,
          orderNumber: `ORD-${Date.now()}`,
          totalAmount: finalTotal,
          status: 'PAYMENT_PENDING',
          paymentMethod: 'PAYTM',
          shippingAddress: shippingAddress,
          idempotencyKey: idempotencyKey,
          items: {
            create: orderItemsData
          }
        }
      });

      // B. Create Payment record with PENDING status
      await prisma.payment.create({
        data: {
          orderId: order.id,
          method: 'PAYTM',
          amount: finalTotal,
          status: 'PENDING'
        }
      });

      // C. Create Reservations and update inventory reserved_qty
      for (const item of items) {
        // Create reservation record
        await prisma.reservation.create({
          data: {
            orderId: order.id,
            variantId: item.id,
            quantity: item.quantity,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30-minute hold
            status: 'ACTIVE'
          }
        });

        // Update inventory reserved quantity
        await prisma.inventory.update({
          where: { variantId: item.id },
          data: { reserved_qty: { increment: item.quantity } }
        });
      }

      return order;
    });

    // Step 3: Call Paytm Initiate Transaction API
    const orderId = result.id;
    const orderNumber = result.orderNumber;
    const txnAmount = String(Math.round(finalTotal * 100) / 100);

    const paytmData = {
      requestType: 'Payment',
      mid: PAYTM_MID,
      orderId: String(orderId),
      websiteName: PAYTM_WEBSITE,
      amount: txnAmount,
      redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout?orderId=${orderId}`,
      reference_no: orderNumber,
      extendedInfo: {
        udf1: String(userId) // Store user ID for reference
      }
    };

    // Generate checksum
    const checksum = generateChecksum(paytmData, PAYTM_KEY);
    paytmData.checksum = checksum;

    // Call Paytm API
    let txnToken;
    try {
      const paytmResponse = await axios.post(PAYTM_INITIATE_URL, paytmData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (paytmResponse.data.body && paytmResponse.data.body.txnToken) {
        txnToken = paytmResponse.data.body.txnToken;
        
        // Store Paytm response in payment record for auditing
        await prisma.payment.update({
          where: { orderId: orderId },
          data: {
            gateway_response: paytmResponse.data
          }
        });
      } else {
        throw new Error('Failed to get txnToken from Paytm');
      }
    } catch (error) {
      console.error('Paytm API error:', error);
      
      // Rollback: Cancel the order if Paytm fails
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAYMENT_FAILED' }
      });

      return res.status(500).json({ 
        error: 'Payment gateway initialization failed. Please try again.' 
      });
    }

    res.status(200).json({
      status: 'success',
      orderId: orderId,
      orderNumber: orderNumber,
      txnToken: txnToken,
      amount: txnAmount,
      message: 'Payment initiated successfully. Proceed to Paytm.'
    });

  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// VERIFY PAYMENT (Verify Paytm transaction and finalize order)
// ============================================================================
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId, txnToken, response } = req.body;
    const userId = req.user.id;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Fetch the order
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: { payment: true, items: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Verify against Paytm API
    let paytmResponse;
    try {
      const verifyUrl = `${PAYTM_VERIFY_URL}/${order.orderNumber}`;
      paytmResponse = await axios.get(verifyUrl, {
        headers: {
          'x-mid': PAYTM_MID,
          'x-request-id': `${Date.now()}`
        }
      });
    } catch (error) {
      console.error('Paytm verification API error:', error);
      
      return res.status(400).json({ 
        error: 'Payment verification failed',
        status: 'failed'
      });
    }

    // Check payment status from Paytm
    if (paytmResponse.data.body && paytmResponse.data.body.resultInfo) {
      const resultInfo = paytmResponse.data.body.resultInfo;
      
      if (resultInfo.resultStatus === 'TXN_SUCCESS') {
        // Payment was successful - finalize the order
        const result = await prisma.$transaction(async (prisma) => {
          // Validate transition PAYMENT_PENDING -> PAID
          validateTransition(order.status, 'PAID');
          
          // Update payment status
          await prisma.payment.update({
            where: { orderId: order.id },
            data: {
              status: 'COMPLETED',
              paytm_status: 'TXN_SUCCESS',
              paytm_txn_id: paytmResponse.data.body.txnId,
              gateway_response: paytmResponse.data
            }
          });

          // Update order status to PAID
          const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: { status: 'PAID' }
          });

          // Convert reservations to finalized (permanent inventory deduction)
          const reservations = await prisma.reservation.findMany({
            where: { orderId: order.id, status: 'ACTIVE' }
          });

          for (const reservation of reservations) {
            // Mark reservation as finalized
            await prisma.reservation.update({
              where: { id: reservation.id },
              data: { status: 'FINALIZED' }
            });

            // Permanently decrement inventory
            await prisma.inventory.update({
              where: { variantId: reservation.variantId },
              data: {
                quantity: { decrement: reservation.quantity },
                reserved_qty: { decrement: reservation.quantity }
              }
            });
          }

          return updatedOrder;
        });

        return res.status(200).json({
          status: 'success',
          orderId: order.id,
          orderNumber: order.orderNumber,
          message: 'Payment verified and order confirmed',
          order: result
        });

      } else if (resultInfo.resultStatus === 'TXN_FAILED') {
        // Payment failed - release reservations
        await prisma.$transaction(async (prisma) => {
          // Update payment status
          await prisma.payment.update({
            where: { orderId: order.id },
            data: {
              status: 'FAILED',
              paytm_status: resultInfo.resultStatus,
              gateway_response: paytmResponse.data
            }
          });

          // Update order status
          await prisma.order.update({
            where: { id: order.id },
            data: { status: 'PAYMENT_FAILED' }
          });

          // Release all reservations
          const reservations = await prisma.reservation.findMany({
            where: { orderId: order.id, status: 'ACTIVE' }
          });

          for (const reservation of reservations) {
            await prisma.reservation.update({
              where: { id: reservation.id },
              data: { status: 'RELEASED' }
            });

            await prisma.inventory.update({
              where: { variantId: reservation.variantId },
              data: { reserved_qty: { decrement: reservation.quantity } }
            });
          }
        });

        return res.status(400).json({
          status: 'failed',
          orderId: order.id,
          message: resultInfo.resultMsg || 'Payment failed',
          order: order
        });

      } else if (resultInfo.resultStatus === 'PENDING') {
        // Payment is still pending
        return res.status(200).json({
          status: 'pending',
          orderId: order.id,
          message: 'Payment verification is in progress. Please wait.',
          order: order
        });
      }
    }

    return res.status(400).json({ 
      error: 'Invalid response from payment gateway',
      status: 'failed'
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// PAYTM WEBHOOK (Server-to-server callback from Paytm)
// ============================================================================
exports.paytmWebhook = async (req, res) => {
  try {
    const data = req.body;

    // Verify checksum
    const receivedChecksum = data.checksum;
    const checksum = generateChecksum(data, PAYTM_KEY);

    if (checksum !== receivedChecksum) {
      console.error('Invalid checksum in webhook');
      return res.status(403).json({ error: 'Invalid checksum' });
    }

    const orderId = parseInt(data.orderId);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update payment based on response
    if (data.resultInfo && data.resultInfo.resultStatus === 'TXN_SUCCESS') {
      await prisma.$transaction(async (prisma) => {
        // Validate transition
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        validateTransition(order.status, 'PAID');
        
        // Update payment
        await prisma.payment.update({
          where: { orderId: orderId },
          data: {
            status: 'COMPLETED',
            paytm_status: 'TXN_SUCCESS',
            paytm_txn_id: data.txnId,
            gateway_response: data
          }
        });

        // Update order
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: { status: 'PAID' }
        });

        // Finalize reservations and decrement inventory
        const reservations = await prisma.reservation.findMany({
          where: { orderId: orderId, status: 'ACTIVE' }
        });

        for (const reservation of reservations) {
          await prisma.reservation.update({
            where: { id: reservation.id },
            data: { status: 'FINALIZED' }
          });

          await prisma.inventory.update({
            where: { variantId: reservation.variantId },
            data: {
              quantity: { decrement: reservation.quantity },
              reserved_qty: { decrement: reservation.quantity }
            }
          });
        }
      });
    } else if (data.resultInfo && data.resultInfo.resultStatus === 'TXN_FAILED') {
      await prisma.$transaction(async (prisma) => {
        await prisma.payment.update({
          where: { orderId: orderId },
          data: {
            status: 'FAILED',
            paytm_status: data.resultInfo.resultStatus,
            gateway_response: data
          }
        });

        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'PAYMENT_FAILED' }
        });

        // Release reservations
        const reservations = await prisma.reservation.findMany({
          where: { orderId: orderId, status: 'ACTIVE' }
        });

        for (const reservation of reservations) {
          await prisma.reservation.update({
            where: { id: reservation.id },
            data: { status: 'RELEASED' }
          });

          await prisma.inventory.update({
            where: { variantId: reservation.variantId },
            data: { reserved_qty: { decrement: reservation.quantity } }
          });
        }
      });
    }

    res.status(200).json({ message: 'Webhook processed successfully' });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
};
