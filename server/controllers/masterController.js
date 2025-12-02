// server/controllers/masterController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- CATEGORIES ---

// Create a new Category
exports.createCategory = async (req, res) => {
    try {
        const { name, slug, parentId } = req.body;

        const category = await prisma.category.create({
            data: {
                name,
                slug, // URL friendly name (e.g., "mens-wear")
                parentId: parentId || null // Optional: if this is a subcategory
            }
        });
        res.status(201).json(category);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get All Categories (with subcategories)
exports.getCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: { parentId: null }, // Fetch top-level categories
            include: {
                children: true // Include their subcategories
            }
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- BRANDS ---

// Create a new Brand
exports.createBrand = async (req, res) => {
    try {
        const { name, slug } = req.body;

        const brand = await prisma.brand.create({
            data: { name, slug }
        });
        res.status(201).json(brand);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get All Brands
exports.getBrands = async (req, res) => {
    try {
        const brands = await prisma.brand.findMany();
        res.json(brands);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.category.delete({ where: { id: Number(id) } });
        res.json({ message: 'Category deleted' });
    } catch (error) {
        // Prisma throws code P2003 if foreign key constraint fails (e.g., products exist in this category)
        if (error.code === 'P2003') {
            return res.status(400).json({ error: 'Cannot delete: Products exist in this category.' });
        }
        res.status(500).json({ error: error.message });
    }
};

exports.deleteBrand = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.brand.delete({ where: { id: Number(id) } });
        res.json({ message: 'Brand deleted' });
    } catch (error) {
        if (error.code === 'P2003') {
            return res.status(400).json({ error: 'Cannot delete: Products exist for this brand.' });
        }
        res.status(500).json({ error: error.message });
    }
};