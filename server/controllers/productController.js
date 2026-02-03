// server/controllers/productController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// 1. Create Product (Complex Transaction)
exports.createProduct = async (req, res) => {
  try {
    const { title, description, categoryId, brandId, variants } = req.body;

    // Use a Transaction: All or Nothing
    const result = await prisma.$transaction(async (prisma) => {
      // A. Create the Parent Product
      const product = await prisma.product.create({
        data: {
          title,
          description,
          categoryId,
          brandId,
          status: "ACTIVE",
        },
      });

      // B. Loop through Variants and create them
      // Expecting variants to be an array: [{ sku, size, color, price, stock, ... }]
      for (const v of variants) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: v.sku,
            size: v.size,
            color: v.color,
            price: v.price, // Selling Price
            mrp: v.mrp || v.price, // MRP (optional, defaults to price)
            images: {
              create: v.images, // Expecting array of { url: '...' }
            },

            inventory: {
              create: {
                quantity: v.stock,
              },
            },
          },
        });
      }

      return product;
    });

    res
      .status(201)
      .json({ message: "Product created successfully", productId: result.id });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

// 2. Get All Products (With Filters & Pagination)
exports.getProducts = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, brand, sort, search, color, minPrice, maxPrice } = req.query;
        const skip = (page - 1) * limit;

        // Build Filter Object
        const where = { status: 'ACTIVE' };
        
        // Handle Category (ID or Slug)
        if (category) {
            const catId = parseInt(category);
            if (!isNaN(catId)) {
                // If providing ID, we should matching categoryId OR parentId (if we want to show all children products)
                // But Product model uses direct categoryId link.
                // If I select "Men" (Parent), I want to see products in "T-Shirts" (Child).
                // So we need to find all children IDs first.
                // This is slightly complex query. For now, let's assume direct match or we fetch children ids.
                // Or simplified: use the IN operator if we had the list.
                // To keep it performant, frontend should send relevant IDs, or we do a sub-query.
                
                // Let's do a sub-query logic (fetch category and its children)
                const cat = await prisma.category.findUnique({
                    where: { id: catId },
                    include: { children: true }
                });
                
                if (cat) {
                    const ids = [cat.id, ...cat.children.map(c => c.id)];
                    where.categoryId = { in: ids };
                } else {
                     where.categoryId = catId; // Fallback
                }
            } else {
                where.category = { slug: category };
            }
        }

        // Handle Brand (ID or Slug)
        if (brand) {
            const brandId = parseInt(brand);
            if (!isNaN(brandId)) {
                where.brandId = brandId;
            } else {
                where.brand = { slug: brand };
            }
        }
        
        // Search Logic
        if (search) {
            where.OR = [
                { title: { contains: search } }, // Case insensitive usually depends on DB collation
                { description: { contains: search } }
            ];
        }

        // --- NEW FILTERS ---
        
        // Color & Price Filtering happens at ProductVariant level.
        // We filter products that HAVE at least one variant matching criteria.
        
        if (color || minPrice || maxPrice) {
            where.variants = {
                some: {
                    AND: [
                        color ? { color: { equals: color } } : {}, // Case sensitive? 'contains' might be better but equals is stricter
                        minPrice ? { price: { gte: Number(minPrice) } } : {},
                        maxPrice ? { price: { lte: Number(maxPrice) } } : {}
                    ]
                }
            };
        }

        // --- SORTING LOGIC ---
        let orderBy = { createdAt: 'desc' }; // Default: Newest first

        if (sort === 'price_low') {
            // Sorting by price is tricky with variants. We sort by the lowest variant price.
            // Prisma doesn't support relation sorting easily in `orderBy`.
            // We'll stick to basic sort or use aggregated value if needed.
            // For now, let's keep it simple or remove if problematic.
            // Actually, `variants: { _count: ... }` behaves weirdly for price.
            // Let's rely on createdAt for default and simple price sort if possible, 
            // but accurate price sort requires aggregate field on Product.
            // Reverting to basic logic for now.
             orderBy = { createdAt: 'desc' }; 
        } else if (sort === 'price_high') {
             orderBy = { createdAt: 'desc' };
        } else if (sort === 'newest') {
            orderBy = { createdAt: 'desc' };
        } else if (sort === 'best_selling') {
            orderBy = { createdAt: 'desc' }; 
        }

        // Fetch Data
        const products = await prisma.product.findMany({
            where,
            skip,
            take: parseInt(limit),
            orderBy,
            include: {
                brand: true,
                category: true,
                variants: {
                    select: { 
                        price: true, 
                        size: true, 
                        color: true, 
                        images: true,
                        inventory: true  
                    }
                }
            }
        });

        const total = await prisma.product.count({ where });

        res.json({
            data: products,
            meta: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Get Single Product (Detailed View)
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        brand: true,
        category: true,
        variants: {
          include: {
            inventory: true, // Check stock
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
