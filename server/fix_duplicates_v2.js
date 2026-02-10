const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDuplicatesRobust() {
    try {
        const correctPhone = '+919602799926';

        console.log('1. Fetching all users with likely matching phones...');
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { phone: correctPhone },
                    { phone: '9602799926' },
                    { phone: { endsWith: '9602799926' } }
                ]
            }
        });

        console.log('Found users:', users.map(u => ({ id: u.id, phone: u.phone })));

        // We want to KEEP ID 1.
        // If ID 1 is NOT in this list (e.g. it has some other random phone), we need to fetch it separately.
        const user1 = await prisma.user.findUnique({ where: { id: 1 } });

        // Delete everyone else who has this phone number
        for (const u of users) {
            if (u.id !== 1) {
                await prisma.user.delete({ where: { id: u.id } });
                console.log(`Deleted duplicate User ${u.id}`);
            }
        }

        // Now update User 1. 
        // If User 1 already has the correct phone, we are good.
        // If User 1 has a different phone, we update it.
        if (user1) {
            console.log(`Updating User 1 (current: ${user1.phone}) to ${correctPhone}`);
            try {
                // First calculate a temp phone just in case
                await prisma.user.update({
                    where: { id: 1 },
                    data: { phone: `TEMP_${Date.now()}` }
                });

                // Now set correct phone
                await prisma.user.update({
                    where: { id: 1 },
                    data: {
                        phone: correctPhone,
                        name: 'Abhishek Saini',
                        isActive: true
                    }
                });
                console.log('✅ User 1 updated successfully.');
            } catch (err) {
                console.error('Update failed:', err);
            }

            // Re-assign role
            const role = await prisma.role.findUnique({ where: { name: 'SuperAdmin' } });
            if (role) {
                // Remove existing roles
                await prisma.userRole.deleteMany({ where: { userId: 1 } });
                // Add SuperAdmin
                await prisma.userRole.create({
                    data: { userId: 1, roleId: role.id }
                });
                console.log('✅ SuperAdmin role confirmed for User 1.');
            }
        } else {
            console.log('❌ User 1 does not exist! Creating fresh SuperAdmin...');
            // Create fresh if ID 1 allows (or just create new and log ID)
            // Prisma auto-increment usually prevents forcing ID unless we enable identity insert (tricky in Prisma).
            // We'll just create a new user.
            const newUser = await prisma.user.create({
                data: {
                    phone: correctPhone,
                    name: 'Abhishek Saini',
                    email: 'asaini9926@gmail.com'
                }
            });
            const role = await prisma.role.findUnique({ where: { name: 'SuperAdmin' } });
            await prisma.userRole.create({
                data: { userId: newUser.id, roleId: role.id }
            });
            console.log(`Created NEW SuperAdmin User ID: ${newUser.id}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixDuplicatesRobust();
