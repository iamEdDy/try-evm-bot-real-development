import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { verbose } = sqlite3;

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, 'bot.db');
        this.init();
    }

    init() {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
            } else {
                console.log('Connected to SQLite database');
                this.createTables();
            }
        });
    }

    createTables() {
        // Users table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Chains table - for user-managed chains
        this.db.run(`
            CREATE TABLE IF NOT EXISTS chains (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                chain_key TEXT NOT NULL,
                name TEXT NOT NULL,
                chain_id INTEGER NOT NULL,
                rpc_urls TEXT NOT NULL,
                explorer_url TEXT,
                native_currency TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(user_id, chain_key)
            )
        `);

        // Token standards table - for user-managed token standards
        this.db.run(`
            CREATE TABLE IF NOT EXISTS token_standards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                chain_key TEXT NOT NULL,
                token_type TEXT NOT NULL,
                abi_file TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(user_id, chain_key, token_type)
            )
        `);

        // User configurations table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS user_configs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                chains TEXT NOT NULL,
                gasPriceMultiplier REAL DEFAULT 1.5,
                gasPriceCacheDuration INTEGER DEFAULT 1000,
                nonceUpdateInterval INTEGER DEFAULT 2000,
                metricsUpdateInterval INTEGER DEFAULT 3000,
                backupCheckInterval INTEGER DEFAULT 100,
                minBalanceToKeep TEXT DEFAULT '0',
                nativeTokenSupport INTEGER DEFAULT 1,
                nativeTokenGasLimit INTEGER DEFAULT 21000,
                nativeTokenMinBalance TEXT DEFAULT '0.001',
                checkInterval INTEGER DEFAULT 1000,
                maxGasPrice INTEGER DEFAULT 100,
                minBalanceThreshold REAL DEFAULT 0.001,
                enableMempoolMonitoring INTEGER DEFAULT 1,
                enableWebSocket INTEGER DEFAULT 1,
                maxRetries INTEGER DEFAULT 3,
                retryDelay INTEGER DEFAULT 1000,
                enableLogging INTEGER DEFAULT 1,
                logLevel TEXT DEFAULT 'info',
                enableMetrics INTEGER DEFAULT 1,
                metricsInterval INTEGER DEFAULT 5000,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // Wallets table - maintains same structure as wallets.json
        this.db.run(`
            CREATE TABLE IF NOT EXISTS wallets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                privateKey TEXT NOT NULL,
                name TEXT NOT NULL,
                address TEXT NOT NULL,
                chains TEXT NOT NULL,
                baseTokenRecipient TEXT,
                addedAt TEXT,
                lastChecked TEXT,
                status TEXT DEFAULT 'active',
                tokens TEXT,
                totalTransferred TEXT DEFAULT '0',
                transactions INTEGER DEFAULT 0,
                successfulTransactions INTEGER DEFAULT 0,
                failedTransactions INTEGER DEFAULT 0,
                gasUsed TEXT DEFAULT '0',
                isPaused INTEGER DEFAULT 0,
                lastActive INTEGER,
                chainStats TEXT,
                nativeTokenStats TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // Create demo user and admin if they don't exist
        this.createDemoData();
    }

    async createDemoData() {
        try {
            // Check if demo data already exists
            const existingUsers = await this.getAllUsers();
            if (existingUsers.length > 0) {
                console.log('Demo data already exists, skipping creation');
                return;
            }

            console.log('Creating demo data...');

            // Create admin user
            const adminUser = await this.createUser('admin', 'admin@example.com', 'admin123', 'admin');
            console.log('Created admin user');

            // Create demo user
            const demoUser = await this.createUser('demo', 'demo@example.com', 'demo123', 'user');
            console.log('Created demo user');

            // Add chains for both users
            const chainsData = [
                {
                    key: 'ethereum',
                    name: 'Ethereum Mainnet',
                    chainId: 1,
                    rpcUrls: [
                        'wss://mainnet.infura.io/ws/v3/dfc5c6112e594e43a38688615b7859aa',
                        'wss://eth-mainnet.g.alchemy.com/v2/anWSW3oGEDQVMSZc5jRUcawVjRTsrC5S'
                    ],
                    explorerUrl: 'https://etherscan.io',
                    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
                },
                {
                    key: 'bsc',
                    name: 'BNB Smart Chain',
                    chainId: 56,
                    rpcUrls: [
                        'wss://bsc-mainnet.g.alchemy.com/v2/anWSW3oGEDQVMSZc5jRUcawVjRTsrC5S',
                        'wss://bsc-ws-node.nariox.org:443',
                        'wss://bsc-dataseed1.binance.org/ws'
                    ],
                    explorerUrl: 'https://bscscan.com',
                    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }
                },
                {
                    key: 'polygon',
                    name: 'Polygon Mainnet',
                    chainId: 137,
                    rpcUrls: [
                        'wss://polygon-mainnet.g.alchemy.com/v2/anWSW3oGEDQVMSZc5jRUcawVjRTsrC5S',
                        'wss://polygon-mainnet.infura.io/ws/v3/dfc5c6112e594e43a38688615b7859aa'
                    ],
                    explorerUrl: 'https://polygonscan.com',
                    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }
                },
                {
                    key: 'arbitrum',
                    name: 'Arbitrum One',
                    chainId: 42161,
                    rpcUrls: [
                        'wss://arb-mainnet.g.alchemy.com/v2/anWSW3oGEDQVMSZc5jRUcawVjRTsrC5S',
                        'wss://arbitrum-mainnet.infura.io/ws/v3/dfc5c6112e594e43a38688615b7859aa'
                    ],
                    explorerUrl: 'https://arbiscan.io',
                    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
                },
                {
                    key: 'optimism',
                    name: 'Optimism',
                    chainId: 10,
                    rpcUrls: [
                        'wss://opt-mainnet.g.alchemy.com/v2/anWSW3oGEDQVMSZc5jRUcawVjRTsrC5S',
                        'wss://optimism-mainnet.infura.io/ws/v3/dfc5c6112e594e43a38688615b7859aa'
                    ],
                    explorerUrl: 'https://optimistic.etherscan.io',
                    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
                },
                {
                    key: 'base',
                    name: 'Base',
                    chainId: 8453,
                    rpcUrls: [
                        'wss://base-mainnet.g.alchemy.com/v2/anWSW3oGEDQVMSZc5jRUcawVjRTsrC5S',
                        'wss://mainnet.base.org'
                    ],
                    explorerUrl: 'https://basescan.org',
                    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
                },
                {
                    key: 'avalanche',
                    name: 'Avalanche C-Chain',
                    chainId: 43114,
                    rpcUrls: [
                        'wss://api.avax.network/ext/bc/C/ws',
                        'wss://avalanche-mainnet.infura.io/ws/v3/dfc5c6112e594e43a38688615b7859aa'
                    ],
                    explorerUrl: 'https://snowtrace.io',
                    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 }
                },
                {
                    key: 'fantom',
                    name: 'Fantom Opera',
                    chainId: 250,
                    rpcUrls: [
                        'wss://rpc.ftm.tools',
                        'wss://rpcapi.fantom.network'
                    ],
                    explorerUrl: 'https://ftmscan.com',
                    nativeCurrency: { name: 'Fantom', symbol: 'FTM', decimals: 18 }
                }
            ];

            // Add chains for both users
            for (const user of [adminUser, demoUser]) {
                for (const chain of chainsData) {
                    await this.addChain(
                        user.id,
                        chain.key,
                        chain.name,
                        chain.chainId,
                        chain.rpcUrls,
                        chain.explorerUrl,
                        chain.nativeCurrency
                    );
                }
            }
            console.log('Added chains for all users');

            // Add token standards for both users
            const tokenStandardsData = [
                // Ethereum standards
                { chainKey: 'ethereum', tokenType: 'erc20', abiFile: 'erc20.json' },
                { chainKey: 'ethereum', tokenType: 'erc721', abiFile: 'erc721.json' },
                { chainKey: 'ethereum', tokenType: 'erc1155', abiFile: 'erc1155.json' },
                
                // BSC standards
                { chainKey: 'bsc', tokenType: 'bep20', abiFile: 'erc20.json' },
                { chainKey: 'bsc', tokenType: 'bep721', abiFile: 'erc721.json' },
                
                // Polygon standards
                { chainKey: 'polygon', tokenType: 'erc20', abiFile: 'erc20.json' },
                { chainKey: 'polygon', tokenType: 'erc721', abiFile: 'erc721.json' },
                
                // Arbitrum standards
                { chainKey: 'arbitrum', tokenType: 'erc20', abiFile: 'erc20.json' },
                { chainKey: 'arbitrum', tokenType: 'erc721', abiFile: 'erc721.json' },
                
                // Optimism standards
                { chainKey: 'optimism', tokenType: 'erc20', abiFile: 'erc20.json' },
                { chainKey: 'optimism', tokenType: 'erc721', abiFile: 'erc721.json' },
                
                // Base standards
                { chainKey: 'base', tokenType: 'erc20', abiFile: 'erc20.json' },
                { chainKey: 'base', tokenType: 'erc721', abiFile: 'erc721.json' },
                
                // Avalanche standards
                { chainKey: 'avalanche', tokenType: 'erc20', abiFile: 'erc20.json' },
                { chainKey: 'avalanche', tokenType: 'erc721', abiFile: 'erc721.json' },
                
                // Fantom standards
                { chainKey: 'fantom', tokenType: 'erc20', abiFile: 'erc20.json' },
                { chainKey: 'fantom', tokenType: 'erc721', abiFile: 'erc721.json' }
            ];

            // Add token standards for both users
            for (const user of [adminUser, demoUser]) {
                for (const standard of tokenStandardsData) {
                    await this.addTokenStandard(
                        user.id,
                        standard.chainKey,
                        standard.tokenType,
                        standard.abiFile
                    );
                }
            }
            console.log('Added token standards for all users');

            // Create user configurations
            const defaultConfig = {
                chains: ["ethereum", "bsc", "polygon", "arbitrum", "optimism", "base", "avalanche", "fantom"],
                gasPriceMultiplier: 1.5,
                gasPriceCacheDuration: 1000,
                nonceUpdateInterval: 2000,
                metricsUpdateInterval: 3000,
                backupCheckInterval: 100,
                minBalanceToKeep: "0",
                nativeTokenSupport: true,
                nativeTokenGasLimit: 21000,
                nativeTokenMinBalance: "0.001",
                checkInterval: 1000,
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

            await this.createUserConfig(adminUser.id, defaultConfig);
            await this.createUserConfig(demoUser.id, defaultConfig);
            console.log('Created user configurations');

            // Import existing wallets for demo user
            try {
                const walletsPath = path.join(__dirname, '..', 'wallets.json');
                if (fs.existsSync(walletsPath)) {
                    const walletsData = JSON.parse(fs.readFileSync(walletsPath, 'utf8'));
                    
                    for (const wallet of walletsData) {
                        await this.createWallet(
                            demoUser.id,
                            wallet.privateKey,
                            wallet.name || 'Demo Wallet',
                            wallet.address,
                            wallet.chains || ["ethereum"],
                            wallet.baseTokenRecipient || '',
                            wallet.tokens || []
                        );
                    }
                    console.log(`Imported ${walletsData.length} wallets for demo user`);
                }
            } catch (error) {
                console.log('No existing wallets to import:', error.message);
            }

            console.log('Demo data creation completed successfully');
        } catch (error) {
            console.error('Error creating demo data:', error);
        }
    }

    async importExistingWallets() {
        try {
            const walletsPath = path.join(__dirname, '..', 'wallets.json');
            if (fs.existsSync(walletsPath)) {
                const walletsData = JSON.parse(fs.readFileSync(walletsPath, 'utf8'));
                const demoUser = await this.getUserByUsername('demo');
                
                if (demoUser && walletsData.length > 0) {
                    for (const wallet of walletsData) {
                        await this.createWallet(demoUser.id, wallet);
                    }
                    console.log('Imported existing wallets to demo user');
                }
            }
        } catch (error) {
            console.error('Error importing existing wallets:', error);
        }
    }

    // User management
    async createUser(username, email, password, role = 'user') {
        const self = this; // Store reference to Database instance
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                [username, email, password, role],
                function(err) {
                    if (err) reject(err);
                    else {
                        const userId = this.lastID;
                        // Create default configuration for the user
                        self.createDefaultUserConfig(userId).then(() => {
                            resolve({ id: userId, username, email, role });
                        }).catch(reject);
                    }
                }
            );
        });
    }

    async createDefaultUserConfig(userId) {
        const defaultChains = JSON.stringify([
            "ethereum",
            "bsc", 
            "polygon",
            "arbitrum",
            "optimism",
            "base",
            "avalanche",
            "fantom"
        ]);

        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO user_configs (
                    user_id, chains, gasPriceMultiplier, gasPriceCacheDuration,
                    nonceUpdateInterval, metricsUpdateInterval, backupCheckInterval,
                    minBalanceToKeep, nativeTokenSupport, nativeTokenGasLimit,
                    nativeTokenMinBalance, checkInterval, maxGasPrice,
                    minBalanceThreshold, enableMempoolMonitoring, enableWebSocket,
                    maxRetries, retryDelay, enableLogging, logLevel,
                    enableMetrics, metricsInterval
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId, defaultChains, 1.5, 1000, 2000, 3000, 100, '0', 1, 21000,
                    '0.001', 1000, 100, 0.001, 1, 1, 3, 1000, 1, 'info', 1, 5000
                ],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getUserConfig(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM user_configs WHERE user_id = ?',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else {
                        if (row) {
                            // Convert the config to the expected format
                            const config = {
                                chains: JSON.parse(row.chains),
                                gasPriceMultiplier: row.gasPriceMultiplier,
                                gasPriceCacheDuration: row.gasPriceCacheDuration,
                                nonceUpdateInterval: row.nonceUpdateInterval,
                                metricsUpdateInterval: row.metricsUpdateInterval,
                                backupCheckInterval: row.backupCheckInterval,
                                minBalanceToKeep: row.minBalanceToKeep,
                                nativeTokenSupport: Boolean(row.nativeTokenSupport),
                                nativeTokenGasLimit: row.nativeTokenGasLimit,
                                nativeTokenMinBalance: row.nativeTokenMinBalance,
                                checkInterval: row.checkInterval,
                                maxGasPrice: row.maxGasPrice,
                                minBalanceThreshold: row.minBalanceThreshold,
                                enableMempoolMonitoring: Boolean(row.enableMempoolMonitoring),
                                enableWebSocket: Boolean(row.enableWebSocket),
                                maxRetries: row.maxRetries,
                                retryDelay: row.retryDelay,
                                enableLogging: Boolean(row.enableLogging),
                                logLevel: row.logLevel,
                                enableMetrics: Boolean(row.enableMetrics),
                                metricsInterval: row.metricsInterval
                            };
                            resolve(config);
                        } else {
                            resolve(null);
                        }
                    }
                }
            );
        });
    }

    async updateUserConfig(userId, configData) {
        return new Promise((resolve, reject) => {
            const chains = JSON.stringify(configData.chains || []);
            this.db.run(
                `UPDATE user_configs SET 
                    chains = ?, gasPriceMultiplier = ?, gasPriceCacheDuration = ?,
                    nonceUpdateInterval = ?, metricsUpdateInterval = ?, backupCheckInterval = ?,
                    minBalanceToKeep = ?, nativeTokenSupport = ?, nativeTokenGasLimit = ?,
                    nativeTokenMinBalance = ?, checkInterval = ?, maxGasPrice = ?,
                    minBalanceThreshold = ?, enableMempoolMonitoring = ?, enableWebSocket = ?,
                    maxRetries = ?, retryDelay = ?, enableLogging = ?, logLevel = ?,
                    enableMetrics = ?, metricsInterval = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?`,
                [
                    chains, configData.gasPriceMultiplier, configData.gasPriceCacheDuration,
                    configData.nonceUpdateInterval, configData.metricsUpdateInterval, configData.backupCheckInterval,
                    configData.minBalanceToKeep, configData.nativeTokenSupport ? 1 : 0, configData.nativeTokenGasLimit,
                    configData.nativeTokenMinBalance, configData.checkInterval, configData.maxGasPrice,
                    configData.minBalanceThreshold, configData.enableMempoolMonitoring ? 1 : 0, configData.enableWebSocket ? 1 : 0,
                    configData.maxRetries, configData.retryDelay, configData.enableLogging ? 1 : 0, configData.logLevel,
                    configData.enableMetrics ? 1 : 0, configData.metricsInterval, userId
                ],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes > 0);
                }
            );
        });
    }

    async getUserByUsername(username) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE username = ?',
                [username],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async getUserById(id) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async validatePassword(user, password) {
        return bcrypt.compare(password, user.password);
    }

    // Update user password
    updateUserPassword(userId, hashedPassword) {
        return new Promise((resolve, reject) => {
            this.db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    // Wallet management
    async createWallet(userId, walletData) {
        return new Promise((resolve, reject) => {
            const wallet = {
                privateKey: walletData.privateKey,
                name: walletData.name,
                address: walletData.address,
                chains: JSON.stringify(walletData.chains || []),
                baseTokenRecipient: walletData.baseTokenRecipient,
                addedAt: walletData.addedAt || new Date().toISOString(),
                lastChecked: walletData.lastChecked,
                status: walletData.status || 'active',
                tokens: JSON.stringify(walletData.tokens || []),
                totalTransferred: walletData.totalTransferred || '0',
                transactions: walletData.transactions || 0,
                successfulTransactions: walletData.successfulTransactions || 0,
                failedTransactions: walletData.failedTransactions || 0,
                gasUsed: walletData.gasUsed || '0',
                isPaused: walletData.isPaused ? 1 : 0,
                lastActive: walletData.lastActive,
                chainStats: JSON.stringify(walletData.chainStats || {}),
                nativeTokenStats: JSON.stringify(walletData.nativeTokenStats || {})
            };

            this.db.run(
                `INSERT INTO wallets (
                    user_id, privateKey, name, address, chains, baseTokenRecipient,
                    addedAt, lastChecked, status, tokens, totalTransferred,
                    transactions, successfulTransactions, failedTransactions,
                    gasUsed, isPaused, lastActive, chainStats, nativeTokenStats
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId, wallet.privateKey, wallet.name, wallet.address,
                    wallet.chains, wallet.baseTokenRecipient, wallet.addedAt,
                    wallet.lastChecked, wallet.status, wallet.tokens,
                    wallet.totalTransferred, wallet.transactions,
                    wallet.successfulTransactions, wallet.failedTransactions,
                    wallet.gasUsed, wallet.isPaused, wallet.lastActive,
                    wallet.chainStats, wallet.nativeTokenStats
                ],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, ...wallet });
                }
            );
        });
    }

    async getWalletsByUserId(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM wallets WHERE user_id = ?',
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    else {
                        const wallets = rows.map(row => ({
                            ...row,
                            chains: JSON.parse(row.chains || '[]'),
                            tokens: JSON.parse(row.tokens || '[]'),
                            chainStats: JSON.parse(row.chainStats || '{}'),
                            nativeTokenStats: JSON.parse(row.nativeTokenStats || '{}'),
                            isPaused: Boolean(row.isPaused)
                        }));
                        resolve(wallets);
                    }
                }
            );
        });
    }

    async updateWallet(walletId, walletData) {
        return new Promise((resolve, reject) => {
            const wallet = {
                privateKey: walletData.privateKey,
                name: walletData.name,
                address: walletData.address,
                chains: JSON.stringify(walletData.chains || []),
                baseTokenRecipient: walletData.baseTokenRecipient,
                addedAt: walletData.addedAt,
                lastChecked: walletData.lastChecked,
                status: walletData.status,
                tokens: JSON.stringify(walletData.tokens || []),
                totalTransferred: walletData.totalTransferred,
                transactions: walletData.transactions,
                successfulTransactions: walletData.successfulTransactions,
                failedTransactions: walletData.failedTransactions,
                gasUsed: walletData.gasUsed,
                isPaused: walletData.isPaused ? 1 : 0,
                lastActive: walletData.lastActive,
                chainStats: JSON.stringify(walletData.chainStats || {}),
                nativeTokenStats: JSON.stringify(walletData.nativeTokenStats || {})
            };

            this.db.run(
                `UPDATE wallets SET 
                    privateKey = ?, name = ?, address = ?, chains = ?,
                    baseTokenRecipient = ?, addedAt = ?, lastChecked = ?,
                    status = ?, tokens = ?, totalTransferred = ?,
                    transactions = ?, successfulTransactions = ?,
                    failedTransactions = ?, gasUsed = ?, isPaused = ?,
                    lastActive = ?, chainStats = ?, nativeTokenStats = ?
                WHERE id = ?`,
                [
                    wallet.privateKey, wallet.name, wallet.address,
                    wallet.chains, wallet.baseTokenRecipient, wallet.addedAt,
                    wallet.lastChecked, wallet.status, wallet.tokens,
                    wallet.totalTransferred, wallet.transactions,
                    wallet.successfulTransactions, wallet.failedTransactions,
                    wallet.gasUsed, wallet.isPaused, wallet.lastActive,
                    wallet.chainStats, wallet.nativeTokenStats, walletId
                ],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: walletId, ...wallet });
                }
            );
        });
    }

    async deleteWallet(walletId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM wallets WHERE id = ?',
                [walletId],
                function(err) {
                    if (err) reject(err);
                    else resolve({ success: true });
                }
            );
        });
    }

    async getAllWallets() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM wallets',
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else {
                        const wallets = rows.map(row => ({
                            ...row,
                            chains: JSON.parse(row.chains || '[]'),
                            tokens: JSON.parse(row.tokens || '[]'),
                            chainStats: JSON.parse(row.chainStats || '{}'),
                            nativeTokenStats: JSON.parse(row.nativeTokenStats || '{}'),
                            isPaused: Boolean(row.isPaused)
                        }));
                        resolve(wallets);
                    }
                }
            );
        });
    }

    async getAllUsers() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT id, username, email, role, created_at FROM users',
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async deleteUser(userId) {
        return new Promise((resolve, reject) => {
            // First delete user's wallets
            this.db.run('DELETE FROM wallets WHERE user_id = ?', [userId], (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Then delete user's configuration
                this.db.run('DELETE FROM user_configs WHERE user_id = ?', [userId], (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    // Finally delete the user
                    this.db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(this.changes > 0);
                        }
                    });
                });
            });
        });
    }

    // Chain management methods
    async addChain(userId, chainKey, name, chainId, rpcUrls, explorerUrl, nativeCurrency) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO chains (user_id, chain_key, name, chain_id, rpc_urls, explorer_url, native_currency)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([
                userId,
                chainKey,
                name,
                chainId,
                JSON.stringify(rpcUrls),
                explorerUrl,
                JSON.stringify(nativeCurrency)
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, chainKey, name });
                }
            });
            stmt.finalize();
        });
    }

    async getChains(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM chains WHERE user_id = ? AND is_active = 1 ORDER BY chain_key',
                [userId],
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        const chains = {};
                        rows.forEach(row => {
                            chains[row.chain_key] = {
                                name: row.name,
                                chainId: row.chain_id,
                                rpc: JSON.parse(row.rpc_urls),
                                explorer: row.explorer_url,
                                nativeCurrency: JSON.parse(row.native_currency)
                            };
                        });
                        resolve(chains);
                    }
                }
            );
        });
    }

    async getAllChains() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM chains WHERE is_active = 1 ORDER BY user_id, chain_key',
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        const chains = {};
                        rows.forEach(row => {
                            if (!chains[row.user_id]) {
                                chains[row.user_id] = {};
                            }
                            chains[row.user_id][row.chain_key] = {
                                name: row.name,
                                chainId: row.chain_id,
                                rpc: JSON.parse(row.rpc_urls),
                                explorer: row.explorer_url,
                                nativeCurrency: JSON.parse(row.native_currency)
                            };
                        });
                        resolve(chains);
                    }
                }
            );
        });
    }

    async updateChain(userId, chainKey, updates) {
        return new Promise((resolve, reject) => {
            const fields = [];
            const values = [];
            
            if (updates.name) {
                fields.push('name = ?');
                values.push(updates.name);
            }
            if (updates.chainId) {
                fields.push('chain_id = ?');
                values.push(updates.chainId);
            }
            if (updates.rpcUrls) {
                fields.push('rpc_urls = ?');
                values.push(JSON.stringify(updates.rpcUrls));
            }
            if (updates.explorerUrl) {
                fields.push('explorer_url = ?');
                values.push(updates.explorerUrl);
            }
            if (updates.nativeCurrency) {
                fields.push('native_currency = ?');
                values.push(JSON.stringify(updates.nativeCurrency));
            }
            
            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(userId, chainKey);
            
            const stmt = this.db.prepare(`
                UPDATE chains SET ${fields.join(', ')} 
                WHERE user_id = ? AND chain_key = ?
            `);
            
            stmt.run(values, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
            stmt.finalize();
        });
    }

    async deleteChain(userId, chainKey) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE chains SET is_active = 0 WHERE user_id = ? AND chain_key = ?',
                [userId, chainKey],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ changes: this.changes });
                    }
                }
            );
        });
    }

    // Token standards management methods
    async addTokenStandard(userId, chainKey, tokenType, abiFile) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO token_standards (user_id, chain_key, token_type, abi_file)
                VALUES (?, ?, ?, ?)
            `);
            
            stmt.run([userId, chainKey, tokenType, abiFile], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, chainKey, tokenType });
                }
            });
            stmt.finalize();
        });
    }

    async getTokenStandards(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM token_standards WHERE user_id = ? AND is_active = 1 ORDER BY chain_key, token_type',
                [userId],
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        const standards = {};
                        rows.forEach(row => {
                            if (!standards[row.chain_key]) {
                                standards[row.chain_key] = {};
                            }
                            standards[row.chain_key][row.token_type] = row.abi_file;
                        });
                        resolve(standards);
                    }
                }
            );
        });
    }

    async getAllTokenStandards() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM token_standards WHERE is_active = 1 ORDER BY user_id, chain_key, token_type',
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        const standards = {};
                        rows.forEach(row => {
                            if (!standards[row.user_id]) {
                                standards[row.user_id] = {};
                            }
                            if (!standards[row.user_id][row.chain_key]) {
                                standards[row.user_id][row.chain_key] = {};
                            }
                            standards[row.user_id][row.chain_key][row.token_type] = row.abi_file;
                        });
                        resolve(standards);
                    }
                }
            );
        });
    }

    async updateTokenStandard(userId, chainKey, tokenType, abiFile) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE token_standards SET abi_file = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND chain_key = ? AND token_type = ?',
                [abiFile, userId, chainKey, tokenType],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ changes: this.changes });
                    }
                }
            );
        });
    }

    async deleteTokenStandard(userId, chainKey, tokenType) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE token_standards SET is_active = 0 WHERE user_id = ? AND chain_key = ? AND token_type = ?',
                [userId, chainKey, tokenType],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ changes: this.changes });
                    }
                }
            );
        });
    }

    // Close database connection
    close() {
        this.db.close();
    }
}

export default new Database(); 