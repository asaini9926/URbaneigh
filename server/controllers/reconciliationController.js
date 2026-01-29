const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const axios = require("axios");

/**
 * Reconciliation Controller - COD Remittance & Settlement Tracking
 * - Track courier payouts for COD orders
 * - Match delivered amounts with actual payments
 * - Identify mismatches and discrepancies
 * - Settlement verification workflow
 */

/**
 * Get all pending COD orders for remittance tracking
 */
exports.getPendingCODOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const pendingOrders = await prisma.order.findMany({
      where: {
        paymentMethod: "COD",
        status: "PAID", // COD orders become PAID after OTP
        payment: {
          status: { not: "REFUNDED" },
        },
      },
      include: {
        payment: true,
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        shipments: {
          where: { status: "DELIVERED" },
          select: { delivered_at: true },
        },
      },
      skip,
      take: Number(limit),
    });

    const total = await prisma.order.count({
      where: {
        payment_method: "COD",
        status: "DELIVERED",
        payment: {
          status: { not: "REFUNDED" },
        },
      },
    });

    return res.status(200).json({
      success: true,
      total_orders: total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / limit),
      pending_amount: pendingOrders.reduce(
        (sum, order) => sum + order.totalAmount,
        0,
      ),
      orders: pendingOrders.map((order) => ({
        order_id: order.id,
        order_number: order.orderNumber,
        customer_name: order.user.name,
        customer_phone: order.user.phone,
        amount: order.totalAmount,
        delivered_at: order.delivered_at,
        cod_payment_status: order.payment.status,
        payment_received: order.payment.status === "PAID",
      })),
    });
  } catch (error) {
    console.error("Error fetching pending COD orders:", error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Record COD payment received from courier (Delhivery)
 */
exports.recordCODPaymentReceived = async (req, res) => {
  try {
    const { orderId, amount, referenceId, courierRemittanceDate } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: { payment: true },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.payment_method !== "COD") {
      return res.status(400).json({
        error: `This is not a COD order. Payment method: ${order.payment_method}`,
      });
    }

    if (order.status !== "DELIVERED") {
      return res.status(400).json({
        error: `Order must be DELIVERED to record payment. Current status: ${order.status}`,
      });
    }

    // Check for amount mismatch
    const amountMismatch = Math.abs(order.totalAmount - amount) > 0.01;

    const now = new Date();

    // Update payment record
    const updatedPayment = await prisma.payment.update({
      where: { orderId: parseInt(orderId) },
      data: {
        status: "PAID",
        paid_at: now,
        gateway_response: {
          ...JSON.parse(order.payment.gateway_response || "{}"),
          cod_remittance: {
            reference_id: referenceId,
            courier_remittance_date: courierRemittanceDate,
            amount_received: amount,
            amount_mismatch: amountMismatch,
            mismatch_amount: amountMismatch ? amount - order.totalAmount : 0,
            recorded_at: now.toISOString(),
          },
        },
      },
    });

    // If mismatch exists, create alert
    if (amountMismatch) {
      const alert = await prisma.reconciliationAlert
        .create({
          data: {
            orderId: parseInt(orderId),
            alert_type: "AMOUNT_MISMATCH",
            expected_amount: order.totalAmount,
            actual_amount: amount,
            difference: amount - order.totalAmount,
            status: "OPEN",
            reference_id: referenceId,
            notes: `Amount mismatch detected. Expected: ${order.totalAmount}, Received: ${amount}`,
          },
        })
        .catch(() => null); // Alert table might not exist yet

      return res.status(200).json({
        success: true,
        message: "COD payment recorded but AMOUNT MISMATCH DETECTED",
        order_id: orderId,
        expected_amount: order.totalAmount,
        actual_amount: amount,
        difference: amount - order.totalAmount,
        mismatch_alert: true,
        alert_id: alert?.id,
      });
    }

    return res.status(200).json({
      success: true,
      message: "COD payment recorded successfully",
      order_id: orderId,
      amount: amount,
      reference_id: referenceId,
      recorded_at: now.toISOString(),
    });
  } catch (error) {
    console.error("Error recording COD payment:", error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get COD settlement summary (daily, weekly, monthly)
 */
exports.getSettlementSummary = async (req, res) => {
  try {
    const { period = "daily", date } = req.query;
    const queryDate = date ? new Date(date) : new Date();

    let startDate, endDate;

    if (period === "daily") {
      startDate = new Date(queryDate.setHours(0, 0, 0, 0));
      endDate = new Date(queryDate.setHours(23, 59, 59, 999));
    } else if (period === "weekly") {
      const first = queryDate.getDate() - queryDate.getDay();
      startDate = new Date(queryDate.setDate(first));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === "monthly") {
      startDate = new Date(queryDate.getFullYear(), queryDate.getMonth(), 1);
      endDate = new Date(queryDate.getFullYear(), queryDate.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    // Get all COD delivered orders in period
    const deliveredOrders = await prisma.order.findMany({
      where: {
        payment_method: "COD",
        status: "DELIVERED",
        delivered_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { payment: true },
    });

    const totalOrders = deliveredOrders.length;
    const totalAmount = deliveredOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );

    // Separate paid and unpaid
    const paidOrders = deliveredOrders.filter(
      (order) => order.payment.status === "PAID",
    );
    const unpaidOrders = deliveredOrders.filter(
      (order) => order.payment.status !== "PAID",
    );

    const paidAmount = paidOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );
    const unpaidAmount = unpaidOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );

    return res.status(200).json({
      success: true,
      period: period,
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        total_orders: totalOrders,
        total_expected_amount: totalAmount,
        paid_orders: paidOrders.length,
        paid_amount: paidAmount,
        unpaid_orders: unpaidOrders.length,
        unpaid_amount: unpaidAmount,
        settlement_percentage:
          totalOrders > 0
            ? ((paidOrders.length / totalOrders) * 100).toFixed(2)
            : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching settlement summary:", error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * List all reconciliation alerts (mismatches, discrepancies)
 */
exports.getReconciliationAlerts = async (req, res) => {
  try {
    const { status = "OPEN", page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Try to get alerts, but handle if table doesn't exist
    let alerts = [];
    let total = 0;

    try {
      alerts = await prisma.reconciliationAlert.findMany({
        where: status !== "ALL" ? { status: status } : undefined,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              total_amount: true,
            },
          },
        },
        skip: skip,
        take: parseInt(limit),
        orderBy: { created_at: "desc" },
      });

      total = await prisma.reconciliationAlert.count({
        where: status !== "ALL" ? { status: status } : undefined,
      });
    } catch (error) {
      // ReconciliationAlert table might not exist yet
      return res.status(200).json({
        success: true,
        message: "Alert system not yet initialized",
        alerts: [],
        total_alerts: 0,
      });
    }

    return res.status(200).json({
      success: true,
      total_alerts: total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / limit),
      alerts: alerts.map((alert) => ({
        alert_id: alert.id,
        order_id: alert.orderId,
        order_number: alert.order.orderNumber,
        alert_type: alert.alert_type,
        expected_amount: alert.expected_amount,
        actual_amount: alert.actual_amount,
        difference: alert.difference,
        status: alert.status,
        notes: alert.notes,
        created_at: alert.created_at,
      })),
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Resolve/close a reconciliation alert
 */
exports.resolveAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { resolution, resolvedAmount } = req.body;

    // Handle if alert table doesn't exist
    let alert;
    try {
      alert = await prisma.reconciliationAlert.update({
        where: { id: parseInt(alertId) },
        data: {
          status: "RESOLVED",
          resolution: resolution,
          resolved_amount: resolvedAmount || undefined,
          resolved_at: new Date(),
        },
      });
    } catch (error) {
      return res.status(404).json({
        error: "Alert not found or alert system not initialized",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Alert resolved",
      alert_id: alertId,
      resolution: resolution,
      resolved_at: alert.resolved_at,
    });
  } catch (error) {
    console.error("Error resolving alert:", error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Generate reconciliation report (daily/weekly/monthly export)
 */
exports.generateReconciliationReport = async (req, res) => {
  try {
    const { period = "daily", date, format = "json" } = req.query;
    const queryDate = date ? new Date(date) : new Date();

    let startDate, endDate, periodLabel;

    if (period === "daily") {
      startDate = new Date(queryDate.setHours(0, 0, 0, 0));
      endDate = new Date(queryDate.setHours(23, 59, 59, 999));
      periodLabel = startDate.toISOString().split("T")[0];
    } else if (period === "weekly") {
      const first = queryDate.getDate() - queryDate.getDay();
      startDate = new Date(queryDate.setDate(first));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      periodLabel = `Week of ${startDate.toISOString().split("T")[0]}`;
    } else if (period === "monthly") {
      startDate = new Date(queryDate.getFullYear(), queryDate.getMonth(), 1);
      endDate = new Date(queryDate.getFullYear(), queryDate.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      periodLabel = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}`;
    }

    // Get all COD orders in period
    const orders = await prisma.order.findMany({
      where: {
        payment_method: "COD",
        status: "DELIVERED",
        delivered_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        payment: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { delivered_at: "asc" },
    });

    const report = {
      period: periodLabel,
      generated_at: new Date().toISOString(),
      summary: {
        total_orders: orders.length,
        total_amount: orders.reduce(
          (sum, order) => sum + order.totalAmount,
          0,
        ),
        paid_orders: orders.filter((o) => o.payment.status === "PAID").length,
        unpaid_orders: orders.filter((o) => o.payment.status !== "PAID").length,
      },
      orders: orders.map((order) => ({
        order_number: order.orderNumber,
        customer_name: order.user.name,
        customer_phone: order.user.phone,
        amount: order.totalAmount,
        delivered_at: order.delivered_at.toISOString(),
        payment_status: order.payment.status,
      })),
    };

    if (format === "csv") {
      // Convert to CSV
      let csv =
        "Order Number,Customer Name,Phone,Amount,Delivered At,Payment Status\n";
      report.orders.forEach((order) => {
        csv += `${order.order_number},${order.customer_name},${order.customer_phone},${order.amount},${order.delivered_at},${order.payment_status}\n`;
      });
      return res.setHeader("Content-Type", "text/csv").send(csv);
    }

    return res.status(200).json(report);
  } catch (error) {
    console.error("Error generating report:", error);
    return res.status(500).json({ error: error.message });
  }
};
