const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get Active Poster (For Home Page)
exports.getActivePoster = async (req, res) => {
    try {
        // Fetch the most recently created active poster
        const poster = await prisma.poster.findFirst({
            where: { isActive: true },
            orderBy: { id: 'desc' }
        });
        res.json(poster || { imageUrl: null }); // Return null if none exists
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// [ADMIN] Create Poster
exports.createPoster = async (req, res) => {
    try {
        const { imageUrl, link, title, subtitle } = req.body;
        const poster = await prisma.poster.create({
            data: {
                imageUrl,
                link: link || '/shop',
                position: 'home_hero',
                isActive: true
            }
        });
        res.status(201).json(poster);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// [ADMIN] Delete Poster
exports.deletePoster = async (req, res) => {
    try {
        await prisma.poster.delete({ where: { id: Number(req.params.id) } });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// [ADMIN] Get All Posters
exports.getAllPosters = async (req, res) => {
    try {
        const posters = await prisma.poster.findMany({ orderBy: { id: 'desc' } });
        res.json(posters);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};