const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get Active Poster (For Home Page)
// Get Active Posters (For Home Carousel)
exports.getActivePoster = async (req, res) => {
    try {
        // Fetch ALL active posters for home_main (or all active if no position specified)
        const posters = await prisma.poster.findMany({
            where: { isActive: true, position: 'home_main' },
            orderBy: { id: 'desc' }
        });
        res.json(posters);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// [ADMIN] Create Poster
exports.createPoster = async (req, res) => {
    try {
        const { imageUrl, link, position } = req.body;
        const poster = await prisma.poster.create({
            data: {
                imageUrl,
                link: link || '/shop',
                position: position || 'home_main',
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

// =============================================================================
// VIDEOS (Indiloom Style)
// =============================================================================

// Get Active Videos (Public)
exports.getVideos = async (req, res) => {
    try {
        const videos = await prisma.shoppableVideo.findMany({
            where: { isActive: true },
            include: {
                products: {
                    include: {
                        product: {
                            include: {
                                category: true, // Needed for ProductCard
                                variants: {
                                    take: 1, // Only need main variant for card
                                    include: { 
                                        images: { take: 1 },
                                        inventory: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { id: 'desc' }
        });
        
        // Transform for frontend
        const formatted = videos.map(vid => ({
            id: vid.id,
            title: vid.title,
            videoUrl: vid.videoUrl,
            thumbnailUrl: vid.thumbnailUrl,
            products: vid.products.map(p => ({
                id: p.product.id,
                title: p.product.title,
                category: { name: p.product.category?.name || 'Collection' }, // Fix undefined name crash
                variants: p.product.variants.map(v => ({
                    id: v.id,
                    price: v.price,
                    color: v.color,
                    size: v.size,
                    inventory: v.inventory,
                    images: v.images
                }))
            }))
        }));

        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// [ADMIN] Create Video
exports.createVideo = async (req, res) => {
    try {
        const { title, videoUrl, thumbnailUrl, productIds } = req.body; // productIds = [1, 2]
        
        const video = await prisma.shoppableVideo.create({
            data: {
                title,
                videoUrl,
                thumbnailUrl,
                products: {
                    create: productIds?.map(pid => ({ productId: Number(pid) })) || []
                }
            }
        });
        
        res.status(201).json(video);
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
};

// [ADMIN] Delete Video
exports.deleteVideo = async (req, res) => {
    try {
        // Cascade delete relation first? Prisma handles validation, but let's just delete parent
        // Schema constraints might require deleting relations manually if not set to Cascade
        await prisma.productVideo.deleteMany({ where: { videoId: Number(req.params.id) } });
        await prisma.shoppableVideo.delete({ where: { id: Number(req.params.id) } });
        
        res.json({ message: 'Video Deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};