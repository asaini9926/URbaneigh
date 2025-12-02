const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// [ADMIN] Create Coupon
exports.createCoupon = async (req, res) => {
    try {
        const { code, type, value, minOrderVal, expiryDate, usageLimit } = req.body;
        
        const coupon = await prisma.coupon.create({
            data: {
                code: code.toUpperCase(),
                type,
                value,
                minOrderVal: minOrderVal || 0,
                expiryDate: new Date(expiryDate),
                usageLimit: Number(usageLimit)
            }
        });
        res.status(201).json(coupon);
    } catch (error) {
        res.status(400).json({ error: "Code already exists or invalid data" });
    }
};

// [ADMIN] Get All Coupons
exports.getAllCoupons = async (req, res) => {
    try {
        const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// [ADMIN] Delete Coupon
exports.deleteCoupon = async (req, res) => {
    try {
        await prisma.coupon.delete({ where: { id: Number(req.params.id) } });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// [CUSTOMER] Verify/Apply Coupon
exports.verifyCoupon = async (req, res) => {
    try {
        const { code, cartTotal } = req.body; // User sends code + current cart value

        const coupon = await prisma.coupon.findUnique({
            where: { code: code.toUpperCase() }
        });

        // Validation Checks
        if (!coupon) return res.status(404).json({ error: 'Invalid Coupon Code' });
        if (!coupon.isActive) return res.status(400).json({ error: 'Coupon is inactive' });
        if (new Date() > new Date(coupon.expiryDate)) return res.status(400).json({ error: 'Coupon has expired' });
        if (coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ error: 'Coupon usage limit reached' });
        if (Number(cartTotal) < Number(coupon.minOrderVal)) {
            return res.status(400).json({ error: `Minimum order value is ₹${coupon.minOrderVal}` });
        }

        // Calculate Discount
        let discountAmount = 0;
        if (coupon.type === 'PERCENTAGE') {
            discountAmount = (Number(cartTotal) * Number(coupon.value)) / 100;
        } else {
            discountAmount = Number(coupon.value);
        }

        // Ensure discount doesn't exceed total price
        if (discountAmount > Number(cartTotal)) discountAmount = Number(cartTotal);

        res.json({
            message: 'Coupon Applied',
            code: coupon.code,
            discountAmount,
            finalTotal: Number(cartTotal) - discountAmount
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};