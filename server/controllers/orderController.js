// server/controllers/orderController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create New Order
exports.createOrder = async (req, res) => {
    try {
        // 1. Get Data from Frontend
        const { items, shippingAddress, paymentMethod, transactionId } = req.body;
        const userId = req.user.id; // From the Token

        // 2. Calculate Total (Server-side validation is safer)
        // We fetch prices from DB to ensure user didn't fake the price
        let totalAmount = 0;
        const orderItemsData = [];

        for (const item of items) {
            // item has { id: variantId, quantity }
            const variant = await prisma.productVariant.findUnique({
                where: { id: item.id },
                include: { product: true } // to get title if needed
            });

            if (!variant) throw new Error(`Product variant ${item.id} not found`);

            // Check Stock
            const inventory = await prisma.inventory.findUnique({ where: { variantId: item.id } });
            if (inventory.quantity < item.quantity) {
                throw new Error(`Insufficient stock for item ${variant.sku}`);
            }

            const price = Number(variant.price);
            totalAmount += price * item.quantity;

            orderItemsData.push({
                variantId: variant.id,
                quantity: item.quantity,
                price: price
            });
        }

        // Add Shipping logic (if > 999 free, else 99)
        const shippingCost = totalAmount > 999 ? 0 : 99;
        const finalTotal = totalAmount + shippingCost;

        // 3. Database Transaction (Create Order + Items + Payment + Update Stock)
        const result = await prisma.$transaction(async (prisma) => {
            
            // A. Create Order
            const order = await prisma.order.create({
                data: {
                    userId,
                    orderNumber: `ORD-${Date.now()}`, // Simple unique ID
                    totalAmount: finalTotal,
                    status: paymentMethod === 'QR_UPI' ? 'PAYMENT_VERIFICATION_PENDING' : 'PENDING_PAYMENT',
                    paymentMethod,
                    shippingAddress: shippingAddress, // JSON object
                    items: {
                        create: orderItemsData
                    }
                }
            });

            // B. Create Payment Record
            if (paymentMethod === 'QR_UPI') {
                await prisma.payment.create({
                    data: {
                        orderId: order.id,
                        method: 'QR_UPI',
                        amount: finalTotal,
                        status: 'VERIFICATION_REQUIRED',
                        qrReference: transactionId // The UTR number user enters
                    }
                });
            } else {
                 await prisma.payment.create({
                    data: {
                        orderId: order.id,
                        method: 'COD',
                        amount: finalTotal,
                        status: 'PENDING'
                    }
                });
            }

            // C. Reduce Stock
            for (const item of items) {
                await prisma.inventory.update({
                    where: { variantId: item.id },
                    data: { quantity: { decrement: item.quantity } }
                });
            }

            return order;
        });

        res.status(201).json({ message: 'Order placed successfully', orderId: result.id, orderNumber: result.orderNumber });

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
                payment: true
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
        const orders = await prisma.order.findMany({
            include: {
                user: { select: { name: true, email: true } }, // Get customer name
                payment: true, // Get payment details (transaction ID)
                items: { include: { variant: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// [ADMIN] Update Order Status (The Verification Logic)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, paymentStatus } = req.body;

        const updateData = { status };

        // If admin marks order as VERIFIED, we automatically mark payment as COMPLETED
        if (status === 'VERIFIED' || paymentStatus === 'COMPLETED') {
             // We also update the Payment record linked to this order
             await prisma.payment.update({
                where: { orderId: Number(id) },
                data: { 
                    status: 'COMPLETED',
                    verifiedBy: req.user.id,
                    verifiedAt: new Date()
                }
             });
        }

        const order = await prisma.order.update({
            where: { id: Number(id) },
            data: updateData,
            include: { payment: true }
        });

        res.json({ message: 'Order status updated', order });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};