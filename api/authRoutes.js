import express from 'express';
import { login, register, authenticateToken, requireAdmin } from './auth.js';
import database from './database.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Login route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const result = await login(username, password);
        res.json({
            success: true,
            message: 'Login successful',
            ...result
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            error: error.message
        });
    }
});

// Register route
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        const result = await register(username, email, password);
        res.json({
            success: true,
            message: 'Registration successful',
            ...result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await database.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Admin: Get all users
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await database.getAllUsers();
        res.json({
            success: true,
            users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Admin: Create user
router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await database.createUser(username, email, hashedPassword, role || 'user');
        
        res.json({
            success: true,
            message: 'User created successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Admin: Delete user
router.delete('/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        await database.deleteUser(userId);
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        // Get user from database
        const user = await database.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isValidPassword = await database.validatePassword(user, currentPassword);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password in database
        await database.updateUserPassword(user.id, hashedPassword);
        
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Get user configuration
router.get('/config', authenticateToken, async (req, res) => {
    try {
        const config = await database.getUserConfig(req.user.id);
        if (!config) {
            return res.status(404).json({ error: 'Configuration not found' });
        }
        
        res.json({
            success: true,
            config
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update user configuration
router.put('/config', authenticateToken, async (req, res) => {
    try {
        const configData = req.body;
        const success = await database.updateUserConfig(req.user.id, configData);
        
        if (success) {
            res.json({
                success: true,
                message: 'Configuration updated successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Configuration not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
