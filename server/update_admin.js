const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateAdminPhone() {
    try {
        const targetName = 'Abhishek Saini';
        const newPhone = '9602799926';

        // Find user by name (case insensitive search not directly supported in standard simple findFirst, but we can try exact or exact string)
        // Adjusting to find first user with name 'Abhishek Saini'
        const user = await prisma.user.findFirst({
            where: {
                name: {
                    equals: targetName,
                    // mode: 'insensitive' // Postgres only, removing to be safe if using SQLite/MySQL without config
                }
            },
            include: {
                roles: {
                    include: { role: true }
                }
            }
        });

        if (!user) {
            console.log(`❌ User '${targetName}' not found.`);
            // Fallback: Check all users
            const allUsers = await prisma.user.findMany();
            console.log('Available users:', allUsers.map(u => u.name));
            return;
        }

        console.log(`Found User: ${user.name} (ID: ${user.id})`);
        console.log(`Current Phone: ${user.phone}`);
        console.log(`Roles: ${user.roles.map(r => r.role.name).join(', ')}`);

        // Update Phone
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { phone: newPhone }
        });

        console.log(`✅ Successfully updated phone number to: ${updatedUser.phone}`);

    } catch (error) {
        console.error('Error updating user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateAdminPhone();
