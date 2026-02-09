const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
    const users = await prisma.user.findMany({ take: 5 });
    console.log('Users:', users);
}

listUsers()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
