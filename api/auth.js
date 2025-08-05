import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import database from './database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Admin authorization middleware
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// User authorization middleware (user can only access their own data)
const requireOwnership = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Admin can access all data
    if (req.user.role === 'admin') {
        return next();
    }
    
    // Users can only access their own data
    const userId = req.params.userId || req.body.userId;
    if (userId && parseInt(userId) !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    next();
};

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, 
            username: user.username, 
            email: user.email, 
            role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// Login function
const login = async (username, password) => {
    try {
        const user = await database.getUserByUsername(username);
        if (!user) {
            throw new Error('User not found');
        }

        const isValidPassword = await database.validatePassword(user, password);
        if (!isValidPassword) {
            throw new Error('Invalid password');
        }

        const token = generateToken(user);
        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            token
        };
    } catch (error) {
        throw error;
    }
};

// Register function
const register = async (username, email, password) => {
    try {
        // Check if user already exists
        const existingUser = await database.getUserByUsername(username);
        if (existingUser) {
            throw new Error('Username already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const user = await database.createUser(username, email, hashedPassword, 'user');
        
        // Generate token
        const token = generateToken(user);
        
        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            token
        };
    } catch (error) {
        throw error;
    }
};

export {
    authenticateToken,
    requireAdmin,
    requireOwnership,
    login,
    register,
    generateToken
}; 