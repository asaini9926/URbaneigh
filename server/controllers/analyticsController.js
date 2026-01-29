const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Analytics Controller - Order metrics, revenue trends, return analysis, customer insights
 * Handles all analytics and reporting for admin dashboard
 */

/**
 * Get order metrics for a given period
 * period: 'daily' | 'weekly' | 'monthly'
 */
exports.getOrderMetrics = async (req, res) => {
  try {
    const { period = 'daily', days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      include: { items: true, payment: true },
    });

    if (!orders.length) {
      return res.status(200).json({
        success: true,
        metrics: {
          total_orders: 0,
          total_revenue: 0,
          avg_order_value: 0,
          orders_by_status: {},
          order_trend: [],
        },
      });
    }

    // Calculate metrics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const avgOrderValue = totalRevenue / totalOrders;

    // Orders by status
    const ordersByStatus = {};
    orders.forEach((order) => {
      ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
    });

    // Daily trend
    const orderTrend = [];
    for (let i = parseInt(days); i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayOrders = orders.filter((o) => {
        const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
        return orderDate === dateStr;
      });

      orderTrend.push({
        date: dateStr,
        orders: dayOrders.length,
        revenue: dayOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      });
    }

    return res.status(200).json({
      success: true,
      metrics: {
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        avg_order_value: avgOrderValue,
        orders_by_status: ordersByStatus,
        order_trend: orderTrend,
      },
    });
  } catch (error) {
    console.error('Error fetching order metrics:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get return analytics
 */
exports.getReturnAnalytics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
      },
    });

    const returns = await prisma.return.findMany({
      where: {
        createdAt: { gte: startDate },
      },
    });

    const refunds = await prisma.refund.findMany({
      where: {
        createdAt: { gte: startDate },
      },
    });

    const totalOrders = orders.length;
    const totalReturns = returns.length;
    const returnRate = totalOrders > 0 ? (totalReturns / totalOrders * 100).toFixed(2) : 0;

    // Return reasons breakdown
    const reasonCounts = {};
    returns.forEach((ret) => {
      reasonCounts[ret.reason] = (reasonCounts[ret.reason] || 0) + 1;
    });

    // Return status breakdown
    const statusCounts = {};
    returns.forEach((ret) => {
      statusCounts[ret.status] = (statusCounts[ret.status] || 0) + 1;
    });

    // Refund metrics
    const totalRefundAmount = refunds.reduce((sum, r) => sum + r.refund_amount, 0);
    const avgRefundAmount = refunds.length > 0 ? totalRefundAmount / refunds.length : 0;

    // Return trend
    const returnTrend = [];
    for (let i = parseInt(days); i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayReturns = returns.filter((r) => {
        const returnDate = new Date(r.createdAt).toISOString().split('T')[0];
        return returnDate === dateStr;
      });

      returnTrend.push({
        date: dateStr,
        returns: dayReturns.length,
        refund_amount: dayReturns.reduce((sum, r) => sum + (r.estimatedRefundAmount || 0), 0),
      });
    }

    return res.status(200).json({
      success: true,
      analytics: {
        total_orders: totalOrders,
        total_returns: totalReturns,
        return_rate: returnRate,
        return_reasons: reasonCounts,
        return_status_breakdown: statusCounts,
        total_refund_amount: totalRefundAmount,
        avg_refund_amount: avgRefundAmount.toFixed(2),
        return_trend: returnTrend,
      },
    });
  } catch (error) {
    console.error('Error fetching return analytics:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get customer insights
 */
exports.getCustomerInsights = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // New customers
    const newCustomers = await prisma.user.count({
      where: {
        createdAt: { gte: startDate },
      },
    });

    // All users
    const totalCustomers = await prisma.user.count();

    // Customers with orders
    const customersWithOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      distinct: ['userId'],
      select: { userId: true },
    });

    // Repeat customers (more than 1 order in period)
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
      },
    });

    const ordersByUser = {};
    orders.forEach((order) => {
      ordersByUser[order.userId] = (ordersByUser[order.userId] || 0) + 1;
    });

    const repeatCustomers = Object.values(ordersByUser).filter((count) => count > 1).length;

    // Average order value per customer
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const avgOrderValuePerCustomer = customersWithOrders.length > 0 
      ? (totalRevenue / customersWithOrders.length).toFixed(2) 
      : 0;

    // Customer lifetime value (all time)
    const allTimeOrders = await prisma.order.findMany({});
    const totalAllTimeRevenue = allTimeOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const customerLTV = totalCustomers > 0 
      ? (totalAllTimeRevenue / totalCustomers).toFixed(2) 
      : 0;

    // Payment method preference
    const payments = await prisma.payment.findMany({
      where: {
        createdAt: { gte: startDate },
      },
    });

    const paymentMethodCounts = {};
    payments.forEach((payment) => {
      const method = payment.payment_method || 'UNKNOWN';
      paymentMethodCounts[method] = (paymentMethodCounts[method] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      insights: {
        total_customers: totalCustomers,
        new_customers: newCustomers,
        customers_with_orders: customersWithOrders.length,
        repeat_customers: repeatCustomers,
        avg_order_value_per_customer: avgOrderValuePerCustomer,
        customer_lifetime_value: customerLTV,
        total_revenue: totalRevenue,
        payment_method_preference: paymentMethodCounts,
      },
    });
  } catch (error) {
    console.error('Error fetching customer insights:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get payment method analytics
 */
exports.getPaymentAnalytics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const payments = await prisma.payment.findMany({
      where: {
        createdAt: { gte: startDate },
      },
    });

    // Payment method breakdown
    const methodCounts = {};
    const methodRevenue = {};
    let totalRevenue = 0;
    let successfulPayments = 0;
    let failedPayments = 0;

    payments.forEach((payment) => {
      const method = payment.payment_method || 'UNKNOWN';
      const amount = payment.amount || 0;

      methodCounts[method] = (methodCounts[method] || 0) + 1;
      methodRevenue[method] = (methodRevenue[method] || 0) + amount;
      totalRevenue += amount;

      if (payment.status === 'SUCCESS') {
        successfulPayments += 1;
      } else if (payment.status === 'FAILED') {
        failedPayments += 1;
      }
    });

    const successRate = payments.length > 0 
      ? (successfulPayments / payments.length * 100).toFixed(2) 
      : 0;

    return res.status(200).json({
      success: true,
      analytics: {
        total_payments: payments.length,
        total_revenue: totalRevenue,
        successful_payments: successfulPayments,
        failed_payments: failedPayments,
        success_rate: successRate,
        payment_method_breakdown: {
          counts: methodCounts,
          revenue: methodRevenue,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching payment analytics:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get settlement/COD analytics
 */
exports.getSettlementAnalytics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const codRemittances = await prisma.cODRemittance.findMany({
      where: {
        createdAt: { gte: startDate },
      },
    });

    const reconciliationAlerts = await prisma.reconciliationAlert.findMany({
      where: {
        createdAt: { gte: startDate },
      },
    });

    // Settlement metrics
    const totalPending = codRemittances.filter((r) => r.status === 'PENDING').length;
    const totalSettled = codRemittances.filter((r) => r.status === 'SETTLED').length;
    const totalMismatches = reconciliationAlerts.length;
    const resolvedMismatches = reconciliationAlerts.filter((a) => a.status === 'RESOLVED').length;

    const totalRemittanceAmount = codRemittances.reduce((sum, r) => sum + r.amount, 0);
    const settledAmount = codRemittances
      .filter((r) => r.status === 'SETTLED')
      .reduce((sum, r) => sum + r.amount, 0);

    const settlementRate = codRemittances.length > 0 
      ? (totalSettled / codRemittances.length * 100).toFixed(2) 
      : 0;

    const resolutionRate = totalMismatches > 0 
      ? (resolvedMismatches / totalMismatches * 100).toFixed(2) 
      : 0;

    return res.status(200).json({
      success: true,
      analytics: {
        total_remittances: codRemittances.length,
        pending_remittances: totalPending,
        settled_remittances: totalSettled,
        settlement_rate: settlementRate,
        total_remittance_amount: totalRemittanceAmount,
        settled_amount: settledAmount,
        pending_amount: totalRemittanceAmount - settledAmount,
        total_mismatches: totalMismatches,
        resolved_mismatches: resolvedMismatches,
        unresolved_mismatches: totalMismatches - resolvedMismatches,
        mismatch_resolution_rate: resolutionRate,
      },
    });
  } catch (error) {
    console.error('Error fetching settlement analytics:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get KPI summary
 */
exports.getKPISummary = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Orders
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: startDate } },
    });

    // Customers
    const newCustomers = await prisma.user.count({
      where: { createdAt: { gte: startDate } },
    });

    const totalCustomers = await prisma.user.count();

    // Returns
    const returns = await prisma.return.findMany({
      where: { createdAt: { gte: startDate } },
    });

    // Payments
    const payments = await prisma.payment.findMany({
      where: { createdAt: { gte: startDate } },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const avgOrderValue = orders.length > 0 ? (totalRevenue / orders.length).toFixed(2) : 0;
    const returnRate = orders.length > 0 ? (returns.length / orders.length * 100).toFixed(2) : 0;
    const paymentSuccessRate = payments.length > 0 
      ? (payments.filter((p) => p.status === 'SUCCESS').length / payments.length * 100).toFixed(2) 
      : 0;

    return res.status(200).json({
      success: true,
      kpis: {
        period_days: parseInt(days),
        total_orders: orders.length,
        total_revenue: totalRevenue,
        avg_order_value: avgOrderValue,
        new_customers: newCustomers,
        total_customers: totalCustomers,
        return_rate: returnRate,
        payment_success_rate: paymentSuccessRate,
        pending_returns: returns.filter((r) => r.status === 'RETURN_REQUESTED').length,
      },
    });
  } catch (error) {
    console.error('Error fetching KPI summary:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Export analytics report as CSV
 */
exports.exportReport = async (req, res) => {
  try {
    const { reportType = 'orders', days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    let csvContent = '';

    if (reportType === 'orders') {
      const orders = await prisma.order.findMany({
        where: { createdAt: { gte: startDate } },
        include: { user: true },
      });

      csvContent = 'Order ID,Order Number,User,Email,Total Amount,Status,Created Date\n';
      orders.forEach((order) => {
        csvContent += `${order.id},"${order.orderNumber}","${order.user.name}","${order.user.email}",${order.totalAmount},"${order.status}","${new Date(order.createdAt).toLocaleDateString()}"\n`;
      });
    } else if (reportType === 'returns') {
      const returns = await prisma.return.findMany({
        where: { createdAt: { gte: startDate } },
        include: { order: { include: { user: true } } },
      });

      csvContent = 'Return ID,Order Number,Customer,Reason,Refund Amount,Status,Created Date\n';
      returns.forEach((ret) => {
        csvContent += `${ret.id},"${ret.order.orderNumber}","${ret.order.user.name}","${ret.reason}",${ret.estimatedRefundAmount},"${ret.status}","${new Date(ret.createdAt).toLocaleDateString()}"\n`;
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="report_${reportType}_${new Date().getTime()}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting report:', error);
    return res.status(500).json({ error: error.message });
  }
};
