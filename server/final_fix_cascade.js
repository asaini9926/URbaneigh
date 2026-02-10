const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- STARTING FINAL FIX (CASCADE) ---');
    try {
        const correctPhone = '+919602799926';

        // 1. Find the "Bad" User(s)
        const badUsers = await prisma.user.findMany({
            where: {
                OR: [
                    { phone: correctPhone },
                    { phone: '9602799926' },
                    { phone: { endsWith: '9602799926' } }
                ],
                id: { not: 1 } // Do NOT touch User 1
            }
        });

        console.log(`Found ${badUsers.length} bad users to delete.`);

        for (const u of badUsers) {
            console.log(`Processing User ID: ${u.id} (${u.phone})...`);

            // Delete Dependencies manually (Cascade is safer here)
            // 1. UserRoles
            await prisma.userRole.deleteMany({ where: { userId: u.id } });
            // 2. Cart (One-to-One usually)
            await prisma.cart.deleteMany({ where: { userId: u.id } });
            // 3. Addresses
            await prisma.address.deleteMany({ where: { userId: u.id } });
            // 4. Tickets
            await prisma.ticket.deleteMany({ where: { userId: u.id } });
            // 5. Orders (Be careful, might want to keep? For now, if it's a temp user, delete)
            // If they have orders, maybe reassign to User 1?
            // Let's reassign Orders to User 1 just in case
            await prisma.order.updateMany({
                where: { userId: u.id },
                data: { userId: 1 }
            });

            // Now Delete User
            await prisma.user.delete({ where: { id: u.id } });
            console.log(`   ✅ Deleted User ID ${u.id}`);
        }

        // 2. Update User 1 EXPLICITLY
        console.log('Updating User 1...');
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

        // 3. Force Role
        const role = await prisma.role.findFirst({ where: { name: 'SuperAdmin' } });
        if (role) {
            await prisma.userRole.deleteMany({ where: { userId: 1 } });
            await prisma.userRole.create({
                data: { userId: 1, roleId: role.id }
            });
            console.log('   ✅ SuperAdmin Role assigned to User 1.');
        }

        console.log('--- DONE ---');

    } catch (e) {
        console.error('CRITICAL ERROR:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
