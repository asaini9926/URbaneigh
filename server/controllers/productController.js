// server/controllers/productController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require('fs-extra');
const path = require('path');
const csv = require('csv-parser');
const { Parser } = require('json2csv');

// Helper to generate slug
const generateSlug = (title) => {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

// 1. Create Product (Complex Transaction)
exports.createProduct = async (req, res) => {
    try {
        const { title, description, categoryId, brandId, variants } = req.body;

        const slug = generateSlug(title);
        // Ensure slug uniqueness (simple append count)
        // Ideally should be done in a wrapper or check loop, but for now assuming low collision for new products
        // or let's add a quick check
        let uniqueSlug = slug;
        let counter = 1;
        while (await prisma.product.findUnique({ where: { slug: uniqueSlug } })) {
            uniqueSlug = `${slug}-${counter}`;
            counter++;
        }

        // Use a Transaction: All or Nothing
        const result = await prisma.$transaction(async (prisma) => {
            // A. Create the Parent Product
            const product = await prisma.product.create({
                data: {
                    title,
                    slug: uniqueSlug,
                    description,
                    categoryId,
                    brandId,
                    status: "ACTIVE",
                },
            });

            // B. Create Variants
            for (const v of variants) {
                await prisma.productVariant.create({
                    data: {
                        productId: product.id,
                        sku: v.sku,
                        size: v.size,
                        color: v.color,
                        price: v.price,
                        mrp: v.mrp || v.price,
                        images: { create: v.images },
                        inventory: { create: { quantity: v.stock } },
                    },
                });
            }

            return product;
        });

        res.status(201).json({ message: "Product created successfully", productId: result.id, slug: uniqueSlug });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
};

// 5. Export Products (CSV)
exports.exportProducts = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            include: {
                category: true,
                brand: true,
                variants: {
                    include: {
                        inventory: true
                    }
                }
            }
        });

        // Flatten data for CSV
        const flatProducts = products.map(p => {
            const v = p.variants[0] || {};
            return {
                ID: p.id,
                Title: p.title,
                Slug: p.slug,
                Description: p.description,
                Category: p.category?.name || '',
                Brand: p.brand?.name || '',
                Status: p.status,
                SKU: v.sku || '',
                Price: v.price || 0,
                Stock: v.inventory?.quantity || 0,
                Created: p.createdAt ? p.createdAt.toISOString() : ''
            };
        });

        const fields = ['ID', 'Title', 'Slug', 'Description', 'Category', 'Brand', 'Status', 'SKU', 'Price', 'Stock', 'Created'];
        const json2csvParser = new Parser({ fields });
        const csvData = json2csvParser.parse(flatProducts);

        res.header('Content-Type', 'text/csv');
        res.attachment('products.csv');
        return res.send(csvData);

    } catch (error) {
        console.error("Export Error:", error);
        res.status(500).json({ error: "Failed to export products" });
    }
};

// 6. Import Products (CSV)
exports.importProducts = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No CSV file uploaded" });

        const results = [];
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                try {
                    let count = 0;
                    for (const row of results) {
                        const { Title, Description, Category, Brand, SKU, Size, Color, Price, Stock, Image } = row;

                        if (!Title) continue;

                        let catId = null;
                        if (Category) {
                            const c = await prisma.category.upsert({
                                where: { slug: generateSlug(Category) },
                                update: {},
                                create: { name: Category, slug: generateSlug(Category) }
                            });
                            catId = c.id;
                        }

                        let brandId = null;
                        if (Brand) {
                            const b = await prisma.brand.upsert({
                                where: { slug: generateSlug(Brand) },
                                update: {},
                                create: { name: Brand, slug: generateSlug(Brand) }
                            });
                            brandId = b.id;
                        }

                        // Find or Create Product
                        // Use Slug or Title
                        let product = await prisma.product.findFirst({
                            where: { title: Title }
                        });

                        if (!product) {
                            let slug = generateSlug(Title);
                            let uniqueSlug = slug;
                            let counter = 1;
                            while (await prisma.product.findUnique({ where: { slug: uniqueSlug } })) {
                                uniqueSlug = `${slug}-${counter}`;
                                counter++;
                            }

                            product = await prisma.product.create({
                                data: {
                                    title: Title,
                                    slug: uniqueSlug,
                                    description: Description || '',
                                    categoryId: catId,
                                    brandId: brandId,
                                    status: 'ACTIVE'
                                }
                            });
                        }

                        // Upsert Variant
                        if (SKU) {
                            await prisma.productVariant.upsert({
                                where: { sku: SKU },
                                update: {
                                    price: parseFloat(Price) || 0,
                                    inventory: { update: { quantity: parseInt(Stock) || 0 } }
                                },
                                create: {
                                    productId: product.id,
                                    sku: SKU,
                                    size: Size,
                                    color: Color,
                                    price: parseFloat(Price) || 0,
                                    mrp: parseFloat(Price) || 0,
                                    images: Image ? { create: { url: Image } } : undefined,
                                    inventory: { create: { quantity: parseInt(Stock) || 0 } }
                                }
                            });
                        }
                        count++;
                    }

                    fs.unlinkSync(req.file.path);
                    res.json({ message: `Processed ${count} rows successfully` });

                } catch (err) {
                    console.error("Import Parse Error:", err);
                    res.status(500).json({ error: "Failed to process CSV data" });
                }
            });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// 2. Get Products (Filter, Sort, Pagination)
