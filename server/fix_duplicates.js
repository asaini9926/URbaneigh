const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDuplicates() {
    try {
        const users = await prisma.user.findMany();
        console.log('--- Current Users ---');
        users.forEach(u => {
            console.log(`ID: ${u.id}, Phone: '${u.phone}', Name: ${u.name}`);
        });

        // We want to keep ID 1 and make it the SuperAdmin with the correct phone
        const correctPhone = '+919602799926';

        // Delete duplicates (User 3)
        const deleted = await prisma.user.deleteMany({
            where: {
                id: { not: 1 },
                OR: [
                    { phone: correctPhone },
                    { phone: '9602799926' }
                ]
            }
        });
        console.log(`\nDeleted ${deleted.count} duplicate users.`);

        // Force Update User 1
        // We first set it to a temp value to avoid any potential (though unlikely) collision during update if DB is weird
        await prisma.user.update({
            where: { id: 1 },
            data: { phone: 'TEMP_' + Date.now() }
        });

        const updated = await prisma.user.update({
            where: { id: 1 },
            data: {
                phone: correctPhone,
                name: 'Abhishek Saini',
                isActive: true
            }
        });
        console.log(`\nUpdated User 1: ${updated.phone} (${updated.name})`);

        // Ensure Role
        const role = await prisma.role.findUnique({ where: { name: 'SuperAdmin' } });
        if (role) {
            await prisma.userRole.deleteMany({ where: { userId: 1 } });
            await prisma.userRole.create({
                data: { userId: 1, roleId: role.id }
            });
            console.log('Assigned SuperAdmin role to User 1');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixDuplicates();
