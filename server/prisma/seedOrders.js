const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
    console.log('🌱 Seeding Orders for History Page...');

    const email = 'admin@comfortclothing.com';
    let user = await prisma.user.findUnique({ where: { email } });

    // 1. Ensure User Exists
    if (!user) {
        console.log(`User ${email} not found! Creating it now...`);
         const hashedPassword = await bcrypt.hash('admin123', 10);
         user = await prisma.user.create({
            data: {
                name: 'Abhishek Saini',
                email: email,
                password_hash: hashedPassword,
                isActive: true,
                phone: '9999999999'
            }
        });
        console.log(`Created User: ${user.name}`);
    } else {
        console.log(`Found User: ${user.name} (${user.id})`);
    }

    // 2. Ensure Products Allow Seeding
    let variants = await prisma.productVariant.findMany({ take: 3, include: { product: true } });
    if (variants.length === 0) {
        console.log('No products found! running minimal product seed...');
        // Create a dummy category/brand/product if entirely empty
        const cat = await prisma.category.upsert({ where: { slug: 'men' }, update: {}, create: { name: 'Men', slug: 'men' } });
        const brand = await prisma.brand.upsert({ where: { slug: 'urbaneigh' }, update: {}, create: { name: 'Urbaneigh', slug: 'urbaneigh' } });
        
        const prod = await prisma.product.create({
            data: {
                title: "Seed T-Shirt",
                description: "Auto generated seed product",
                categoryId: cat.id,
                brandId: brand.id,
                status: 'ACTIVE'
            }
        });

        const variant = await prisma.productVariant.create({
            data: {
                productId: prod.id,
                sku: `SEED-${Date.now()}`,
                size: 'M',
                color: 'Black',
                price: 999,
                mrp: 1299,
                inventory: { create: { quantity: 100 } }
            }
        });
        variants = [variant];
    }

    const statuses = [
        'CREATED',
        'PAYMENT_PENDING',
        'PAID',
        'READY_TO_PACK', 
        'PACKED',
        'IN_TRANSIT',
        'DELIVERED',
        'DELIVERED', // One more for Return test
        'CANCELLED',
        'RETURN_REQUESTED', 
        'RETURNED'
    ];

    let dateOffset = 0;

    for (const status of statuses) {
        const variant = variants[dateOffset % variants.length] || variants[0]; 
        dateOffset++;
        
        // Stagger dates (days ago)
        const date = new Date();
        date.setDate(date.getDate() - dateOffset); // 1 day ago, 2 days ago...

        const orderNum = `ORD-DEMO-${Date.now()}-${dateOffset}`;
        
        console.log(`Creating Order ${orderNum} with status ${status}`);

        await prisma.order.create({
            data: {
                userId: user.id,
                orderNumber: orderNum,
                totalAmount: Number(variant.price || 500),
                status: status,
                paymentMethod: status === 'CREATED' ? 'COD' : 'PAYTM',
                shippingAddress: {
                    fullAddress: "123, Demo Lane, Tech Park",
                    city: "Bangalore",
                    state: "KA",
                    pincode: "560100"
                },
                idempotencyKey: `ikey-${Date.now()}-${dateOffset}`,
                createdAt: date,
                updatedAt: date,
                items: {
                    create: {
                        variantId: variant.id,
                        quantity: 1,
                        price: variant.price || 500
                    }
                }
            }
        });
    }

    console.log('✅ Orders Seeded Successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
