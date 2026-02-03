// server/controllers/paymentController.js
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { validateTransition } = require('../utils/orderTransitionGuard');
const paytmService = require('../services/paytmService');
const prisma = new PrismaClient();

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
    const user = req.user; // Assuming req.user contains email/phone

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

    // Step 3: Call Paytm Initiate Transaction API using Service
    const orderId = result.id;
    const orderNumber = result.orderNumber;
    const txnAmount = String(Math.round(finalTotal * 100) / 100);

    // Provide default email/phone if missing (Dev mode fallback)
    const customerId = `CUST-${userId}`;
    const customerEmail = user.email || 'customer@example.com';
    const customerPhone = user.phone || '9999999999';

    try {
      const paytmResponse = await paytmService.initiateTransaction(
        orderNumber, // Pass OrderNumber as Paytm's OrderId
        txnAmount,
        customerId,
        customerEmail,
        customerPhone
      );

      if (paytmResponse.body && paytmResponse.body.txnToken) {
        const txnToken = paytmResponse.body.txnToken;

        // Store Paytm response in payment record for auditing
        await prisma.payment.update({
          where: { orderId: orderId },
          data: {
            gateway_response: paytmResponse,
            paytm_txn_token: txnToken
          }
        });

        res.status(200).json({
          status: 'success',
          orderId: orderId,
          orderNumber: orderNumber,
          txnToken: txnToken,
          amount: txnAmount,
          mid: paytmService.mid, // Send MID to frontend for invoking checkout
          message: 'Payment initiated successfully. Proceed to Paytm.'
        });
      } else {
        throw new Error(paytmResponse.body?.resultInfo?.resultMsg || 'Failed to get txnToken from Paytm');
      }
    } catch (error) {
      console.error('Paytm API error:', error);

      // Rollback: Cancel the order if Paytm fails
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAYMENT_FAILED' }
      });

      return res.status(500).json({
        error: 'Payment gateway initialization failed. Please try again.',
        details: error.message
      });
    }

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
    const { orderId } = req.body;
    const userId = req.user.id;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Fetch the order
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: { payment: true }
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
      paytmResponse = await paytmService.getTxnStatus(order.orderNumber);
    } catch (error) {
      console.error('Paytm verification API error:', error);
      return res.status(400).json({
        error: 'Payment verification failed',
        status: 'failed'
      });
    }

    // Check payment status from Paytm
    if (paytmResponse.body && paytmResponse.body.resultInfo) {
      const resultInfo = paytmResponse.body.resultInfo;
      const body = paytmResponse.body;

      if (resultInfo.resultStatus === 'TXN_SUCCESS') {
        // Payment was successful - finalize the order
        const result = await prisma.$transaction(async (prisma) => {
          // Validate transition PAYMENT_PENDING -> PAID
          // Only validate if not already paid (idempotency)
          if (order.status !== 'PAID') {
            validateTransition(order.status, 'PAID');
          }

          // Update payment status
          await prisma.payment.update({
            where: { orderId: order.id },
            data: {
              status: 'COMPLETED',
              paytm_status: 'TXN_SUCCESS',
              paytm_txn_id: body.txnId,
              paytm_payment_mode: body.paymentMode,
              paytm_bank_txn_id: body.bankTxnId,
              gateway_response: paytmResponse
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
              gateway_response: paytmResponse
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
    const data = req.body; // Incoming Form Data usually, but simpler if JSON

    // Paytm sends checksum in CHECKSUMHASH or checksum param
    const receivedChecksum = data.CHECKSUMHASH || data.checksum;

    if (!receivedChecksum) {
      return res.status(400).send("Checksum missing");
    }

    // Remove checksum from params for verification
    const params = {};
    Object.keys(data).forEach(key => {
      if (key !== "CHECKSUMHASH" && key !== "checksum") {
        params[key] = data[key];
      }
    });

    const isValid = await paytmService.validateChecksum(params, receivedChecksum);

    if (!isValid) {
      console.error('Invalid checksum in webhook');
      // For security, just send 200 OK so Paytm doesn't retry infinitely if it's junk
      return res.status(200).send("Invalid Checksum");
    }

    const orderNumber = data.ORDERID;
    const order = await prisma.order.findUnique({
      where: { orderNumber: orderNumber },
      include: { payment: true }
    });

    if (!order) {
      return res.status(200).send("Order Not Found");
    }

    // Avoid re-processing if already completed
    if (order.status === 'PAID') {
      return res.status(200).send("Already Processed");
    }

    // Process status map
    if (data.STATUS === 'TXN_SUCCESS') {
      await prisma.$transaction(async (prisma) => {
        // Update payment
        await prisma.payment.update({
          where: { orderId: order.id },
          data: {
            status: 'COMPLETED',
            paytm_status: 'TXN_SUCCESS',
            paytm_txn_id: data.TXNID,
            paytm_payment_mode: data.PAYMENTMODE,
            paytm_bank_txn_id: data.BANKTXNID,
            gateway_response: data
          }
        });

        // Update order
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'PAID' }
        });

        // Finalize reservations
        const reservations = await prisma.reservation.findMany({
          where: { orderId: order.id, status: 'ACTIVE' }
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
    } else if (data.STATUS === 'TXN_FAILURE') {
      await prisma.$transaction(async (prisma) => {
        await prisma.payment.update({
          where: { orderId: order.id },
          data: {
            status: 'FAILED',
            paytm_status: 'TXN_FAILURE',
            gateway_response: data
          }
        });
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'PAYMENT_FAILED' }
        });
        // Release reservations
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
    }

    res.status(200).send('TXT_SUCCESS');

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send("Error");
  }
};

