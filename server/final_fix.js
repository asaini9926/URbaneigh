const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- STARTING FINAL FIX ---');
    try {
        // 1. Delete User 3 EXPLICITLY
        console.log('1. Attempting to delete User 3...');
        try {
            await prisma.user.delete({ where: { id: 3 } });
            console.log('   ✅ User 3 Deleted.');
        } catch (e) {
            console.log('   ℹ️ User 3 not found or already deleted.');
        }

        // 2. Update User 1 EXPLICITLY
        console.log('2. Updating User 1 Phone/Role...');
        const correctPhone = '+919602799926'; // The phone causing issues

        // First, check if ANYONE else has this phone (just in case)
        const others = await prisma.user.findMany({
            where: {
                phone: correctPhone,
                id: { not: 1 }
            }
        });

        if (others.length > 0) {
            console.log(`   ⚠️ Found ${others.length} other users with this phone. Deleting them...`);
            await prisma.user.deleteMany({
                where: {
                    phone: correctPhone,
                    id: { not: 1 }
                }
            });
        }

        // Now Update ID 1
        const user1 = await prisma.user.upsert({
            where: { id: 1 },
            update: {
                phone: correctPhone,
                name: 'Abhishek Saini',
                isActive: true
            },
            create: {
                id: 1,
                phone: correctPhone,
                name: 'Abhishek Saini',
                isActive: true
            }
        });
        console.log(`   ✅ User 1 Verified: ID=${user1.id}, Phone=${user1.phone}`);

        // 3. Force Role
        const role = await prisma.role.upsert({
            where: { name: 'SuperAdmin' },
            update: {},
            create: { name: 'SuperAdmin' }
        });

        await prisma.userRole.deleteMany({ where: { userId: 1 } });
        await prisma.userRole.create({
            data: { userId: 1, roleId: role.id }
        });
        console.log('   ✅ SuperAdmin Role assigned to User 1.');

        // 4. Verification List
        console.log('\n--- FINAL USER LIST (Role Check) ---');
        const allUsers = await prisma.user.findMany({
            include: { roles: { include: { role: true } } }
        });
        allUsers.forEach(u => {
            const roles = u.roles.map(r => r.role.name).join(', ');
            console.log(`User ID: ${u.id} | Phone: ${u.phone} | Roles: [${roles}]`);
        });

    } catch (e) {
        console.error('CRITICAL ERROR:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
