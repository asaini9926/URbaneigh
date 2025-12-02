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

        res.json({
            revenue: revenueAgg._sum.amount || 0,
            totalOrders,
            totalCustomers,
            lowStock,
            recentOrders
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};