// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 1. Verify User is Logged In
exports.protect = async (req, res, next) => {
    let token;

    // Check for token in Cookies OR Authorization Header
    if (req.cookies.token) {
        token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, please login' });
    }

    try {
        // Verify Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch User from DB (attach to request object)
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
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
            return res.status(401).json({ message: 'User not found' });
        }

        // Attach user to the request object so next functions can use it
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

// 2. Check for Specific Permission
exports.checkPermission = (requiredPermission) => {
    return (req, res, next) => {
        const user = req.user;

        // Flatten all permissions the user has into a single array of strings
        const userPermissions = user.roles.flatMap(ur =>
            ur.role.permissions.map(rp => rp.permission.action)
        );

        // Check if the user has the required permission OR is a SuperAdmin (bypass)
        const isSuperAdmin = user.roles.some(r => r.role.name === 'SuperAdmin');

        if (isSuperAdmin || userPermissions.includes(requiredPermission)) {
            return next();
        }

        return res.status(403).json({ message: `Access denied. Requires '${requiredPermission}' permission.` });
    };
};