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

    const superAdminRole = await prisma.role.upsert({
        where: { name: 'SuperAdmin' },
        update: {},
        create: { name: 'SuperAdmin', description: 'Has access to everything' },
    });

    console.log('... Creating Customer Role');
    const customerRole = await prisma.role.upsert({
        where: { name: 'Customer' },
        update: {},
        create: { name: 'Customer', description: 'Standard customer role' },
    });

    console.log('... Creating Admin Role');
    const adminRole = await prisma.role.upsert({
        where: { name: 'Admin' },
        update: {},
        create: { name: 'Admin', description: 'Administrator role' },
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

    // Category Structure
    const catalogStructure = [
        {
            name: 'Men',
            slug: 'men',
            subcategories: [
                { name: 'T-Shirts', slug: 'men-tshirts' },
                { name: 'Shirts', slug: 'men-shirts' },
                { name: 'Jeans', slug: 'men-jeans' },
                { name: 'Jackets', slug: 'men-jackets' },
                { name: 'Trousers', slug: 'men-trousers' }
            ]
        },
        {
            name: 'Women',
            slug: 'women',
            subcategories: [
                { name: 'Dresses', slug: 'women-dresses' },
                { name: 'Tops', slug: 'women-tops' },
                { name: 'Jeans', slug: 'women-jeans' },
                { name: 'Skirts', slug: 'women-skirts' },
                { name: 'Ethnic Wear', slug: 'women-ethnic' }
            ]
        },
        {
            name: 'Kids',
            slug: 'kids',
            subcategories: [
                { name: 'Boys Clothing', slug: 'kids-boys' },
                { name: 'Girls Clothing', slug: 'kids-girls' }
            ]
        },
        {
            name: 'Accessories',
            slug: 'accessories',
            subcategories: [
                { name: 'Watches', slug: 'accessories-watches' },
                { name: 'Bags', slug: 'accessories-bags' },
                { name: 'Jewellery', slug: 'accessories-jewellery' }
            ]
        }
    ];

    const categoryMap = {}; // slug -> id

    // Seeding Categories & Subcategories
    for (const catData of catalogStructure) {
        // Create Parent
        const parent = await prisma.category.upsert({
            where: { slug: catData.slug },
            update: {},
            create: { name: catData.name, slug: catData.slug }
        });
        categoryMap[catData.slug] = parent.id;
        console.log(`Created Category: ${catData.name}`);

        // Create Children
        for (const sub of catData.subcategories) {
            const child = await prisma.category.upsert({
                where: { slug: sub.slug },
                update: { parentId: parent.id },
                create: { name: sub.name, slug: sub.slug, parentId: parent.id }
            });
            categoryMap[sub.slug] = child.id;
        }
    }

    // Product Helper
    async function createProduct({ title, description, price, categorySlug, brandId, image, variants = [] }) {
        // Slugify title
        const slug = title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

        const existing = await prisma.product.findFirst({ where: { slug } });
        let productId;

        if (!existing) {
            const product = await prisma.product.create({
                data: {
                    title,
                    description,
                    slug, // Ensure your schema has slug on Product if you use it, otherwise remove
                    categoryId: categoryMap[categorySlug],
                    brandId,
                    status: 'ACTIVE'
                }
            });
            productId = product.id;
            console.log(`Created Product: ${title}`);
        } else {
            productId = existing.id;
            // console.log(`Product exists: ${title}`);
        }

        // Default variants if none provided
        if (variants.length === 0) {
            variants = [
                { size: 'S', color: 'Black' },
                { size: 'M', color: 'Black' },
                { size: 'L', color: 'Black' },
                { size: 'XL', color: 'Black' }
            ];
        }

        for (const v of variants) {
            const sku = `SKU-${productId}-${v.size}-${v.color.substring(0, 3).toUpperCase()}`;

            // Check if variant exists
            const existingVariant = await prisma.productVariant.findUnique({ where: { sku } });

            if (!existingVariant) {
                const variant = await prisma.productVariant.create({
                    data: {
                        productId,
                        sku,
                        size: v.size,
                        color: v.color,
                        price: price,
                        mrp: price * 1.2,
                        inventory: {
                            create: {
                                quantity: Math.floor(Math.random() * 100) + 10,
                                reserved_qty: 0
                            }
                        }
                    }
                });

                // Add Image
                await prisma.productImage.create({
                    data: {
                        variantId: variant.id,
                        url: image,
                        position: 0
                    }
                });
            }
        }
    }

    // Seed Products
    const products = [
        // MEN
        {
            title: "Classic White T-Shirt",
            description: "A staple for every wardrobe. Made with 100% organic cotton.",
            price: 499.00,
            categorySlug: 'men-tshirts',
            brandId: brand.id,
            image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1780&auto=format&fit=crop"
        },
        {
            title: "Oxford Blue Shirt",
            description: "Prefect for work or a casual day out.",
            price: 1299.00,
            categorySlug: 'men-shirts',
            brandId: brand.id,
            image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=1888&auto=format&fit=crop"
        },
        {
            title: "Slim Fit Black Jeans",
            description: "Stretchable denim for maximum comfort.",
            price: 1899.00,
            categorySlug: 'men-jeans',
            brandId: brand.id,
            image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1887&auto=format&fit=crop"
        },
        {
            title: "Leather Biker Jacket",
            description: "Genuine leather jacket with a rugged look.",
            price: 4599.00,
            categorySlug: 'men-jackets',
            brandId: brand.id,
            image: "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?q=80&w=1995&auto=format&fit=crop"
        },
        {
            title: "Formal Grey Trousers",
            description: "Sharp and sophisticated. Ideal for office wear.",
            price: 1499.00,
            categorySlug: 'men-trousers',
            brandId: brand.id,
            image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=1887&auto=format&fit=crop"
        },

        // WOMEN
        {
            title: "Floral Summer Dress",
            description: "Light and breezy, perfect for sunny days.",
            price: 1899.00,
            categorySlug: 'women-dresses',
            brandId: brand.id,
            image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?q=80&w=1946&auto=format&fit=crop"
        },
        {
            title: "Silk Blouse",
            description: "Elegant silk blouse in pastel shades.",
            price: 1599.00,
            categorySlug: 'women-tops',
            brandId: brand.id,
            image: "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?q=80&w=1974&auto=format&fit=crop"
        },
        {
            title: "High-Waist Mom Jeans",
            description: "Retro style with modern comfort.",
            price: 1699.00,
            categorySlug: 'women-jeans',
            brandId: brand.id,
            image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1887&auto=format&fit=crop"
        },
        {
            title: "Pleated Midi Skirt",
            description: "Versatile skirt that goes with everything.",
            price: 1299.00,
            categorySlug: 'women-skirts',
            brandId: brand.id,
            image: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?q=80&w=1964&auto=format&fit=crop"
        },
        {
            title: "Embroidered Kurta",
            description: "Traditional design with contemporary cuts.",
            price: 2199.00,
            categorySlug: 'women-ethnic',
            brandId: brand.id,
            image: "https://plus.unsplash.com/premium_photo-1682090790697-3f3674681fb7?q=80&w=1887&auto=format&fit=crop"
        },

        // ACCESSORIES
        {
            title: "Minimalist Watch",
            description: "Sleek design for the modern professional.",
            price: 2999.00,
            categorySlug: 'accessories-watches',
            brandId: brand.id,
            image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=1999&auto=format&fit=crop"
        },
        {
            title: "Leather Messenger Bag",
            description: "Durable and stylish, fits a 15-inch laptop.",
            price: 3499.00,
            categorySlug: 'accessories-bags',
            brandId: brand.id,
            image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=1887&auto=format&fit=crop"
        },
        {
            title: "Gold Plated Necklace",
            description: "Delicate chain with a charming pendant.",
            price: 999.00,
            categorySlug: 'accessories-jewellery',
            brandId: brand.id,
            image: "https://images.unsplash.com/photo-1599643478518-17488fbbcd75?q=80&w=1887&auto=format&fit=crop"
        }
    ];

    for (const p of products) {
        await createProduct(p);
    }

    // Create random extra products? Maybe not needed if we have good distinct ones.

    console.log('✅ Catalog Seeded Successfully!');


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