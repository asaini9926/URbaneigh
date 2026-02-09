const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
    const user = await prisma.user.findFirst();
    if (user) {
        console.log('EMAIL: ' + user.email);
    } else {
        console.log('No users found');
    }
}

listUsers()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
