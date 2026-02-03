const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Database Seeding...');

    // =========================================================================
    // 1. PERMISSIONS & ROLES (Existing Logic)
    // =========================================================================
    const permissionsList = [
        'product.create', 'product.read', 'product.update', 'product.delete',
        'order.read', 'order.update_status', 'order.verify_payment',
        'user.read', 'user.manage_roles',
        'dashboard.view', 'report.view'
    ];

    console.log(`... Upserting ${permissionsList.length} Permissions`);

    const dbPermissions = [];
    for (const action of permissionsList) {
        const perm = await prisma.permission.upsert({
            where: { action },
            update: {},
            create: { action, description: `Permission to ${action}` },
        });
        dbPermissions.push(perm);
    }

    console.log('... Creating SuperAdmin Role');
    const superAdminRole = await prisma.role.upsert({
        where: { name: 'SuperAdmin' },
        update: {},
        create: { name: 'SuperAdmin', description: 'Has access to everything' },
    });

    // Assign ALL Permissions to SuperAdmin
    await prisma.rolePermission.deleteMany({ where: { roleId: superAdminRole.id } });
    const rolePermissionData = dbPermissions.map(perm => ({
        roleId: superAdminRole.id,
        permissionId: perm.id
    }));
    await prisma.rolePermission.createMany({ data: rolePermissionData });

    // =========================================================================
    // 2. USERS (Admin & Customer)
    // =========================================================================
    console.log('... Creating Users');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@comfortclothing.com' },
        update: {},
        create: {
            name: 'Abhishek Saini',
            email: 'admin@comfortclothing.com',
            password_hash: hashedPassword,
            isActive: true,
            phone: '9999999999'
        },
    });

    const customerUser = await prisma.user.upsert({
        where: { email: 'customer@test.com' },
        update: {},
        create: {
            name: 'Rahul Sharma',
            email: 'customer@test.com',
            password_hash: hashedPassword,
            isActive: true,
            phone: '9876543210'
        },
    });

    // Assign Role
    const existingLink = await prisma.userRole.findUnique({
        where: { userId_roleId: { userId: adminUser.id, roleId: superAdminRole.id } }
    });
    if (!existingLink) {
        await prisma.userRole.create({
            data: { userId: adminUser.id, roleId: superAdminRole.id }
        });
    }

    // =========================================================================
    // 3. CATALOG (Categories, Brands, Products)
    // =========================================================================
    console.log('... Creating Catalog');

    // Brands
    const brand = await prisma.brand.upsert({
        where: { slug: 'urbaneigh' },
        update: {},
        create: { name: 'Urbaneigh', slug: 'urbaneigh' }
    });

    // Categories
    const catMen = await prisma.category.upsert({
        where: { slug: 'men' },
        update: {},
        create: { name: 'Men', slug: 'men' }
    });

    const catWomen = await prisma.category.upsert({
        where: { slug: 'women' },
        update: {},
        create: { name: 'Women', slug: 'women' }
    });

    // Subcategories (Optional, but good for filtering)
    // skipping to keep it simple, mapped to parent directly for now OR create if needed.

    // PRODUCTS
    const dummyProducts = [
        {
            title: "Premium Cotton T-Shirt",
            description: "Experience ultimate comfort with our 100% organic cotton basic tee. Perfect for everyday wear.",
            price: 499.00,
            categoryId: catMen.id,
            image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1780&auto=format&fit=crop"
        },
        {
            title: "Slim Fit Chinos",
            description: "Versatile chinos that move with you. Available in multiple colors.",
            price: 1299.00,
            categoryId: catMen.id,
            image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=1887&auto=format&fit=crop"
        },
        {
            title: "Classic Denim Jacket",
            description: "A timeless layering piece. Rugged, durable, and stylish.",
            price: 2499.00,
            categoryId: catMen.id,
            image: "https://images.unsplash.com/photo-1548861214-411cb3aa882c?q=80&w=1887&auto=format&fit=crop" // actually a dog, replacing url
            // "https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?q=80&w=2070&auto=format&fit=crop" (better)
        },
        {
            title: "Floral Summer Dress",
            description: "Lightweight and breezy, perfect for the summer heat.",
            price: 1899.00,
            categoryId: catWomen.id,
            image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?q=80&w=1946&auto=format&fit=crop"
        },
        {
            title: "High-Waist Jeans",
            description: "Flattering cut with premium stretch denim.",
            price: 1599.00,
            categoryId: catWomen.id,
            image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1887&auto=format&fit=crop"
        },
        {
            title: "Oversized Hoodie",
            description: "Cozy up in our signature fleece hoodie.",
            price: 2199.00,
            categoryId: catMen.id,
            image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=2070&auto=format&fit=crop"
        }
    ];

    // Reuse proper image for men's jacket
    dummyProducts[2].image = "https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?q=80&w=2070&auto=format&fit=crop";

    for (let i = 0; i < dummyProducts.length; i++) {
        const p = dummyProducts[i];

        // 1. Create Product
        // We use 'upsert' based on something unique? Product has no unique slug in schema, only ID.
        // So we'll check by title manually or just create if not found.
        const existing = await prisma.product.findFirst({ where: { title: p.title } });

        let productId;

        if (!existing) {
            const newProd = await prisma.product.create({
                data: {
                    title: p.title,
                    description: p.description,
                    categoryId: p.categoryId,
                    brandId: brand.id,
                    status: 'ACTIVE'
                }
            });
            productId = newProd.id;
            console.log(`Created Product: ${p.title}`);
        } else {
            productId = existing.id;
            console.log(`Product already exists: ${p.title}`);
        }

        // 2. Create Variant (if none)
        const existingVariant = await prisma.productVariant.findFirst({ where: { productId } });
        let variantId;

        if (!existingVariant) {
            const variant = await prisma.productVariant.create({
                data: {
                    productId,
                    sku: `SKU-${productId}-M-BLK`,
                    size: 'M',
                    color: 'Black',
                    price: p.price,
                    mrp: p.price * 1.2
                }
            });
            variantId = variant.id;

            // Image
            await prisma.productImage.create({
                data: {
                    variantId,
                    url: p.image,
                    position: 0
                }
            });

            // Inventory
            await prisma.inventory.create({
                data: {
                    variantId,
                    quantity: 100,
                    reserved_qty: 0
                }
            });
        }
    }

    // =========================================================================
    // 4. ORDERS (For Dashboard/History)
    // =========================================================================
    // =========================================================================
    // 4. ORDERS (Comprehensive Test Scenarios)
    // =========================================================================
    console.log('... Creating Comprehensive Test Orders');

    const variant1 = await prisma.productVariant.findFirst();
    if (!variant1) throw new Error("No variants found to create orders");

    // Helper to Create Order
    const createOrder = async (idx, status, paymentMethod, extraData = {}) => {
        const orderNum = `ORD-${Date.now()}-${idx}`;
        const total = Number(variant1.price);

        const order = await prisma.order.create({
            data: {
                userId: customerUser.id,
                orderNumber: orderNum,
                totalAmount: total,
                status: status,
                paymentMethod: paymentMethod,
                shippingAddress: {
                    fullName: 'Rahul Sharma',
                    address: '123 Test St',
                    city: 'Bangalore',
                    state: 'KA',
                    pincode: '560001',
                    phone: '9876543210'
                },
                idempotencyKey: `ikey-${Date.now()}-${idx}`,
                items: {
                    create: {
                        variantId: variant1.id,
                        quantity: 1,
                        price: total
                    }
                },
                ...extraData
            }
        });
        return order;
    };

    // 1. ORDER: CREATED (COD Pending)
    await createOrder(1, 'CREATED', 'COD');

    // 2. ORDER: PAID (Prepaid - Paytm Success)
    const paidOrder = await createOrder(2, 'PAID', 'PAYTM');
    await prisma.payment.create({
        data: {
            orderId: paidOrder.id,
            method: 'PAYTM',
            amount: Number(variant1.price),
            status: 'COMPLETED',
            paytm_txn_id: `TXN-${paidOrder.orderNumber}`
        }
    });

    // 3. ORDER: SHIPPED (In Transit)
    const shippedOrder = await createOrder(3, 'IN_TRANSIT', 'COD');
    await prisma.shipment.create({
        data: {
            orderId: shippedOrder.id,
            courier_provider: 'Shiprocket',
            waybill: `AWB-${shippedOrder.orderNumber}`,
            status: 'IN_TRANSIT',
            estimated_delivery: new Date(Date.now() + 86400000 * 2)
        }
    });

    // 4. ORDER: DELIVERED (Exhausted Lifecycle)
    const deliveredOrder = await createOrder(4, 'DELIVERED', 'PAYTM');
    await prisma.payment.create({
        data: {
            orderId: deliveredOrder.id, // Using correct ID
            method: 'PAYTM',
            amount: Number(variant1.price),
            status: 'COMPLETED',
            paytm_txn_id: `TXN-${deliveredOrder.orderNumber}`
        }
    });
    await prisma.shipment.create({
        data: {
            orderId: deliveredOrder.id,
            courier_provider: 'BlueDart',
            waybill: `AWB-${deliveredOrder.orderNumber}`,
            status: 'DELIVERED',
            delivered_at: new Date()
        }
    });

    // 5. ORDER: RETURNED (Refund Processed)
    const returnedOrder = await createOrder(5, 'RETURNED', 'PAYTM');
    await prisma.payment.create({
        data: {
            orderId: returnedOrder.id,
            method: 'PAYTM',
            amount: Number(variant1.price),
            status: 'COMPLETED',
            paytm_txn_id: `TXN-${returnedOrder.orderNumber}`
        }
    });
    const ret = await prisma.return.create({
        data: {
            orderId: returnedOrder.id,
            userId: customerUser.id,
            status: 'RETURNED',
            reason: 'DAMAGED',
            estimatedRefundAmount: Number(variant1.price),
            approvedRefundAmount: Number(variant1.price),
            items: [{ variantId: variant1.id, quantity: 1, reason: 'Damaged' }]
        }
    });
    await prisma.refund.create({
        data: {
            orderId: returnedOrder.id,
            returnId: ret.id,
            originalAmount: Number(variant1.price),
            refundAmount: Number(variant1.price),
            status: 'COMPLETED',
            method: 'GATEWAY'
        }
    });
    // Link Refund to Payment (Optional but good for data)
    await prisma.payment.update({
        where: { orderId: returnedOrder.id },
        data: {
            refund_amount: Number(variant1.price),
            refunded_at: new Date()
        }
    });

    // 6. ORDER: CANCELLED
    await createOrder(6, 'CANCELLED', 'COD');

    // 7. ORDER: PAYMENT_FAILED
    const failedOrder = await createOrder(7, 'PAYMENT_FAILED', 'PAYTM');
    await prisma.payment.create({
        data: {
            orderId: failedOrder.id,
            method: 'PAYTM',
            amount: Number(variant1.price),
            status: 'FAILED',
            paytm_txn_id: `TXN-${failedOrder.orderNumber}-FAIL`
        }
    });

    console.log('✅ Created 7 Test Orders covering all scenarios.');

    // =========================================================================
    // 5. POSTERS & VIDEOS
    // =========================================================================
    console.log('... Creating Posters & Videos');

    // 1. Posters (Carousel)
    const cnt = await prisma.poster.count();
    if (cnt < 2) {
        await prisma.poster.createMany({
            data: [
                {
                    imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop",
                    link: "/shop?category=men",
                    position: "home_main",
                    isActive: true
                },
                {
                    imageUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2070&auto=format&fit=crop",
                    link: "/shop?sort=newest",
                    position: "home_main",
                    isActive: true
                },
                { // Promotional
                    imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop",
                    link: "/shop?sort=price_low",
                    position: "home_main",
                    isActive: true
                }
            ]
        });
        console.log('Created Carousel Posters');
    }

    // 2. Shoppable Videos
    const vidCount = await prisma.shoppableVideo.count();
    if (vidCount <= 1) {
        const product = await prisma.product.findFirst();

        if (product) {
            // Video 1
            await prisma.shoppableVideo.create({
                data: {
                    title: "Summer Vibes",
                    videoUrl: "https://videos.pexels.com/video-files/3205914/3205914-hd_1920_1080_25fps.mp4",
                    thumbnailUrl: "https://images.pexels.com/videos/3205914/pictures/preview-0.jpg",
                    isActive: true,
                    products: { create: { productId: product.id } }
                }
            });
            // Video 2
            await prisma.shoppableVideo.create({
                data: {
                    title: "Urban Streetwear",
                    videoUrl: "https://videos.pexels.com/video-files/4259099/4259099-hd_1920_1080_25fps.mp4",
                    thumbnailUrl: "https://images.pexels.com/videos/4259099/pictures/preview-0.jpg",
                    isActive: true,
                    products: { create: { productId: product.id } }
                }
            });
            // Video 3
            await prisma.shoppableVideo.create({
                data: {
                    title: "Evening Elegance",
                    videoUrl: "https://videos.pexels.com/video-files/7653139/7653139-hd_1920_1080_30fps.mp4",
                    thumbnailUrl: "https://images.pexels.com/videos/7653139/pictures/preview-0.jpg",
                    isActive: true,
                    products: { create: { productId: product.id } }
                }
            });
            console.log('Created Shoppable Videos');
        }
    }

    console.log('✅ Seeding Complete!');
    console.log('👉 Admin Login: admin@comfortclothing.com / admin123');
    console.log('👉 Customer Login: customer@test.com / admin123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });