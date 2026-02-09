const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedRoles() {
    try {
        const roleName = 'Customer';
        const permissionsList = [
            { action: 'view_products', description: 'View Products' },
            { action: 'create_order', description: 'Create Order' }
        ];

        // 1. Upsert Permissions
        const permissionIds = [];
        for (const perm of permissionsList) {
            const p = await prisma.permission.upsert({
                where: { action: perm.action },
                update: {},
                create: {
                    action: perm.action,
                    description: perm.description
                }
            });
            permissionIds.push(p.id);
        }

        // 2. Upsert Role
        const role = await prisma.role.upsert({
            where: { name: roleName },
            update: {},
            create: {
                name: roleName,
                description: 'Standard Customer Role'
            }
        });
        console.log(`✅ Role '${role.name}' is ready (ID: ${role.id}).`);

        // 3. Link Permissions to Role
        for (const permId of permissionIds) {
            // Check if link exists
            const distinctLink = await prisma.rolePermission.findUnique({
                where: {
                    roleId_permissionId: {
                        roleId: role.id,
                        permissionId: permId
                    }
                }
            });

            if (!distinctLink) {
                await prisma.rolePermission.create({
                    data: {
                        roleId: role.id,
                        permissionId: permId
                    }
                });
                console.log(`Linked Permission ID ${permId} to Role ${role.name}`);
            }
        }

        console.log('🎉 Seeding completed successfully.');

    } catch (error) {
        console.error('Error seeding roles:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seedRoles();
