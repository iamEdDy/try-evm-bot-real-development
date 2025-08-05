import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import bot modules
import { WalletManager } from '../walletManager.js';

// Import authentication
import { authenticateToken, requireAdmin } from './auth.js';
import authRoutes from './authRoutes.js';
import database from './database.js';

// Bot functions for real-time updates (will be loaded later)
let reloadWalletsFromAPI = null;
let reloadConfigFromAPI = null;

// Function to load bot functions
async function loadBotFunctions() {
    try {
        console.log('Attempting to load bot functions...');
        
        // Add timeout to prevent hanging
        const importPromise = import('../index.js');
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Bot import timeout')), 5000)
        );
        
        const botModule = await Promise.race([importPromise, timeoutPromise]);
        reloadWalletsFromAPI = botModule.reloadWalletsFromAPI;
        reloadConfigFromAPI = botModule.reloadConfigFromAPI;
        console.log('Bot functions imported successfully for real-time updates');
    } catch (error) {
        console.log('Bot functions not available, running in standalone mode:', error.message);
        // Set default functions that do nothing
        reloadWalletsFromAPI = async () => console.log('Bot reload requested but bot not available');
        reloadConfigFromAPI = async () => console.log('Config reload requested but bot not available');
    }
}

// Dynamic configuration loading
function loadConfig() {
    try {
        const configPath = path.join(__dirname, '..', 'config', 'config.json');
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
    } catch (error) {
        console.error('Failed to load config:', error);
        return {
            chains: ["ethereum", "bsc", "polygon", "arbitrum"],
            gasPriceMultiplier: 1.5,
            gasPriceCacheDuration: 1000,
            nonceUpdateInterval: 5000,
            metricsUpdateInterval: 5000,
            backupCheckInterval: 100,
            minBalanceToKeep: "0.01",
            nativeTokenSupport: true,
            nativeTokenGasLimit: 21000,
            nativeTokenMinBalance: "0.001",
            checkInterval: 100,
            maxGasPrice: 100,
            minBalanceThreshold: 0.001,
            enableMempoolMonitoring: true,
            enableWebSocket: true,
            maxRetries: 3,
            retryDelay: 1000,
            enableLogging: true,
            logLevel: 'info',
            enableMetrics: true,
            metricsInterval: 5000
        };
    }
}

// Load chains configuration
function loadChainsConfig() {
    try {
        const chainsPath = path.join(__dirname, '..', 'config', 'chains.json');
        if (fs.existsSync(chainsPath)) {
            const chainsData = fs.readFileSync(chainsPath, 'utf8');
            return JSON.parse(chainsData);
        }
        return {};
    } catch (error) {
        console.error('Failed to load chains config:', error);
        return {};
    }
}

let config = loadConfig();
let chainsConfig = loadChainsConfig();

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());

// Initialize wallet manager
const walletManager = new WalletManager();

// Global metrics store
let globalMetrics = {
    startTime: Date.now(),
    totalWallets: 0,
    totalTokens: 0,
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    nativeTokenSupport: config.nativeTokenSupport,
    chains: Object.keys(chainsConfig),
    lastUpdate: new Date().toISOString()
};

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Send initial data
    socket.emit('bot-status', {
        status: 'running',
        metrics: globalMetrics,
        config: config
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
    
    // Listen for wallet updates from frontend
    socket.on('wallet-updated', () => {
        console.log('Wallet updated, notifying all clients to reload wallets');
        io.emit('wallet-updated');
    });
    
    socket.on('wallet-added', () => {
        console.log('Wallet added, notifying all clients to reload wallets');
        io.emit('wallet-added');
    });
    
    socket.on('wallet-removed', () => {
        console.log('Wallet removed, notifying all clients to reload wallets');
        io.emit('wallet-removed');
    });
    
    // Listen for token updates from frontend
    socket.on('token-added', () => {
        console.log('Token added, notifying all clients to reload wallets');
        io.emit('wallet-updated');
    });
    
    socket.on('token-removed', () => {
        console.log('Token removed, notifying all clients to reload wallets');
        io.emit('wallet-updated');
    });
    
    // Listen for config updates from frontend
    socket.on('config-updated', () => {
        console.log('Config updated, notifying all clients to reload config');
        io.emit('config-updated');
    });
});

// Helper function to broadcast events to all connected clients
function broadcastEvent(eventName, data = {}) {
    console.log(`📡 Broadcasting ${eventName} to all connected clients`);
    io.emit(eventName, data);
}