exports.getProducts = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, category, brand, minPrice, maxPrice, sort, status } = req.query;

        const where = {};

        // Status Filter (Default to ACTIVE for public if not specified, but Admin might request all)
        // For now, let's allow status override usually.
        if (status) {
            where.status = status;
        } else {
            // Ideally public API should default to ACTIVE, but Admin table might use this too.
            // If this is public endpoint, default to ACTIVE.
            // Let's assume if 'status' param is passed, use it, else default to NO status filter (show all) OR ACTIVE?
            // Usually public catalog shows only active.
            // where.status = 'ACTIVE';
        }

        if (search) {
            where.OR = [
                { title: { contains: search } },
                { description: { contains: search } }
            ];
        }

        if (category) {
            if (!isNaN(category)) {
                where.categoryId = parseInt(category);
            } else {
                where.category = { slug: category };
            }
        }

        if (brand) {
            if (!isNaN(brand)) {
                where.brandId = parseInt(brand);
            } else {
                where.brand = { slug: brand };
            }
        }

        if (minPrice || maxPrice) {
            where.variants = {
                some: {
                    price: {
                        gte: minPrice ? parseFloat(minPrice) : undefined,
                        lte: maxPrice ? parseFloat(maxPrice) : undefined
                    }
                }
            };
        }

        let orderBy = { createdAt: 'desc' };
        if (sort === 'price_asc') {
            // Sort by min price of variants? 
            // Complex in Prisma. Fallback to createdAt or similar implies relevance.
            // Or sort in memory (bad for pagination).
            // For now, default to created if sort not supported deeply.
        } else if (sort === 'price_desc') {
            // same
        } else if (sort === 'oldest') {
            orderBy = { createdAt: 'asc' };
        }

        const products = await prisma.product.findMany({
            where,
            include: {
                category: true,
                brand: true,
                variants: {
                    include: {
                        images: true,
                        inventory: true
                    }
                }
            },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit),
            orderBy
        });

        const total = await prisma.product.count({ where });

        res.json({
            data: products,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Get Single Product (By ID or Slug)
exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        let where = {};
        if (!isNaN(id)) {
            where = { id: parseInt(id) };
        } else {
            where = { slug: id };
        }

        const product = await prisma.product.findFirst({ // findFirst because findUnique requires unique input, and id/slug are different fields
            where: where,
            include: {
                brand: true,
                category: true,
                variants: {
                    include: {
                        inventory: true,
                        images: true,
                    },
                },
            },
        });

        if (!product) return res.status(404).json({ message: "Product not found" });

        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. Get Dynamic Filters (Price Range, Colors)
exports.getFilters = async (req, res) => {
    try {
        // Aggregate Min/Max Price and Distinct Colors
        // Colors are in ProductVariant table.
        // We only want filters for ACTIVE products.

        // 1. Get Min/Max Price from Variants of Active Products
        const priceAgg = await prisma.productVariant.aggregate({
            where: { product: { status: 'ACTIVE' } },
            _min: { price: true },
            _max: { price: true }
        });

        // 2. Get Distinct Colors (Prisma doesn't support distinct on related fields directly in findMany nicely for flat list, 
        // asking distinct on ProductVariant is easiest)
        const colors = await prisma.productVariant.findMany({
            where: { product: { status: 'ACTIVE' } },
            distinct: ['color'],
            select: { color: true }
        });

        res.json({
            minPrice: priceAgg._min.price || 0,
            maxPrice: priceAgg._max.price || 10000,
            colors: colors.map(c => c.color).filter(Boolean)
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// [ADMIN] Update Product
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, categoryId, brandId, variants } = req.body;

        // Transaction to ensure everything updates together
        await prisma.$transaction(async (prisma) => {
            // 1. Update Basic Info
            await prisma.product.update({
                where: { id: Number(id) },
                data: {
                    title,
                    description,
                    categoryId: Number(categoryId),
                    brandId: Number(brandId)
                }
            });

            // 2. Update Variants (Complex Part)
            // Strategy: We will loop through sent variants.
            // If it has an ID, we update it. If no ID, we create it.
            // (Deleting variants is handled separately or by not including them, 
            // but for simplicity here we just handle Add/Update).

            for (const v of variants) {
                if (v.id) {
                    // Update existing
                    await prisma.productVariant.update({
                        where: { id: v.id },
                        data: {
                            color: v.color,
                            size: v.size,
                            price: Number(v.price),
                            sku: v.sku,
                            // Update Stock
                            inventory: {
                                update: { quantity: Number(v.stock) }
                            }
                        }
                    });
                } else {
                    // Create new variant added during edit
                    await prisma.productVariant.create({
                        data: {
                            productId: Number(id),
                            sku: v.sku,
                            size: v.size,
                            color: v.color,
                            price: Number(v.price),
                            mrp: Number(v.price),
                            inventory: { create: { quantity: Number(v.stock) } },
                            images: {
                                create: v.images?.map(url => ({ url: url.url })) || []
                            }
                        }
                    });
                }
            }
        });

        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update product' });
    }
};

// [ADMIN] Delete Product
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // We must delete related data first (Manual Cascade)
        // 1. Find all variants
        const variants = await prisma.productVariant.findMany({ where: { productId: Number(id) } });
        const variantIds = variants.map(v => v.id);

        // 2. Delete Inventory & Images for these variants
        await prisma.inventory.deleteMany({ where: { variantId: { in: variantIds } } });
        await prisma.productImage.deleteMany({ where: { variantId: { in: variantIds } } });

        // 3. Delete Variants
        await prisma.productVariant.deleteMany({ where: { productId: Number(id) } });

        // 4. Finally Delete Product
        await prisma.product.delete({ where: { id: Number(id) } });

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        // If product is in an Order, you can't delete it easily (Constraint error)
        if (error.code === 'P2003') {
            return res.status(400).json({ error: 'Cannot delete: Product is part of existing orders.' });
        }
        res.status(500).json({ error: error.message });
    }
};

// [ADMIN] Bulk Delete Products
exports.bulkDeleteProducts = async (req, res) => {
    try {
        const { ids } = req.body; // Array of IDs
        if (!ids || ids.length === 0) return res.status(400).json({ error: "No IDs provided" });

        // 1. Find all variants for these products
        const variants = await prisma.productVariant.findMany({ where: { productId: { in: ids } } });
        const variantIds = variants.map(v => v.id);

        // 2. Cascade Delete
        await prisma.inventory.deleteMany({ where: { variantId: { in: variantIds } } });
        await prisma.productImage.deleteMany({ where: { variantId: { in: variantIds } } });
        await prisma.productVariant.deleteMany({ where: { productId: { in: ids } } });

        // 3. Delete Products
        const result = await prisma.product.deleteMany({
            where: { id: { in: ids } }
        });

        res.json({ message: `${result.count} products deleted successfully` });
    } catch (error) {
        if (error.code === 'P2003') {
            return res.status(400).json({ error: 'Some products could not be deleted because they are in existing orders.' });
        }
        res.status(500).json({ error: error.message });
    }
};

// [ADMIN] Bulk Status Update
exports.bulkUpdateStatus = async (req, res) => {
    try {
        const { ids, status } = req.body; // status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'

        if (!['ACTIVE', 'DRAFT', 'ARCHIVED'].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const result = await prisma.product.updateMany({
            where: { id: { in: ids } },
            data: { status }
        });

        res.json({ message: `${result.count} products updated to ${status}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
