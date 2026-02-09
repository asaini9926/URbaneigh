// server/controllers/orderController.js
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { validateTransition, canBeCancelled } = require('../utils/orderTransitionGuard');
const prisma = new PrismaClient();

// Helper: Generate idempotency key
function generateIdempotencyKey(userId, items) {
    const itemStr = items.map((i) => `${i.id}:${i.quantity}`).join('|');
    const hash = crypto.createHash('md5').update(`${userId}:${itemStr}:${Date.now()}`).digest('hex');
    return hash;
}

// Create New Order (COD only - Paytm orders are created in paymentController)
exports.createOrder = async (req, res) => {
    try {
        // 1. Get Data from Frontend
        const { items, shippingAddress, paymentMethod } = req.body;
        const userId = req.user.id; // From the Token

        // Only allow COD through this endpoint now
        if (paymentMethod !== 'COD') {
            return res.status(400).json({ error: 'Use /payments/initiate for Paytm payments' });
        }

        // 2. Calculate Total (Server-side validation is safer)
        // We fetch prices from DB to ensure user didn't fake the price
        let totalAmount = 0;
        const orderItemsData = [];

        for (const item of items) {
            // item has { id: variantId, quantity }
            const variant = await prisma.productVariant.findUnique({
                where: { id: item.id },
                include: { product: true, inventory: true }
            });

            if (!variant) throw new Error(`Product variant ${item.id} not found`);

            // Check Available Stock (not reserved)
            const availableQty = variant.inventory.quantity - variant.inventory.reserved_qty;
            if (availableQty < item.quantity) {
                throw new Error(`Insufficient stock for item ${variant.sku}. Available: ${availableQty}`);
            }

            const price = Number(variant.price);
            totalAmount += price * item.quantity;

            orderItemsData.push({
                variantId: variant.id,
                quantity: item.quantity,
                price: price
            });
        }

        // Add Shipping logic (Free Delivery for all - Prod-3 requirement)
        // logic: Display says 79 - 79, so effective cost is 0.
        const shippingCost = 0;
        const finalTotal = totalAmount + shippingCost;

        const idempotencyKey = generateIdempotencyKey(userId, items);

        // 3. Database Transaction (Create Order + Items + Payment + Reservations)
        const result = await prisma.$transaction(async (prisma) => {

            // A. Create Order
            const order = await prisma.order.create({
                data: {
                    userId,
                    orderNumber: `ORD-${Date.now()}`,
                    totalAmount: finalTotal,
                    status: 'CREATED',  // COD orders start as CREATED, move to PAID immediately
                    paymentMethod: 'COD',
                    shippingAddress: shippingAddress,
                    idempotencyKey: idempotencyKey,
                    items: {
                        create: orderItemsData
                    }
                }
            });

            // B. Create Payment Record for COD
            await prisma.payment.create({
                data: {
                    orderId: order.id,
                    method: 'COD',
                    amount: finalTotal,
                    status: 'PENDING'  // Will be marked COMPLETED on delivery
                }
            });

            // C. Create Reservations (hold for potential cancellation window)
            for (const item of items) {
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

            // For COD, immediately move to PAID (since we accept payment on delivery)
            const paidOrder = await prisma.order.update({
                where: { id: order.id },
                data: { status: 'PAID' }
            });

            // Finalize reservations (convert to permanent inventory deduction)
            const reservations = await prisma.reservation.findMany({
                where: { orderId: order.id, status: 'ACTIVE' }
            });

            for (const reservation of reservations) {
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


            return paidOrder;
        });

        res.status(201).json({
            message: 'Order placed successfully. Your order will be delivered with Cash on Delivery option.',
            orderId: result.id,
            orderNumber: result.orderNumber
        });

    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
};

// Get My Orders
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            where: { userId: req.user.id },
            include: {
                items: { include: { variant: { include: { product: true } } } },
                payment: true,
                shipments: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// [ADMIN] Get All Orders (with filters later if needed)
exports.getAllOrders = async (req, res) => {
    try {
        const { status, paymentMethod, startDate, endDate, page = 1, limit = 10 } = req.query;

        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        let whereClause = {};

        if (status) whereClause.status = status;
        if (paymentMethod) whereClause.paymentMethod = paymentMethod;

        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate) whereClause.createdAt.gte = new Date(startDate);
            if (endDate) whereClause.createdAt.lte = new Date(endDate);
        }

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where: whereClause,
                skip,
                take,
                include: {
                    user: { select: { id: true, name: true, email: true, phone: true } },
                    payment: true,
                    items: { include: { variant: { include: { product: true } } } },
                    shipments: true
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.order.count({ where: whereClause })
        ]);

        res.json({
            data: orders,
            meta: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / take)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// [ADMIN] Update Order Status
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        // Get current order
        const order = await prisma.order.findUnique({
            where: { id: Number(id) }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Validate status transition using guard
        try {
            validateTransition(order.status, status);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }

        const updateData = { status };
        if (notes) {
            updateData.notes = notes;
        }

        const updatedOrder = await prisma.order.update({
            where: { id: Number(id) },
            data: updateData,
            include: { payment: true, shipments: true }
        });

        res.json({ message: 'Order status updated', order: updatedOrder });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// [ADMIN] Bulk Archive/Delete
exports.bulkDeleteOrders = async (req, res) => {
    try {
        const { ids } = req.body;
        // For orders, usually we archive them or just hard delete if testing
        // Hard deletion requires cascading delete of items, payments, etc.
        // Prisma transaction is best.

        await prisma.$transaction(async (prisma) => {
            // Delete related
            await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
            await prisma.payment.deleteMany({ where: { orderId: { in: ids } } });
            await prisma.shipment.deleteMany({ where: { orderId: { in: ids } } });
            await prisma.reservation.deleteMany({ where: { orderId: { in: ids } } });
            // Delete Order
            await prisma.order.deleteMany({ where: { id: { in: ids } } });
        });

        res.json({ message: `${ids.length} orders deleted` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// [ADMIN] Update Fulfillment Status
exports.updateFulfillmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // UNFULFILLED, FULFILLED, etc.

        const order = await prisma.order.update({
            where: { id: Number(id) },
            data: { fulfillmentStatus: status }
        });
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// [ADMIN] Get Single Order Details (Detailed)
exports.getAdminOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await prisma.order.findUnique({
            where: { id: Number(id) },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
                items: { include: { variant: { include: { product: true } } } },
                payment: true,
                shipments: true,
                return: true  // Include Returns
            }
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });

        res.json({ order });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};