// Update metrics function (called by bot)
function updateMetrics(metrics) {
    globalMetrics = { ...globalMetrics, ...metrics, lastUpdate: new Date().toISOString() };
    io.emit('metrics-update', globalMetrics);
}

// Reset metrics function (called by bot on startup)
function resetMetrics() {
    console.log('Resetting API server metrics to clean state...');
    globalMetrics = {
        startTime: Date.now(),
        totalWallets: 0,
        totalTokens: 0,
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        nativeTokenSupport: config.nativeTokenSupport,
        chains: Object.keys(chainsConfig),
        lastUpdate: new Date().toISOString()
    };
    io.emit('metrics-update', globalMetrics);
    console.log('API server metrics reset complete');
}

// Update metrics from wallet manager
async function updateMetricsFromWalletManager() {
    try {
        // Reload wallets from database to get latest data
        await walletManager.reloadWallets();
        
        const stats = walletManager.getStats();
        globalMetrics = {
            ...globalMetrics,
            totalWallets: stats.totalWallets,
            activeWallets: stats.activeWallets,
            totalTokens: stats.totalTokens,
            lastUpdate: new Date().toISOString()
        };
        io.emit('metrics-update', globalMetrics);
    } catch (error) {
        console.error('Failed to update metrics from wallet manager:', error.message);
    }
}

// Authentication routes
app.use('/api/auth', authRoutes);

// API Routes

// Get bot status and metrics
app.get('/api/status', (req, res) => {
    // Format metrics to ensure RPC errors display properly
    const formattedMetrics = { ...globalMetrics };
    
    // Format RPC errors to show actual error messages
    if (formattedMetrics.chains) {
        Object.keys(formattedMetrics.chains).forEach(chain => {
            const chainMetric = formattedMetrics.chains[chain];
            if (chainMetric.rpcErrors && typeof chainMetric.rpcErrors === 'object') {
                // Convert object to displayable format
                chainMetric.rpcErrors = {
                    count: chainMetric.rpcErrors.count || 0,
                    lastError: chainMetric.rpcErrors.lastError || 'No errors',
                    lastErrorTime: chainMetric.rpcErrors.lastErrorTime || null
                };
            }
        });
    }
    
    res.json({
        status: 'running',
        metrics: formattedMetrics,
        config: config,
        timestamp: new Date().toISOString()
    });
});

