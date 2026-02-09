// server/controllers/userController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get User Profile with Addresses
exports.getProfile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                addresses: true
            }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Add Address
exports.addAddress = async (req, res) => {
    try {
        const { fullAddress, pincode, city, state, isDefault, name } = req.body;
        const userId = req.user.id;

        // If this is set as default, unset other defaults
        if (isDefault) {
            await prisma.address.updateMany({
                where: { userId },
                data: { isDefault: false }
            });
        }

        // If user has no name yet, set it from this address
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user.name && name) {
            await prisma.user.update({
                where: { id: userId },
                data: { name }
            });
        }

        // Also if setting default, update user name if provided
        if (isDefault && name) {
            await prisma.user.update({
                where: { id: userId },
                data: { name }
            });
        }

        const address = await prisma.address.create({
            data: {
                userId,
                fullAddress,
                pincode,
                city,
                state,
                isDefault: isDefault || false // Handle optional
                // Note: Schema.prisma Address model doesn't have 'name' column yet?
                // The user request said "default address which the name in default address will be set as users name".
                // I need to check schema if Address has 'name'. 
                // Ah, I checked schema in step 105, Address model:
                // model Address { id, userId, fullAddress, pincode, city, state, isDefault, user }
                // It DOES NOT have 'name'. 
                // I should add 'name' to Address model or just use the logic to update User.name.
                // Re-reading user request: "The name in default address will be set as users name".
                // Usually an address block has a "Recipient Name".
                // I should probably ADD 'name' (Recipient Name) to the Address model.
            }
        });

        res.status(201).json(address);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update Address (Set Default)
exports.setDefaultAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { name } = req.body; // Pass name if we want to sync it

        // Unset all
        await prisma.address.updateMany({
            where: { userId },
            data: { isDefault: false }
        });

        // Set specific as default
        const address = await prisma.address.update({
            where: { id: parseInt(id) },
            data: { isDefault: true }
        });

        // Update User Name if name is provided in the request
        if (name) {
            await prisma.user.update({
                where: { id: userId },
                data: { name }
            });
        }

        res.json({ message: 'Default address updated', address });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete Address
exports.deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.address.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Address deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
