
/**
 * Get detailed revenue & profitability metrics
 * - Gross Profit (Revenue - Cost)
 * - Net Margin %
 * - AOV
 * - Discount Impact
 */
exports.getRevenueMetrics = async (req, res) => {
    try {
        const { period = 'daily', days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const orders = await prisma.order.findMany({
            where: {
                createdAt: { gte: startDate },
                status: { not: 'CANCELLED' } // Exclude cancelled
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

        // Gross Profit Estimation (Assuming 70% COGS if not available, or calculating from MRP - Price)
        // Here we use a heuristic: Product Cost is approx 40% of MRP. (Adjust as needed)
        // Profit = Sales - Cost
        let totalCost = 0;
        let totalDiscount = 0;

        orders.forEach(order => {
            order.items.forEach(item => {
                const costPrice = Number(item.variant.mrp) * 0.4; // Estimated Cost (40% of MRP)
                totalCost += costPrice * item.quantity;

                // Discount = (MRP - SellingPrice) * Qty
                const sellingPrice = Number(item.price);
                const mrp = Number(item.variant.mrp);
                if (mrp > sellingPrice) {
                    totalDiscount += (mrp - sellingPrice) * item.quantity;
                }
            });
        });

        const grossProfit = totalRevenue - totalCost;
        const netMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        // Payment Method Breakdown
        const revenueByMethod = {};
        orders.forEach(order => {
            // Use order.paymentMethod as it's the source of truth for the order's intent
            // or check payment.paymentMethod if available (which we fixed previously)
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