// Get all wallets (authenticated)
app.get('/api/wallets', authenticateToken, async (req, res) => {
    try {
        let wallets;
        if (req.user.role === 'admin') {
            // Admin can see all wallets
            wallets = await database.getAllWallets();
        } else {
            // Users can only see their own wallets
            wallets = await database.getWalletsByUserId(req.user.id);
        }
        
        res.json({
            success: true,
            wallets: wallets,
            count: wallets.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get active wallets (authenticated)
app.get('/api/wallets/active', authenticateToken, async (req, res) => {
    try {
        let wallets;
        if (req.user.role === 'admin') {
            wallets = await database.getAllWallets();
        } else {
            wallets = await database.getWalletsByUserId(req.user.id);
        }
        
        const activeWallets = wallets.filter(wallet => !wallet.isPaused && wallet.status === 'active');
        
        res.json({
            success: true,
            wallets: activeWallets,
            count: activeWallets.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Add new wallet (authenticated)
app.post('/api/wallets', authenticateToken, async (req, res) => {
    try {
        const { privateKey, name, chains, baseTokenRecipient } = req.body;
        
        if (!privateKey) {
            return res.status(400).json({
                success: false,
                error: 'Private key is required'
            });
        }

        // Generate wallet address from private key
        let walletAddress;
        try {
            const wallet = new ethers.Wallet(privateKey);
            walletAddress = wallet.address;
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid private key format'
            });
        }
        
        const walletData = await database.createWallet(req.user.id, {
            privateKey,
            name: name || '',
            address: walletAddress,
            chains: chains || ['ethereum'],
            baseTokenRecipient: baseTokenRecipient || ''
        });
        
        if (walletData) {
            // Update metrics after adding wallet
            await updateMetricsFromWalletManager();
            
            // Broadcast wallet added event to all clients
            broadcastEvent('wallet-added', { wallet: walletData });
            
            res.json({
                success: true,
                wallet: walletData,
                message: 'Wallet added successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to add wallet'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Pause/unpause wallet (authenticated)
app.post('/api/wallets/:privateKey/toggle', authenticateToken, async (req, res) => {
    try {
        const { privateKey } = req.params;
        
        // Get user's wallets
        let wallets;
        if (req.user.role === 'admin') {
            wallets = await database.getAllWallets();
        } else {
            wallets = await database.getWalletsByUserId(req.user.id);
        }
        
        const wallet = wallets.find(w => w.privateKey === privateKey);
        
        if (!wallet) {
            return res.status(404).json({
                success: false,
                error: 'Wallet not found'
            });
        }
        
        // Toggle pause status
        wallet.isPaused = !wallet.isPaused;
        wallet.status = wallet.isPaused ? 'paused' : 'active';
        
        // Update in database
        await database.updateWallet(wallet.id, wallet);
        
        // Update metrics after wallet status change
        await updateMetricsFromWalletManager();
        
        // Broadcast wallet updated event to all clients
        broadcastEvent('wallet-updated', { wallet: wallet.id, isPaused: wallet.isPaused });
        
        res.json({
            success: true,
            wallet: wallet,
            message: `Wallet ${wallet.isPaused ? 'paused' : 'unpaused'} successfully`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update wallet (authenticated)
app.put('/api/wallets/:privateKey', authenticateToken, async (req, res) => {
    try {
        const { privateKey } = req.params;
        const { name, chains, baseTokenRecipient } = req.body;
        
        // Get user's wallets
        let wallets;
        if (req.user.role === 'admin') {
            wallets = await database.getAllWallets();
        } else {
            wallets = await database.getWalletsByUserId(req.user.id);
        }
        
        const wallet = wallets.find(w => w.privateKey === privateKey);
        
        if (!wallet) {
            return res.status(404).json({
                success: false,
                error: 'Wallet not found'
            });
        }
        
        // Update wallet fields
        if (name !== undefined) wallet.name = name;
        if (chains !== undefined) wallet.chains = chains;
        if (baseTokenRecipient !== undefined) wallet.baseTokenRecipient = baseTokenRecipient;
        
        // Update in database
        await database.updateWallet(wallet.id, wallet);
        
        // Update metrics after wallet update
        await updateMetricsFromWalletManager();
        
        // Broadcast wallet updated event to all clients
        broadcastEvent('wallet-updated', { wallet: wallet.id, updates: { name, chains, baseTokenRecipient } });
        
        res.json({
            success: true,
            wallet: wallet,
            message: 'Wallet updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Remove wallet (authenticated)
app.delete('/api/wallets/:privateKey', authenticateToken, async (req, res) => {
    try {
        const { privateKey } = req.params;
        
        // Get user's wallets
        let wallets;
        if (req.user.role === 'admin') {
            wallets = await database.getAllWallets();
        } else {
            wallets = await database.getWalletsByUserId(req.user.id);
        }
        
        const wallet = wallets.find(w => w.privateKey === privateKey);
        
        if (!wallet) {
            return res.status(404).json({
                success: false,
                error: 'Wallet not found'
            });
        }
        
        const success = await database.deleteWallet(wallet.id);
        
        if (success) {
            // Update metrics after removing wallet
            await updateMetricsFromWalletManager();
            
            // Broadcast wallet removed event to all clients
            broadcastEvent('wallet-removed', { privateKey });
            
            res.json({
                success: true,
                message: 'Wallet removed successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to remove wallet'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Add token to wallet (authenticated)
app.post('/api/wallets/:privateKey/tokens', authenticateToken, async (req, res) => {
    try {
        const { privateKey } = req.params;
        const { tokenAddress, recipientAddress, name, tokenName, chain, tokenType } = req.body;
        
        // Get user's wallets
        let wallets;
        if (req.user.role === 'admin') {
            wallets = await database.getAllWallets();
        } else {
            wallets = await database.getWalletsByUserId(req.user.id);
        }
        
        const wallet = wallets.find(w => w.privateKey === privateKey);
        
        if (!wallet) {
            return res.status(404).json({
                success: false,
                error: 'Wallet not found'
            });
        }
        
        // Add token to wallet
        const newToken = {
            tokenAddress,
            recipientAddress,
            name: name || tokenName || 'Unnamed Token',
            chain,
            tokenType: tokenType || 'erc20',
            addedAt: new Date().toISOString(),
            totalTransferred: '0',
            transactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            lastChecked: null,
            lastTransfer: null
        };
        
        wallet.tokens.push(newToken);
        
        // Update wallet in database
        await database.updateWallet(wallet.id, wallet);
        
        // Update metrics after adding token
        await updateMetricsFromWalletManager();
        
        // Broadcast token added event to all clients
        broadcastEvent('token-added', { wallet: wallet.id, token: newToken });
        
        // Notify bot to reload wallets immediately
        if (reloadWalletsFromAPI) {
            try {
                await reloadWalletsFromAPI();
                console.log('✅ Bot wallets reloaded after token addition');
            } catch (error) {
                console.error('❌ Failed to reload bot wallets after token addition:', error.message);
            }
        }
        
        // Also emit WebSocket event as backup
        broadcastEvent('wallet-updated');
        
        res.json({
            success: true,
            message: 'Token added successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Remove token from wallet (authenticated)
app.delete('/api/wallets/:privateKey/tokens/:tokenAddress', authenticateToken, async (req, res) => {
    try {
        const { privateKey, tokenAddress } = req.params;
        const { chain } = req.query;
        
        // Get user's wallets
        let wallets;
        if (req.user.role === 'admin') {
            wallets = await database.getAllWallets();
        } else {
            wallets = await database.getWalletsByUserId(req.user.id);
        }
        
        const wallet = wallets.find(w => w.privateKey === privateKey);
        
        if (!wallet) {
            return res.status(404).json({
                success: false,
                error: 'Wallet not found'
            });
        }
        
        // Remove token from wallet
        wallet.tokens = wallet.tokens.filter(token => 
            !(token.tokenAddress === tokenAddress && token.chain === chain)
        );
        
        // Update wallet in database
        await database.updateWallet(wallet.id, wallet);
        
        // Update metrics after removing token
        await updateMetricsFromWalletManager();
        
        // Broadcast token removed event to all clients
        broadcastEvent('token-removed', { wallet: wallet.id, tokenAddress, chain });
        
        // Notify bot to reload wallets immediately
        if (reloadWalletsFromAPI) {
            try {
                await reloadWalletsFromAPI();
                console.log('✅ Bot wallets reloaded after token removal');
            } catch (error) {
                console.error('❌ Failed to reload bot wallets after token removal:', error.message);
            }
        }
        
        // Also emit WebSocket event as backup
        broadcastEvent('wallet-updated');
        
        res.json({
            success: true,
            message: 'Token removed successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get configuration (authenticated)
app.get('/api/config', authenticateToken, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            // Admin gets the global config
            res.json({
                success: true,
                config: config
            });
        } else {
            // Regular users get their specific config
            const userConfig = await database.getUserConfig(req.user.id);
            if (!userConfig) {
                return res.status(404).json({
                    success: false,
                    error: 'User configuration not found'
                });
            }
            
            res.json({
                success: true,
                config: userConfig
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update configuration (authenticated - users can update their own config, admin can update global)
app.put('/api/config', authenticateToken, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            // Admin updates global config
            const updatedConfig = req.body;
            config = { ...config, ...updatedConfig };
            
            // Save to file
            const configPath = path.join(__dirname, '..', 'config', 'config.json');
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            
            // Emit config reload event to bot
            io.emit('reload-config');
            
            res.json({
                success: true,
                message: 'Global configuration updated successfully',
                config: config
            });
        } else {
            // Regular users update their own config
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
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Reload configuration (admin only)
app.post('/api/config/reload', authenticateToken, requireAdmin, (req, res) => {
    try {
        config = loadConfig();
        res.json({
            success: true,
            message: 'Configuration reloaded successfully',
            config: config
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get chains configuration (authenticated)
app.get('/api/chains', authenticateToken, (req, res) => {
    res.json({
        success: true,
        chains: chainsConfig
    });
});

// Get statistics (authenticated)
app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
        let wallets;
        if (req.user.role === 'admin') {
            wallets = await database.getAllWallets();
        } else {
            wallets = await database.getWalletsByUserId(req.user.id);
        }
        
        const stats = {
            totalWallets: wallets.length,
            activeWallets: wallets.filter(w => !w.isPaused && w.status === 'active').length,
            totalTokens: wallets.reduce((sum, w) => sum + (w.tokens ? w.tokens.length : 0), 0),
            totalTransactions: wallets.reduce((sum, w) => sum + (w.transactions || 0), 0),
            successfulTransactions: wallets.reduce((sum, w) => sum + (w.successfulTransactions || 0), 0),
            failedTransactions: wallets.reduce((sum, w) => sum + (w.failedTransactions || 0), 0)
        };
        
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get metrics (authenticated)
app.get('/api/metrics', authenticateToken, (req, res) => {
    res.json({
        success: true,
        metrics: globalMetrics
    });
});

// Start server
const PORT = process.env.PORT || 3002;

async function startServer() {
    // Load bot functions first
    await loadBotFunctions();
    
    server.listen(PORT, () => {
        console.log(`API Server running on port ${PORT}`);
        console.log('WebSocket server ready for frontend connections');
    });
}

// Export for bot usage
export { updateMetrics, resetMetrics, startServer, io };
// Start the server
startServer(); 
