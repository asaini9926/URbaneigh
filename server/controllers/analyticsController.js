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

    // Fetch Orders in range
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { not: 'CANCELLED' }
      },
      include: { items: true, payment: true },
    });

    // Fetch Carts in range (proxy for Intent)
    const carts = await prisma.cart.findMany({
      where: { updatedAt: { gte: startDate } },
      include: { items: true }
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // --- Funnel Metrics ---
    // Visits (N/A) -> Carts -> Orders (Created) -> Payments (Paid)
    const totalCarts = carts.length;
    const ordersCreated = orders.length; // Approximate "Reached Checkout" metric if assuming all orders pass through here
    const ordersPaid = orders.filter(o => o.status === 'PAID' || o.status === 'DELIVERED').length;

    // Proxy Conversion Rate: Paid Orders / Carts (Since we lack Visit data)
    const cartConversionRate = totalCarts > 0 ? (ordersPaid / totalCarts) * 100 : 0;
    const checkoutDropOffRate = ordersCreated > 0 ? ((ordersCreated - ordersPaid) / ordersCreated) * 100 : 0;

    // --- Heatmap Data (Orders by Hour & Day) ---
    const heatmap = {}; // Format: "Monday-14": 5
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    orders.forEach(order => {
      const d = new Date(order.createdAt);
      const day = daysOfWeek[d.getDay()];
      const hour = d.getHours();
      const key = `${day}-${hour}`;
      heatmap[key] = (heatmap[key] || 0) + 1;
    });

    // --- New vs Repeat Orders ---
    // We check if the user has previous orders before this one
    const userIds = [...new Set(orders.map(o => o.userId))];
    const repeatUserIds = new Set();
    if (userIds.length > 0) {
      const historicalOrders = await prisma.order.findMany({
        where: {
          userId: { in: userIds },
          createdAt: { lt: startDate }
        },
        select: { userId: true },
        distinct: ['userId']
      });
      historicalOrders.forEach(h => repeatUserIds.add(h.userId));
    }

    let newOrdersCount = 0;
    let repeatOrdersCount = 0;

    for (const order of orders) {
      if (repeatUserIds.has(order.userId)) {
        repeatOrdersCount++;
      } else {
        newOrdersCount++;
      }
    }

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
        revenue: dayOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
      });
    }

    return res.status(200).json({
      success: true,
      metrics: {
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        avg_order_value: avgOrderValue.toFixed(2),
        conversion_rate: 0, // Needs visit tracking
        cart_conversion_rate: cartConversionRate.toFixed(2),
        funnel: {
          visits: 0,
          carts: totalCarts,
          checkout: ordersCreated,
          paid: ordersPaid
        },
        checkout_dropoff_rate: checkoutDropOffRate.toFixed(2),
        orders_heatmap: heatmap,
        new_vs_repeat: {
          new: newOrdersCount,
          repeat: repeatOrdersCount
        },
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
        requestedAt: { gte: startDate },
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
    const totalRefundAmount = refunds.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
    const avgRefundAmount = refunds.length > 0 ? totalRefundAmount / refunds.length : 0;

    // Return trend
    const returnTrend = [];
    for (let i = parseInt(days); i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayReturns = returns.filter((r) => {
        const returnDate = new Date(r.requestedAt).toISOString().split('T')[0];
        return returnDate === dateStr;
      });

      returnTrend.push({
        date: dateStr,
        returns: dayReturns.length,
        refund_amount: dayReturns.reduce((sum, r) => sum + Number(r.estimatedRefundAmount || 0), 0),
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

    // Top Customers by Revenue (Leaderboard)
    const topCustomers = await prisma.order.groupBy({
      by: ['userId'],
      _sum: {
        totalAmount: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          totalAmount: 'desc'
        }
      },
      take: 10
    });

    // Enrich with user details (Need separate query as groupBy doesn't include relations)
    const topCustomerDetails = [];
    for (const c of topCustomers) {
      const user = await prisma.user.findUnique({
        where: { id: c.userId },
        select: { name: true, email: true }
      });
      if (user) {
        topCustomerDetails.push({
          ...user,
          total_spent: c._sum.totalAmount,
          orders_count: c._count.id
        });
      }
    }

    // Customer Geography (from Address)
    const addresses = await prisma.address.findMany({
      select: { city: true, state: true }
    });

    const cityDistribution = {};
    const stateDistribution = {};
    addresses.forEach(addr => {
      const city = addr.city || 'Unknown';
      const state = addr.state || 'Unknown';
      cityDistribution[city] = (cityDistribution[city] || 0) + 1;
      stateDistribution[state] = (stateDistribution[state] || 0) + 1;
    });

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
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const avgOrderValuePerCustomer = customersWithOrders.length > 0
      ? (totalRevenue / customersWithOrders.length).toFixed(2)
      : 0;

    // Customer lifetime value (all time)
    const allTimeOrders = await prisma.order.findMany({});
    const totalAllTimeRevenue = allTimeOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const customerLTV = totalCustomers > 0
      ? (totalAllTimeRevenue / totalCustomers).toFixed(2)
      : 0;

    return res.status(200).json({
      success: true,
      insights: {
        total_customers: totalCustomers,
        new_customers: newCustomers,
        customers_with_orders: customersWithOrders.length,
        repeat_customers: repeatCustomers,
        avg_order_value_per_customer: avgOrderValuePerCustomer,
        customer_lifetime_value: customerLTV,
        top_customers: topCustomerDetails,
        geography: {
          by_city: cityDistribution,
          by_state: stateDistribution
        }
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
      const method = payment.paymentMethod || 'UNKNOWN';
      const amount = Number(payment.amount || 0);

      methodCounts[method] = (methodCounts[method] || 0) + 1;
      methodRevenue[method] = (methodRevenue[method] || 0) + amount;
      totalRevenue += amount;

      if (payment.status === 'COMPLETED' || payment.status === 'SUCCESS') {
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
        created_at: { gte: startDate },
      },
    });

    // Settlement metrics
    const totalPending = codRemittances.filter((r) => r.status === 'PENDING').length;
    const totalSettled = codRemittances.filter((r) => r.status === 'SETTLED').length;
    const totalMismatches = reconciliationAlerts.length;
    const resolvedMismatches = reconciliationAlerts.filter((a) => a.status === 'RESOLVED').length;

    const totalRemittanceAmount = codRemittances.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
    const settledAmount = codRemittances
      .filter((r) => r.status === 'SETTLED')
      .reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);

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
      where: { requestedAt: { gte: startDate } },
    });

    // Payments
    const payments = await prisma.payment.findMany({
      where: { createdAt: { gte: startDate } },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const avgOrderValue = orders.length > 0 ? (totalRevenue / orders.length).toFixed(2) : 0;
    const returnRate = orders.length > 0 ? (returns.length / orders.length * 100).toFixed(2) : 0;
    const paymentSuccessRate = payments.length > 0
      ? (payments.filter((p) => p.status === 'COMPLETED' || p.status === 'SUCCESS').length / payments.length * 100).toFixed(2)
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
        pending_returns: returns.filter((r) => r.status === 'REQUESTED').length,
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
        where: { requestedAt: { gte: startDate } },
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

/**
 * Get detailed revenue & profitability metrics
 */
exports.getRevenueMetrics = async (req, res) => {
  try {
    const { period = 'daily', days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { not: 'CANCELLED' }
      },
      include: {
        items: {
          include: {
            variant: true
          }
        },
        payment: true
      },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const totalOrders = orders.length;
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    let totalCost = 0;
    let totalDiscount = 0;

    orders.forEach(order => {
      order.items.forEach(item => {
        const costPrice = Number(item.variant.mrp) * 0.4;
        totalCost += costPrice * item.quantity;

        const sellingPrice = Number(item.price);
        const mrp = Number(item.variant.mrp);
        if (mrp > sellingPrice) {
          totalDiscount += (mrp - sellingPrice) * item.quantity;
        }
      });
    });

    const grossProfit = totalRevenue - totalCost;
    const netMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const revenueByMethod = {};
    orders.forEach(order => {
      const method = order.paymentMethod || 'UNKNOWN';
      revenueByMethod[method] = (revenueByMethod[method] || 0) + Number(order.totalAmount);
    });

    return res.status(200).json({
      success: true,
      metrics: {
        period_days: parseInt(days),
        total_revenue: totalRevenue,
        gross_profit: grossProfit,
        net_margin_percent: netMargin.toFixed(2),
        average_order_value: aov.toFixed(2),
        total_discount_given: totalDiscount,
        revenue_by_payment_method: revenueByMethod,
      }
    });
  } catch (error) {
    console.error('Error fetching revenue metrics:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get Product & Inventory Metrics
 */
exports.getProductMetrics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Top Selling Products (by quantity sold in period)
    const topProducts = await prisma.orderItem.groupBy({
      by: ['variantId'],
      where: {
        order: {
          createdAt: { gte: startDate },
          status: { not: 'CANCELLED' }
        }
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 10
    });

    // Enrich with product details
    const topProductDetails = [];
    for (const p of topProducts) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: p.variantId },
        include: { product: true }
      });
      if (variant) {
        topProductDetails.push({
          id: variant.product.id,
          title: variant.product.title,
          sku: variant.sku,
          sold_quantity: p._sum.quantity,
          revenue: Number(variant.price) * p._sum.quantity
        });
      }
    }

    // Low Stock Items (Inventory < 5)
    // Prisma doesn't support filtering on relation fields in groupBy/findMany easily for this without 'include'
    // We'll fetch all inventory below threshold.
    const lowStockItems = await prisma.inventory.findMany({
      where: {
        quantity: { lt: 5 }
      },
      include: {
        variant: {
          include: { product: true }
        }
      },
      take: 20
    });

    const lowStockList = lowStockItems.map(inv => ({
      product: inv.variant.product.title,
      sku: inv.variant.sku,
      quantity: inv.quantity
    }));

    // Products by Category
    const productsByCategory = await prisma.product.groupBy({
      by: ['categoryId'],
      _count: {
        id: true
      }
    });

    // Enrich category names
    const categoryStats = [];
    for (const c of productsByCategory) {
      const cat = await prisma.category.findUnique({ where: { id: c.categoryId } });
      if (cat) {
        categoryStats.push({
          name: cat.name,
          count: c._count.id
        });
      }
    }

    return res.status(200).json({
      success: true,
      metrics: {
        top_selling_products: topProductDetails,
        low_stock_items: lowStockList,
        category_distribution: categoryStats
      }
    });

  } catch (error) {
    console.error('Error fetching product metrics:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get Fulfillment & Operations Metrics
 */
exports.getFulfillmentMetrics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Fetch Shipments
    const shipments = await prisma.shipment.findMany({
      where: {
        createdAt: { gte: startDate }
      }
    });

    // Delivery Performance
    let totalDeliveryTime = 0;
    let deliveredCount = 0;
    let slaBreaches = 0;

    shipments.forEach(s => {
      if (s.status === 'DELIVERED' && s.delivered_at && s.createdAt) {
        const timeDiff = new Date(s.delivered_at) - new Date(s.createdAt);
        const daysTaken = timeDiff / (1000 * 3600 * 24);
        totalDeliveryTime += daysTaken;
        deliveredCount++;

        // SLA Breach (e.g., > 5 days)
        if (daysTaken > 5) {
          slaBreaches++;
        }
      }
    });

    const avgDeliveryTime = deliveredCount > 0 ? (totalDeliveryTime / deliveredCount).toFixed(1) : 0;

    // Status Distribution
    const statusCounts = {};
    shipments.forEach(s => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      metrics: {
        total_shipments: shipments.length,
        avg_delivery_time_days: avgDeliveryTime,
        sla_breaches: slaBreaches,
        status_distribution: statusCounts
      }
    });

  } catch (error) {
    console.error('Error fetching fulfillment metrics:', error);
    return res.status(500).json({ error: error.message });
  }
};