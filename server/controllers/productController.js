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
        const { page = 1, limit = 10, category, brand, sort, search } = req.query;
        const skip = (page - 1) * limit;

        // Build Filter Object
        const where = { status: 'ACTIVE' };
        
        if (category) where.categoryId = parseInt(category);
        if (brand) where.brandId = parseInt(brand);
        
        // Search Logic
        if (search) {
            where.title = { contains: search };
        }

        // --- SORTING LOGIC ---
        let orderBy = { createdAt: 'desc' }; // Default: Newest first

        if (sort === 'price_low') {
            orderBy = { variants: { _count: 'asc' } }; // Approximate low price
        } else if (sort === 'price_high') {
            orderBy = { variants: { _count: 'desc' } };
        } else if (sort === 'newest') {
            orderBy = { createdAt: 'desc' };
        } else if (sort === 'best_selling') {
            // TODO: Add 'soldCount' field to Product model for real analytics
            // For now, we sort by newest as a safe fallback
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
                    select: { price: true, size: true, color: true, images: true }
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
