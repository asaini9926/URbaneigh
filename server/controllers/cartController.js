const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Sync Cart (Replace Strategy: Frontend MUST merge and send full state)
exports.syncCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { items } = req.body; // Expecting [{ variantId, quantity }]

        let cart = await prisma.cart.findUnique({ where: { userId } });
        if (!cart) cart = await prisma.cart.create({ data: { userId } });

        await prisma.$transaction(async (tx) => {
            await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
            if (items && items.length > 0) {
                await tx.cartItem.createMany({
                    data: items.map(item => ({
                        cartId: cart.id,
                        variantId: parseInt(item.variantId || item.id),
                        quantity: item.quantity
                    }))
                });
            }
        });

        const updatedCart = await prisma.cart.findUnique({
            where: { id: cart.id },
            include: { items: { include: { variant: { include: { product: true, inventory: true, images: true } } } } }
        });

        res.json(updatedCart);
    } catch (error) {
        console.error("Sync Cart Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// Add Item to Cart (Granular)
exports.addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { variantId, quantity } = req.body;

        let cart = await prisma.cart.findUnique({ where: { userId } });
        if (!cart) cart = await prisma.cart.create({ data: { userId } });

        const existingItem = await prisma.cartItem.findFirst({
            where: { cartId: cart.id, variantId: parseInt(variantId) }
        });

        if (existingItem) {
            await prisma.cartItem.update({
                where: { id: existingItem.id },
                data: { quantity: existingItem.quantity + quantity }
            });
        } else {
            await prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    variantId: parseInt(variantId),
                    quantity: quantity
                }
            });
        }

        const updatedCart = await prisma.cart.findUnique({
            where: { id: cart.id },
            include: { items: { include: { variant: { include: { product: true, inventory: true, images: true } } } } }
        });
        res.json(updatedCart);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Remove Item
exports.removeFromCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { variantId } = req.params; // Using variantId to identify item in cart context easily

        const cart = await prisma.cart.findUnique({ where: { userId } });
        if (!cart) return res.status(404).json({ error: "Cart not found" });

        // Find matches
        await prisma.cartItem.deleteMany({
            where: {
                cartId: cart.id,
                variantId: parseInt(variantId)
            }
        });

        const updatedCart = await prisma.cart.findUnique({
            where: { id: cart.id },
            include: { items: { include: { variant: { include: { product: true, inventory: true, images: true } } } } }
        });
        res.json(updatedCart);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update Quantity
exports.updateQuantity = async (req, res) => {
    try {
        const userId = req.user.id;
        const { variantId, quantity } = req.body;

        const cart = await prisma.cart.findUnique({ where: { userId } });
        if (!cart) return res.status(404).json({ error: "Cart not found" });

        const item = await prisma.cartItem.findFirst({
            where: { cartId: cart.id, variantId: parseInt(variantId) }
        });

        if (item) {
            if (quantity > 0) {
                await prisma.cartItem.update({
                    where: { id: item.id },
                    data: { quantity: parseInt(quantity) }
                });
            } else {
                await prisma.cartItem.delete({ where: { id: item.id } });
            }
        }

        const updatedCart = await prisma.cart.findUnique({
            where: { id: cart.id },
            include: { items: { include: { variant: { include: { product: true, inventory: true, images: true } } } } }
        });
        res.json(updatedCart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Clear Cart
exports.clearCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const cart = await prisma.cart.findUnique({ where: { userId } });
        if (cart) {
            await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        }
        res.json({ message: "Cart cleared", items: [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const cart = await prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        variant: {
                            include: {
                                product: true,
                                inventory: true,
                                images: true
                            }
                        }
                    }
                }
            }
        });
        res.json(cart || { items: [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
