const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Database Seeding...');

    // 1. Define All Possible Permissions
    // These are the "atomic actions" your system supports
    const permissionsList = [
        // Product Management
        'product.create', 'product.read', 'product.update', 'product.delete',
        // Order Management
        'order.read', 'order.update_status', 'order.verify_payment',
        // User & Role Management
        'user.read', 'user.manage_roles',
        // Dashboard
        'dashboard.view', 'report.view'
    ];

    console.log(`... Upserting ${permissionsList.length} Permissions`);
    
    // Create Permissions in DB
    const dbPermissions = [];
    for (const action of permissionsList) {
        const perm = await prisma.permission.upsert({
            where: { action },
            update: {},
            create: { action, description: `Permission to ${action}` },
        });
        dbPermissions.push(perm);
    }

    // 2. Create the "SuperAdmin" Role
    console.log('... Creating SuperAdmin Role');
    const superAdminRole = await prisma.role.upsert({
        where: { name: 'SuperAdmin' },
        update: {},
        create: { name: 'SuperAdmin', description: 'Has access to everything' },
    });

    // 3. Assign ALL Permissions to SuperAdmin
    // (We first delete existing links to avoid duplicates if you run this twice)
    await prisma.rolePermission.deleteMany({ where: { roleId: superAdminRole.id } });
    
    const rolePermissionData = dbPermissions.map(perm => ({
        roleId: superAdminRole.id,
        permissionId: perm.id
    }));

    await prisma.rolePermission.createMany({
        data: rolePermissionData
    });

    // 4. Create the First Admin User (YOU)
    console.log('... Creating Admin User');
    const hashedPassword = await bcrypt.hash('admin123', 10); // Default password: admin123

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

    // 5. Assign SuperAdmin Role to the User
    // Check if link exists first
    const existingLink = await prisma.userRole.findUnique({
        where: {
            userId_roleId: {
                userId: adminUser.id,
                roleId: superAdminRole.id
            }
        }
    });

    if (!existingLink) {
        await prisma.userRole.create({
            data: {
                userId: adminUser.id,
                roleId: superAdminRole.id
            }
        });
    }

    console.log('✅ Seeding Complete!');
    console.log('👉 Admin Login: admin@comfortclothing.com / admin123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });