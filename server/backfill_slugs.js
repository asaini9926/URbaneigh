const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
        .replace(/^-+|-+$/g, '');   // Trim leading/trailing hyphens
}

async function main() {
    const products = await prisma.product.findMany(); // Fetch all

    console.log(`Found ${products.length} products total.`);

    for (const p of products) {
        if (p.slug) continue; // Skip if already has slug

        let slug = generateSlug(p.title);

        // Check uniqueness
        let existing = await prisma.product.findUnique({ where: { slug } });
        let count = 1;
        while (existing) {
            slug = `${generateSlug(p.title)}-${count}`;
            existing = await prisma.product.findUnique({ where: { slug } });
            count++;
        }

        await prisma.product.update({
            where: { id: p.id },
            data: { slug }
        });
        console.log(`Updated product ${p.id}: ${p.title} -> ${slug}`);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
