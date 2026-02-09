const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const nodemailer = require('nodemailer');

/**
 * Notifications Controller - Email, SMS, and Push Notifications
 * Handles customer and order notifications for all lifecycle events
 */

// Email Configuration (update with your SMTP)
const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Send order confirmation email
 */
exports.sendOrderConfirmation = async (orderId) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: { variant: true },
        },
      },
    });

    if (!order) return false;

    const emailContent = `
      <h2>Order Confirmed!</h2>
      <p>Thank you for your order, ${order.user.name}!</p>
      
      <h3>Order Details</h3>
      <p><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
      <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
      
      <h3>Items Ordered</h3>
      <ul>
        ${order.items.map((item) => `<li>Variant #${item.variantId} x ${item.quantity}</li>`).join('')}
      </ul>
      
      <p>Track your order at: <a href="${process.env.FRONTEND_URL}/order/${order.id}">View Order</a></p>
    `;

    await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@comfortclothing.com',
      to: order.user.email,
      subject: `Order Confirmation - ${order.orderNumber}`,
      html: emailContent,
    });

    return true;
  } catch (error) {
    console.error('Error sending order confirmation:', error);
    return false;
  }
};

/**
 * Send shipment notification
 */
exports.sendShipmentNotification = async (shipmentId) => {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        order: {
          include: { user: true },
        },
      },
    });

    if (!shipment) return false;

    const emailContent = `
      <h2>Your Order Has Shipped!</h2>
      <p>Hi ${shipment.order.user.name},</p>
      
      <p>Your order ${shipment.order.orderNumber} has been picked up and is on the way!</p>
      
      <h3>Shipping Details</h3>
      <p><strong>Courier:</strong> ${shipment.courier_provider}</p>
      <p><strong>Waybill:</strong> ${shipment.waybill}</p>
      <p><strong>Status:</strong> ${shipment.status}</p>
      ${shipment.estimated_delivery ? `<p><strong>Estimated Delivery:</strong> ${new Date(shipment.estimated_delivery).toLocaleDateString()}</p>` : ''}
      
      <p>Track your shipment at: <a href="${process.env.FRONTEND_URL}/order/${shipment.orderId}">Track Order</a></p>
    `;

    await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@comfortclothing.com',
      to: shipment.order.user.email,
      subject: `Shipment Notification - ${shipment.order.orderNumber}`,
      html: emailContent,
    });

    return true;
  } catch (error) {
    console.error('Error sending shipment notification:', error);
    return false;
  }
};

/**
 * Send delivery notification
 */
exports.sendDeliveryNotification = async (orderId) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, shipments: true },
    });

    if (!order) return false;

    const emailContent = `
      <h2>Order Delivered!</h2>
      <p>Hi ${order.user.name},</p>
      
      <p>Great news! Your order ${order.orderNumber} has been delivered successfully.</p>
      
      <h3>Order Details</h3>
      <p><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p><strong>Delivered Date:</strong> ${order.shipments?.[0]?.delivered_at ? new Date(order.shipments[0].delivered_at).toLocaleDateString() : 'N/A'}</p>
      <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
      
      <p>If you're not satisfied with your purchase, you can return it within 14 days.</p>
      <p><a href="${process.env.FRONTEND_URL}/return/${order.id}">Initiate Return</a></p>
      
      <p>Thank you for shopping with us!</p>
    `;

    await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@comfortclothing.com',
      to: order.user.email,
      subject: `Order Delivered - ${order.orderNumber}`,
      html: emailContent,
    });

    return true;
  } catch (error) {
    console.error('Error sending delivery notification:', error);
    return false;
  }
};

/**
 * Send refund notification
 */
exports.sendRefundNotification = async (orderId) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        payment: true,
      },
    });

    if (!order) return false;

    const emailContent = `
      <h2>Refund Processed!</h2>
      <p>Hi ${order.user.name},</p>
      
      <p>Your refund has been successfully processed.</p>
      
      <h3>Refund Details</h3>
      <p><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p><strong>Refund Amount:</strong> ₹${order.payment?.refund_amount}</p>
      <p><strong>Refund Status:</strong> ${order.payment?.status}</p>
      <p><strong>Refunded Date:</strong> ${new Date(order.payment?.refunded_at).toLocaleDateString()}</p>
      
      <p>The refund has been credited to your original payment method.</p>
      <p>It may take 3-5 business days to appear in your account.</p>
      
      <p>Thank you for your patience!</p>
    `;

    await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@comfortclothing.com',
      to: order.user.email,
      subject: `Refund Processed - ${order.orderNumber}`,
      html: emailContent,
    });

    return true;
  } catch (error) {
    console.error('Error sending refund notification:', error);
    return false;
  }
};

/**
 * Get user notifications
 */
exports.getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    let { page = 1, limit = 20 } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 20;
    const skip = (page - 1) * limit;

    // For now, fetch from order and return logs
    const orders = await prisma.order.findMany({
      where: { userId: parseInt(userId) },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        createdAt: true,
        createdAt: true,
        shipments: { select: { delivered_at: true } },
      },
      skip: skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    });

    const notifications = orders.map((order) => ({
      id: order.id,
      type: 'ORDER',
      title: `Order ${order.orderNumber}`,
      message: getOrderStatusMessage(order.status),
      timestamp: order.status === 'DELIVERED' ? order.shipments?.[0]?.delivered_at : order.createdAt,
      read: false,
    }));

    const total = await prisma.order.count({
      where: { userId: parseInt(userId) },
    });

    return res.status(200).json({
      success: true,
      notifications,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Helper: Get order status message
 */
function getOrderStatusMessage(status) {
  const messages = {
    CREATED: 'Order placed successfully',
    PAYMENT_PENDING: 'Waiting for payment',
    PAID: 'Payment received',
    READY_TO_PICK: 'Order ready for pickup',
    PICKED_UP: 'Order picked up',
    IN_TRANSIT: 'Order in transit',
    OUT_FOR_DELIVERY: 'Out for delivery today',
    DELIVERED: 'Order delivered',
    CANCELLED: 'Order cancelled',
    RETURN_REQUESTED: 'Return request received',
    RETURN_IN_TRANSIT: 'Return in transit',
    RETURNED: 'Return completed',
  };
  return messages[status] || 'Order status updated';
}

/**
 * Mark notification as read
 */
exports.markNotificationRead = async (req, res) => {
  try {
    const { orderId } = req.params;

    await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: { notes: 'Notification read' },
    });

    return res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Send test email
 */
exports.sendTestEmail = async (req, res) => {
  try {
    const { email } = req.body;

    await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@comfortclothing.com',
      to: email,
      subject: 'Test Email from Comfort Clothing',
      html: '<h2>Test Email</h2><p>This is a test email from Comfort Clothing platform.</p>',
    });

    return res.status(200).json({ success: true, message: 'Test email sent' });
  } catch (error) {
    console.error('Error sending test email:', error);
    return res.status(500).json({ error: error.message });
  }
};
