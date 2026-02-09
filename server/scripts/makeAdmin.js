const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function promoteUserToAdmin(userId) {
    try {
        console.log(`Promoting User ID: ${userId} to SuperAdmin...`);

        // 1. Find SuperAdmin Role ID
        const superAdminRole = await prisma.role.findUnique({
            where: { name: 'SuperAdmin' }
        });

        if (!superAdminRole) {
            console.error('SuperAdmin role not found!');
            return;
        }

        // 2. Assign Role
        const userRole = await prisma.userRole.create({
            data: {
                userId: userId,
                roleId: superAdminRole.id
            }
        });

        console.log('Success! User promoted.');
        console.log(userRole);

    } catch (err) {
        if (err.code === 'P2002') {
            console.log('User is already a SuperAdmin.');
        } else {
            console.error('Error promoting user:', err);
        }
    } finally {
        await prisma.$disconnect();
    }
}

// User ID 26 from the log
promoteUserToAdmin(26);
