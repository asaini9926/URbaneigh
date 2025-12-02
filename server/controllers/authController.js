// server/controllers/authController.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Register (Optional for now, but good to have)
exports.register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user (Default role: Customer? We need to fetch that ID dynamically later)
        // For now, we just create the user without a role, or we assign a default one if you seeded it.
        const user = await prisma.user.create({
            data: {
                name,
                email,
                phone,
                password_hash: hashedPassword,
            }
        });

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Find User
        // We also fetch their Roles and Permissions so the frontend knows what they can do
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    include: { permission: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        // 2. Check Password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        // 3. Generate JWT Token
        // This token contains their ID and is valid for 1 day
        const token = jwt.sign(
            { id: user.id, email: user.email }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        // 4. Send Response (Cookie + JSON)
        res.cookie('token', token, {
            httpOnly: true, // Prevents XSS attacks
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        // Flatten permissions for easier frontend use
        const permissions = user.roles.flatMap(ur => 
            ur.role.permissions.map(rp => rp.permission.action)
        );

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                roles: user.roles.map(r => r.role.name),
                permissions: [...new Set(permissions)] // Remove duplicates
            },
            token // Sending token in body too, just in case
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Logout
exports.logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
};