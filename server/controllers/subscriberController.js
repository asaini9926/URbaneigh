const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Public: Subscribe to newsletter
exports.subscribe = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required" });

        const existing = await prisma.subscriber.findUnique({ where: { email } });
        if (existing) {
            if (!existing.isActive) {
                 await prisma.subscriber.update({ where: { email }, data: { isActive: true } });
                 return res.json({ message: "Welcome back! You've been resubscribed." });
            }
            return res.status(400).json({ error: "Email already subscribed" });
        }

        await prisma.subscriber.create({ data: { email } });
        res.status(201).json({ message: "Successfully subscribed to newsletter" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Admin: Get all subscribers
exports.getAllSubscribers = async (req, res) => {
    try {
        const subscribers = await prisma.subscriber.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(subscribers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
