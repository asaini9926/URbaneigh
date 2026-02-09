const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

// Get All Permissions
exports.getPermissions = async (req, res) => {
    try {
        const perms = await prisma.permission.findMany();
        res.json(perms);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get All Roles (with their permissions)
exports.getRoles = async (req, res) => {
    try {
        const roles = await prisma.role.findMany({
            include: {
                permissions: {
                    include: { permission: true }
                }
            }
        });
        res.json(roles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create New Role
exports.createRole = async (req, res) => {
    try {
        const { name, permissions } = req.body; // permissions is array of IDs [1, 2, 5]

        const role = await prisma.role.create({
            data: {
                name,
                description: `Custom role: ${name}`,
                permissions: {
                    create: permissions.map(permId => ({
                        permission: { connect: { id: permId } }
                    }))
                }
            }
        });
        res.status(201).json(role);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


// ... existing imports and functions

// Get All Users (with their current roles)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                roles: {
                    include: { role: true }
                }
            }
        });

        // Simplify the data structure for the frontend
        const formattedUsers = users.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.roles.length > 0 ? user.roles[0].role.name : 'Customer', // Default to Customer if no role
            roleId: user.roles.length > 0 ? user.roles[0].role.id : null
        }));

        res.json(formattedUsers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Assign Role to User
exports.updateUserRole = async (req, res) => {
    try {
        const { userId, roleId } = req.body;

        // 1. Remove ALL existing roles for this user (Start fresh)
        await prisma.userRole.deleteMany({
            where: { userId: Number(userId) }
        });

        // 2. Assign the NEW role
        // If roleId is passed as null/0, they become a regular customer (no role)
        if (roleId) {
            await prisma.userRole.create({
                data: {
                    userId: Number(userId),
                    roleId: Number(roleId)
                }
            });
        }

        res.json({ message: 'User role updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { name, email, password, phone, roleId } = req.body;

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                phone,
                password_hash: hashedPassword,
                // Automatically assign role if provided
                roles: roleId ? {
                    create: { roleId: Number(roleId) }
                } : undefined
            }
        });

        res.status(201).json({ message: 'User created successfully', user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// [ADMIN] Delete User
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        // First delete related records (roles/orders handles by cascade usually, but safe to delete roles)
        await prisma.userRole.deleteMany({ where: { userId: Number(id) } });
        await prisma.user.delete({ where: { id: Number(id) } });

        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Customers (Filtered, with stats)
exports.getCustomers = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        const where = {
            roles: {
                none: {
                    role: { name: { in: ['Admin', 'SuperAdmin', 'Super Admin'] } }
                }
            }
        };

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take,
                include: {
                    roles: { include: { role: true } },
                    _count: { select: { orders: true } },
                    cart: { include: { items: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count({ where })
        ]);

        const formattedUsers = users.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.roles.length > 0 ? user.roles[0].role.name : 'Customer',
            ordersCount: user._count.orders,
            cartItemsCount: user.cart ? user.cart.items.reduce((acc, item) => acc + item.quantity, 0) : 0,
            createdAt: user.createdAt
        }));

        res.json({
            data: formattedUsers,
            meta: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / take)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get All Active Carts
exports.getAllCarts = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        const where = {
            items: { some: {} } // Only carts with items
        };

        const [carts, total] = await Promise.all([
            prisma.cart.findMany({
                where,
                skip,
                take,
                include: {
                    user: {
                        select: { id: true, name: true, phone: true, email: true }
                    },
                    items: {
                        include: {
                            variant: {
                                include: {
                                    product: { select: { title: true, id: true } }
                                }
                            }
                        }
                    }
                }
            }),
            prisma.cart.count({ where })
        ]);

        // Calculate totals for UI convenience
        const formattedCarts = carts.map(cart => {
            const totalItems = cart.items.reduce((acc, item) => acc + item.quantity, 0);
            const estimatedValue = cart.items.reduce((acc, item) => acc + (Number(item.variant.price) * item.quantity), 0);
            return {
                ...cart,
                totalItems,
                estimatedValue
            };
        });

        res.json({
            data: formattedCarts,
            meta: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / take)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.getDashboardStats = async (req, res) => {
    try {
        // 1. Total Revenue (Sum of COMPLETED payments)
        const revenueAgg = await prisma.payment.aggregate({
            _sum: { amount: true },
            where: { status: 'COMPLETED' }
        });

        // 2. Total Orders
        const totalOrders = await prisma.order.count();

        // 3. Total Customers
        const totalCustomers = await prisma.user.count({
            where: { roles: { none: {} } } // Users with no roles
        });

        // 4. Low Stock Products (less than 5 items)
        const lowStock = await prisma.productVariant.findMany({
            where: { inventory: { quantity: { lte: 5 } } },
            include: { product: true, inventory: true },
            take: 5
        });

        // 5. Recent Orders
        const recentOrders = await prisma.order.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true } } }
        });

        // --- CHART DATA ---

        // 6. Revenue Trend (Last 30 Days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const payments = await prisma.payment.findMany({
            where: {
                status: 'COMPLETED',
                createdAt: { gte: thirtyDaysAgo }
            },
            select: { amount: true, createdAt: true }
        });

        // Group by Date (YYYY-MM-DD)
        const revenueMap = new Map();
        payments.forEach(p => {
            const date = p.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
            revenueMap.set(date, (revenueMap.get(date) || 0) + Number(p.amount));
        });

        // Fill in missing days for smooth chart
        const revenueChart = [];
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            revenueChart.unshift({
                date: dateStr,
                revenue: revenueMap.get(dateStr) || 0
            });
        }

        // 7. Order Status Distribution
        const orderStatusCounts = await prisma.order.groupBy({
            by: ['status'],
            _count: { status: true }
        });
        const orderStatusChart = orderStatusCounts.map(item => ({
            name: item.status,
            value: item._count.status
        }));

        // 8. Top Categories (Items Solf)
        // This is complex in Prisma without raw query on deep relation. 
        // Simplified: Count Products per Category (not sales, but inventory distribution for now? Or just random mock for demo if query too heavy?)
        // Let's try deep query: OrderItem -> Variant -> Product -> Category.
        // Prisma GroupBy on relation is not supported directly.
        // We will fetch all OrderItems with Category and count manually (limit to last 1000 items for perf?)
        const soldItems = await prisma.orderItem.findMany({
            take: 1000,
            orderBy: { id: 'desc' },
            include: {
                variant: {
                    include: {
                        product: { include: { category: true } }
                    }
                }
            }
        });

        const categorySales = {};
        soldItems.forEach(item => {
            const catName = item.variant?.product?.category?.name || 'Uncategorized';
            categorySales[catName] = (categorySales[catName] || 0) + item.quantity;
        });

        const categoryChart = Object.entries(categorySales)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);


        res.json({
            revenue: revenueAgg._sum.amount || 0,
            totalOrders,
            totalCustomers,
            activeCarts: await prisma.cart.count({ where: { items: { some: {} } } }), // Added active carts count
            lowStock,
            recentOrders,
            charts: {
                revenue: revenueChart,
                orderStatus: orderStatusChart,
                categories: categoryChart
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};