// server/controllers/authController.js
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const admin = require('../config/firebase'); // Firebase Admin

const prisma = new PrismaClient();

// Login with OTP (Mobile Number)
exports.loginWithOtp = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ message: 'Firebase ID Token is required' });
        }

        // 1. Verify Firebase Token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { phone_number, uid } = decodedToken;

        if (!phone_number) {
            return res.status(400).json({ message: 'Phone number not found in token' });
        }

        // 2. Find or Create User
        // Robust lookup: Check for exact match OR match without country code (last 10 digits)
        // This prevents creating duplicates if DB has '9876543210' but Firebase sends '+919876543210'
        const phoneLast10 = phone_number.slice(-10);

        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: phone_number },           // Exact match (+91...)
                    { phone: phoneLast10 },            // Local match (987...)
                    { phone: `+91${phoneLast10}` }     // Explicit +91 match if input was clean
                ]
            },
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
                },
                addresses: { where: { isDefault: true }, take: 1 }
            }
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    phone: phone_number,
                    // Name is initially null, will be updated when they set a default address
                    roles: {
                        create: {
                            role: { connect: { name: 'Customer' } } // Ensure 'Customer' role exists in DB seeding
                        }
                    }
                },
                include: {
                    roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } }
                }
            });
        } else {
            // Sync name if default address exists and name is different
            if (user.addresses.length > 0 && user.addresses[0].name && user.name !== user.addresses[0].name) {
                // Optional: We can decide if we want to auto-update user name from default address here or keep it separate
                // For now, let's keep user.name as authoritative.
            }
        }

        // 3. Generate JWT Token
        const token = jwt.sign(
            { id: user.id, phone: user.phone },
            process.env.JWT_SECRET,
            { expiresIn: '30d' } // Longer session for mobile users
        );

        // Flatten permissions
        const permissions = user.roles?.flatMap(ur =>
            ur.role?.permissions.map(rp => rp.permission.action)
        ) || [];

        // 4. Send Response
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                roles: user.roles?.map(r => r.role.name) || [],
                permissions: [...new Set(permissions)]
            },
            token
        });

    } catch (error) {
        console.error('OTP Login Error:', error);
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Logout
exports.logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
};

// Dev Login (Bypass Firebase)
exports.loginDev = async (req, res) => {
    try {
        const { email } = req.body;
        // In real app, check a secret header or similar. Here we assume local dev environment.

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

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email }, // Use email/id as payload
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        const permissions = user.roles?.flatMap(ur =>
            ur.role?.permissions.map(rp => rp.permission.action)
        ) || [];

        res.cookie('token', token, { httpOnly: true });
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                roles: user.roles?.map(r => r.role.name) || [],
                permissions: [...new Set(permissions)]
            }
        });

    } catch (error) {
        console.error('Dev Login Error:', error);
        res.status(500).json({ message: error.message });
    }
};
