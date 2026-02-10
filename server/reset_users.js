const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetUsers() {
    try {
        const targetPhone = '+919602799926';
        const targetId = 1;

        console.log('1. Cleaning up duplicate users...');
        // Delete everyone EXCEPT ID 1
        const deleteResult = await prisma.user.deleteMany({
            where: {
                id: { not: targetId }
            }
        });
        console.log(`   Deleted ${deleteResult.count} other users.`);

        console.log('2. Updating SuperAdmin (ID 1)...');
        // Ensure ID 1 exists (or create if missing, though we expect it)
        const user = await prisma.user.upsert({
            where: { id: targetId },
            update: {
                phone: targetPhone,
                name: 'Abhishek Saini',
                email: 'asaini9926@gmail.com'
            },
            create: {
                id: targetId,
                phone: targetPhone,
                name: 'Abhishek Saini',
                email: 'asaini9926@gmail.com'
            }
        });
        console.log(`   User ID 1 ready: ${user.phone}`);

        console.log('3. Assigning SuperAdmin Role...');
        // Ensure Role exists
        const role = await prisma.role.upsert({
            where: { name: 'SuperAdmin' },
            update: {},
            create: { name: 'SuperAdmin', description: 'God Mode' }
        });

        // Link Role
        await prisma.userRole.deleteMany({ where: { userId: user.id } }); // Clear existing
        await prisma.userRole.create({
            data: {
                userId: user.id,
                roleId: role.id
            }
        });
        console.log('   SuperAdmin role assigned.');

    } catch (error) {
        console.error('Error resetting users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetUsers();
