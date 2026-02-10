const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function promoteToSuperAdmin() {
    try {
        const targetName = 'Abhishek Saini';
        const roleName = 'SuperAdmin';

        // 1. Ensure SuperAdmin Role Exists
        let role = await prisma.role.findUnique({
            where: { name: roleName }
        });

        if (!role) {
            console.log(`Creating ${roleName} role...`);
            role = await prisma.role.create({
                data: {
                    name: roleName,
                    description: 'Full Access to Everything'
                }
            });
        }
        console.log(`✅ Role '${role.name}' is ready (ID: ${role.id}).`);

        // 2. Find User
        const user = await prisma.user.findFirst({
            where: { name: targetName },
            include: { roles: true }
        });

        if (!user) {
            console.log(`❌ User '${targetName}' not found.`);
            return;
        }

        console.log(`Found User: ${user.name} (ID: ${user.id})`);

        // 3. Assign Role if not already assigned
        const hasRole = user.roles.some(ur => ur.roleId === role.id);

        if (!hasRole) {
            await prisma.userRole.create({
                data: {
                    userId: user.id,
                    roleId: role.id
                }
            });
            console.log(`✅ Successfully assigned '${roleName}' role to ${user.name}`);
        } else {
            console.log(`ℹ️ User already has '${roleName}' role.`);
        }

    } catch (error) {
        console.error('Error promoting user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

promoteToSuperAdmin();
