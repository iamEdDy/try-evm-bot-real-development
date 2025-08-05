// Import modules
import Web3 from 'web3';
import { TransactionManager } from './transactionManager.js';
import { WalletManager } from './walletManager.js';
import fs from 'fs';
import path from 'path';
import database from './api/database.js';
import { fileURLToPath } from 'url';
import { io as ClientIO } from 'socket.io-client';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic configuration loading from database
let config = null;
let chainsConfig = null;
let tokenStandards = null;

// WebSocket client for real-time updates from API server
let apiSocket = null;

// Load configurations from database
async function loadConfigFromDatabase() {
    try {
        console.log('Loading configurations from database...');
        
        // Get all user configurations and merge them
        const allUsers = await database.getAllUsers();
        const userConfigs = [];
        
        for (const user of allUsers) {
            const userConfig = await database.getUserConfig(user.id);
            if (userConfig) {
                userConfigs.push(userConfig);
            }
        }
        
        // Merge all user configurations (use the first one as base, or create default)
        if (userConfigs.length > 0) {
            config = userConfigs[0]; // Use first user's config as global config
            console.log(`Loaded configuration from user ${allUsers[0].username}`);
        } else {
            // Create default configuration if no users exist
            config = {
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
            console.log('Created default configuration');
        }
        
        // Load chains from database (merge all users' chains)
        chainsConfig = {};
        const allChains = await database.getAllChains();
        for (const [userId, userChains] of Object.entries(allChains)) {
            Object.assign(chainsConfig, userChains);
        }
        console.log(`Loaded ${Object.keys(chainsConfig).length} chains from database`);
        
        // Load token standards from database (merge all users' standards)
        tokenStandards = {};
        const allTokenStandards = await database.getAllTokenStandards();
        for (const [userId, userStandards] of Object.entries(allTokenStandards)) {
            Object.assign(tokenStandards, userStandards);
        }
        console.log(`Loaded token standards from database for ${Object.keys(tokenStandards).length} chains`);
        
        console.log('Database configuration loaded successfully');
        return { config, chainsConfig, tokenStandards };
    } catch (error) {
        console.error('Failed to load database config:', error);
        // Fallback to file-based config
        return loadConfigFromFiles();
    }
}

// Fallback to file-based configuration
function loadConfigFromFiles() {
    try {
        console.log('Loading configurations from files (fallback)...');
        
        const configPath = path.join(__dirname, 'config', 'config.json');
        const chainsPath = path.join(__dirname, 'config', 'chains.json');
        const tokenStandardsPath = path.join(__dirname, 'config', 'tokenStandards.json');
        
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        chainsConfig = JSON.parse(fs.readFileSync(chainsPath, 'utf8'));
        tokenStandards = JSON.parse(fs.readFileSync(tokenStandardsPath, 'utf8'));
        
        console.log('File-based configuration loaded successfully');
        return { config, chainsConfig, tokenStandards };
    } catch (error) {
        console.error('Failed to load file config:', error);
        // Return default configs
        config = {
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
        
        chainsConfig = {
            ethereum: {
                name: "Ethereum Mainnet",
                chainId: 1,
                rpcUrls: ["wss://mainnet.infura.io/ws/v3/dfc5c6112e594e43a38688615b7859aa", "wss://eth-mainnet.g.alchemy.com/v2/anWSW3oGEDQVMSZc5jRUcawVjRTsrC5S"],
                blockExplorerUrls: ["https://etherscan.io"],
                nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }
            },
            bsc: {
                name: "BNB Smart Chain",
                chainId: 56,
                rpcUrls: ["https://bsc-dataseed1.binance.org", "https://bsc-dataseed2.binance.org"],
                blockExplorerUrls: ["https://bscscan.com"],
                nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 }
            }
        };
        
        tokenStandards = {
            ethereum: { erc20: "erc20.json", erc721: "erc721.json", erc1155: "erc1155.json" },
            bsc: { erc20: "bep20.json", erc721: "bep721.json" }
        };
        
        console.log('Default configuration loaded');
        return { config, chainsConfig, tokenStandards };
    }
}

// Initialize configuration
let configInitialized = false;
async function initializeConfig() {
    if (!configInitialized) {
        const configs = await loadConfigFromDatabase();
        config = configs.config;
        chainsConfig = configs.chainsConfig;
        tokenStandards = configs.tokenStandards;
        configInitialized = true;
    }
    return { config, chainsConfig, tokenStandards };
}

// Function to reload configuration from database
async function reloadConfig() {
    console.log('Reloading configuration from database...');
    configInitialized = false;
    const configs = await initializeConfig();
    
    console.log('Configuration reloaded successfully');
    console.log('Active chains:', configs.config.chains);
    
    return configs.config;
}

// Export reload function for API server
export { reloadConfig };

// File watcher for config changes
let configWatcher = null;
try {
    const configPath = path.join(__dirname, 'config', 'config.json');
    configWatcher = fs.watch(configPath, (eventType, filename) => {
        if (eventType === 'change') {
            console.log('Config file changed, reloading configuration...');
            // Add a small delay to ensure file is fully written
            setTimeout(() => {
                reloadConfig();
            }, 100);
        }
    });
    console.log('Config file watcher active - bot will auto-reload on config changes');
} catch (error) {
    console.log('Could not set up config file watcher:', error.message);
}

// Try to import API update function (optional)
let updateMetrics = null;
let resetMetrics = null;
let io = null;
try {
    const { updateMetrics: apiUpdateMetrics, resetMetrics: apiResetMetrics, startServer, io: socketIO } = await import('./api/server.js');
    updateMetrics = apiUpdateMetrics;
    resetMetrics = apiResetMetrics;
    io = socketIO;
    await startServer(); // Start the API server
    console.log('API server connected, metrics will be updated in real-time');
    
    // Reset API server metrics on startup
    if (resetMetrics) {
        resetMetrics();
        console.log('API server metrics reset on startup');
    }
    
    // Listen for WebSocket events from frontend
    if (io) {
        io.on('connection', (socket) => {
            console.log('Frontend connected to bot WebSocket');
            
            // Listen for wallet reload events
            socket.on('reload-wallets', async () => {
                console.log('🔄 Received reload-wallets event, reloading wallets...');
                try {
                    await initializeWallets();
                    console.log('✅ Wallets reloaded successfully');
                } catch (error) {
                    console.error('❌ Failed to reload wallets:', error.message);
                }
            });
            
            // Listen for config reload events
            socket.on('reload-config', async () => {
                console.log('🔄 Received reload-config event, reloading configuration...');
                try {
                    await reloadConfig();
                    console.log('✅ Configuration reloaded successfully');
                } catch (error) {
                    console.error('❌ Failed to reload configuration:', error.message);
                }
            });
            
            socket.on('disconnect', () => {
                console.log('Frontend disconnected from bot WebSocket');
            });
        });
        
        console.log('WebSocket event listeners configured for real-time updates');
    }
} catch (error) {
    console.log('API server not available, running in standalone mode');
}

// Load ABIs dynamically
function loadAbi(abiName) {
    try {
        const abiPath = path.join(__dirname, 'abis', `${abiName}.json`);
        const abiData = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        
        // Handle both direct ABI arrays and nested structures
        if (Array.isArray(abiData)) {
            return abiData;
        } else if (abiData.abi && Array.isArray(abiData.abi)) {
            return abiData.abi;
        } else {
            console.error(`Invalid ABI format for ${abiName}:`, abiData);
            return [];
        }
    } catch (error) {
        console.error(`Failed to load ${abiName} ABI:`, error);
        return [];
    }
}

const erc20Abi = loadAbi('erc20');
const erc721Abi = loadAbi('erc721');
const erc1155Abi = loadAbi('erc1155');

// Native token configurations
const nativeTokens = {
    'ethereum': {
        symbol: 'ETH',
        decimals: 18,
        name: 'Ethereum'
    },
    'bsc': {
        symbol: 'BNB',
        decimals: 18,
        name: 'BNB Smart Chain'
    },
    'polygon': {
        symbol: 'MATIC',
        decimals: 18,
        name: 'Polygon'
    },
    'arbitrum': {
        symbol: 'ETH',
        decimals: 18,
        name: 'Arbitrum'
    },
    'optimism': {
        symbol: 'ETH',
        decimals: 18,
        name: 'Optimism'
    },
    'base': {
        symbol: 'ETH',
        decimals: 18,
        name: 'Base'
    },
    'avalanche': {
        symbol: 'AVAX',
        decimals: 18,
        name: 'Avalanche'
    },
    'fantom': {
        symbol: 'FTM',
        decimals: 18,
        name: 'Fantom'
    }
};

// Global Web3 instances store (user-specific)
const userWeb3Instances = {};
const userTransactionManagers = {};

// Initialize user-specific Web3 connections
async function initializeUserWeb3Instances() {
    try {
        console.log('Initializing user-specific Web3 connections...');
        
        // Get all users
        const allUsers = await database.getAllUsers();
        
        for (const user of allUsers) {
            console.log(`Setting up Web3 connections for user: ${user.username} (ID: ${user.id})`);
            
            // Get user's chains
            const userChains = await database.getChains(user.id);
            userWeb3Instances[user.id] = {};
            userTransactionManagers[user.id] = {};
            
            for (const [chainKey, chainConfig] of Object.entries(userChains)) {
                console.log(`  Setting up ${chainKey} for user ${user.username}...`);
                
                const rpcUrls = chainConfig.rpc || chainConfig.rpcUrls || [];
                if (rpcUrls.length === 0) {
                    console.warn(`    No RPC URLs found for ${chainKey}`);
                    continue;
                }
                
                userWeb3Instances[user.id][chainKey] = [];
                
                // Try each RPC endpoint with timeout
                for (const rpcUrl of rpcUrls) {
                    try {
                        console.log(`    Attempting to connect to ${chainKey} using ${rpcUrl}...`);
                        
                        // Create a promise with timeout
                        const connectionPromise = createWeb3Provider(rpcUrl, chainKey);
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Connection timeout')), 10000)
                        );
                        
                        const web3 = await Promise.race([connectionPromise, timeoutPromise]);
                        
                        // Test the connection with timeout
                        const testPromise = web3.eth.getBlockNumber();
                        const testTimeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Test timeout')), 5000)
                        );
                        
                        await Promise.race([testPromise, testTimeoutPromise]);
                        
                        userWeb3Instances[user.id][chainKey].push(web3);
                        console.log(`    ✓ Connected to ${chainKey} using ${rpcUrl}`);
                        
                        // Create transaction manager for this chain
                        if (!userTransactionManagers[user.id][chainKey]) {
                            userTransactionManagers[user.id][chainKey] = new TransactionManager(web3);
                        }
                        
                        // Only use the first successful connection per chain
                        break;
                    } catch (error) {
                        console.warn(`    ✗ Failed to connect to ${chainKey} using ${rpcUrl}:`, error.message);
                    }
                }
                
                if (userWeb3Instances[user.id][chainKey].length === 0) {
                    console.warn(`    No working RPC connections for ${chainKey}`);
                } else {
                    console.log(`    ${userWeb3Instances[user.id][chainKey].length} active connections for ${chainKey}`);
                }
            }
        }
        
        console.log('User-specific Web3 connections initialized');
    } catch (error) {
        console.error('Failed to initialize user Web3 instances:', error);
        // Continue anyway - the bot can work with limited connectivity
    }
}

// Get user-specific Web3 instance for a chain
function getUserWeb3(userId, chain) {
    return userWeb3Instances[userId]?.[chain]?.[0] || null;
}

// Get user-specific transaction manager for a chain
function getUserTransactionManager(userId, chain) {
    return userTransactionManagers[userId]?.[chain] || null;
}

// Get next available Web3 instance for a user's chain (for rotation)
function getNextUserRpc(userId, chain) {
    const instances = userWeb3Instances[userId]?.[chain] || [];
    if (instances.length === 0) return null;
    
    // Simple round-robin
    const currentIndex = Math.floor(Math.random() * instances.length);
    return instances[currentIndex];
}

// Initialize managers
const transactionManagers = {};
const walletManager = new WalletManager();

// Initialize wallets asynchronously
let walletsLoaded = false;

async function initializeWallets() {
    try {
        await walletManager.loadWallets();
        walletsLoaded = true;
        console.log('Wallets initialized successfully');
    } catch (error) {
        console.error('Failed to initialize wallets:', error);
        process.exit(1);
    }
}

// Performance metrics
const metrics = {
    startTime: Date.now(),
    totalWallets: 0,
    totalTokens: 0,
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    totalGasUsed: '0',
    averageGasPrice: 0,
    totalExecutionTime: 0,
    balanceChecks: 0,
    balanceCheckTime: 0,
    transactionCreationTime: 0,
    transactionConfirmationTime: 0,
    chains: {},
    nativeTokenSupport: true
};

// Function to load metrics from database on startup
async function loadMetricsFromDatabase() {
    try {
        console.log('Loading metrics from database...');
        const allWallets = await database.getAllWallets();
        
        // Reset metrics to clean state first
        resetBotMetrics();
        
        // Aggregate metrics from all wallets
        let totalTransactions = 0;
        let totalSuccessful = 0;
        let totalFailed = 0;
        let totalGasUsed = 0n;
        
        allWallets.forEach(wallet => {
            totalTransactions += wallet.transactions || 0;
            totalSuccessful += wallet.successfulTransactions || 0;
            totalFailed += wallet.failedTransactions || 0;
            totalGasUsed += BigInt(wallet.gasUsed || '0');
            
            // Update chain-specific metrics
            if (wallet.chainStats) {
                Object.entries(wallet.chainStats).forEach(([chain, stats]) => {
                    if (!metrics.chains[chain]) {
                        metrics.chains[chain] = {
                            transactions: 0,
                            successfulTransactions: 0,
                            failedTransactions: 0,
                            gasUsed: '0',
                            rpcErrors: 0,
                            totalRpcRequests: 0,
                            activeRpcConnections: 0,
                            nativeToken: {
                                transactions: 0,
                                successfulTransactions: 0,
                                failedTransactions: 0,
                                gasUsed: '0',
                                totalTransferred: '0'
                            },
                            tokenTypes: {}
                        };
                    }
                    
                    metrics.chains[chain].transactions += stats.transactions || 0;
                    metrics.chains[chain].successfulTransactions += stats.successfulTransactions || 0;
                    metrics.chains[chain].failedTransactions += stats.failedTransactions || 0;
                    metrics.chains[chain].gasUsed = (BigInt(metrics.chains[chain].gasUsed) + BigInt(stats.gasUsed || '0')).toString();
                });
            }
            
            // Update native token metrics
            if (wallet.nativeTokenStats) {
                Object.entries(wallet.nativeTokenStats).forEach(([chain, stats]) => {
                    if (metrics.chains[chain] && metrics.chains[chain].nativeToken) {
                        metrics.chains[chain].nativeToken.transactions += stats.transactions || 0;
                        metrics.chains[chain].nativeToken.successfulTransactions += stats.successfulTransactions || 0;
                        metrics.chains[chain].nativeToken.failedTransactions += stats.failedTransactions || 0;
                        metrics.chains[chain].nativeToken.gasUsed = (BigInt(metrics.chains[chain].nativeToken.gasUsed) + BigInt(stats.gasUsed || '0')).toString();
                        metrics.chains[chain].nativeToken.totalTransferred = (BigInt(metrics.chains[chain].nativeToken.totalTransferred) + BigInt(stats.totalTransferred || '0')).toString();
                    }
                });
            }
        });
        
        // Update global metrics
        metrics.totalTransactions = totalTransactions;
        metrics.successfulTransactions = totalSuccessful;
        metrics.failedTransactions = totalFailed;
        metrics.totalGasUsed = totalGasUsed.toString();
        
        console.log(`📊 Loaded metrics from database: ${totalTransactions} total transactions, ${totalSuccessful} successful, ${totalFailed} failed`);
    } catch (error) {
        console.error('Failed to load metrics from database:', error.message);
    }
}

// Function to completely reset metrics
function resetBotMetrics() {
    console.log('Resetting all metrics to clean state...');
    
    // Reset main metrics
    metrics.startTime = Date.now();
    metrics.totalWallets = 0;
    metrics.totalTokens = 0;
    metrics.totalTransactions = 0;
    metrics.successfulTransactions = 0;
    metrics.failedTransactions = 0;
    metrics.totalGasUsed = '0'; // Initialize as string for BigInt operations
    metrics.averageGasPrice = 0;
    metrics.totalExecutionTime = 0;
    metrics.balanceChecks = 0;
    metrics.balanceCheckTime = 0;
    metrics.transactionCreationTime = 0;
    metrics.transactionConfirmationTime = 0;
    metrics.chains = {};
    metrics.nativeTokenSupport = true;
    
    console.log('Metrics reset complete');
}

// Initialize chain metrics
function initializeChainMetrics() {
    if (!config || !config.chains) {
        console.warn('Configuration not loaded yet, skipping chain metrics initialization');
        return;
    }
    
    // First reset all metrics to ensure clean state
    resetBotMetrics();
    
    config.chains.forEach(chain => {
        metrics.chains[chain] = {
            transactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            gasUsed: '0',
            rpcErrors: 0, // Reset RPC errors to clear any old errors
            totalRpcRequests: 0,
            activeRpcConnections: 0,
            nativeToken: {
                transactions: 0,
                successfulTransactions: 0,
                failedTransactions: 0,
                gasUsed: '0',
                totalTransferred: '0'
            },
            tokenTypes: {}
        };
        
        // Initialize token type metrics
        if (tokenStandards && tokenStandards[chain]) {
            Object.keys(tokenStandards[chain]).forEach(tokenType => {
                metrics.chains[chain].tokenTypes[tokenType] = {
                    transactions: 0,
                    successfulTransactions: 0,
                    failedTransactions: 0,
                    gasUsed: '0'
                };
            });
        }
    });
    
    console.log('Chain metrics initialized - cleared any existing RPC errors');
}

// Update metrics
function updateMetricsData() {
    const wallets = walletManager.getActiveWallets();
    metrics.totalWallets = wallets.length;
    metrics.totalTokens = wallets.reduce((sum, wallet) => sum + wallet.tokens.length, 0);
    
    // Update chain metrics based on user connections
    Object.keys(metrics.chains).forEach(chain => {
        let totalConnections = 0;
        // Sum connections across all users for this chain
        Object.values(userWeb3Instances).forEach(userChains => {
            totalConnections += userChains[chain]?.length || 0;
        });
        metrics.chains[chain].activeRpcConnections = totalConnections;
    });
    
    // Update API metrics if available
    if (updateMetrics) {
        updateMetrics(metrics);
    }
}

// Check and transfer native token balance (now takes mergedConfig and chainConfig)
async function checkAndTransferNativeBalance(wallet, chain, mergedConfig, chainConfig) {
    if (!mergedConfig.nativeTokenSupport) {
        return;
    }
    try {
        // Get user-specific Web3 instance
        const web3 = getUserWeb3(wallet.user_id, chain);
        if (!web3) {
            console.warn(`No Web3 connection available for ${chain} for user ${wallet.user_id}`);
            return;
        }
        
        const balance = await web3.eth.getBalance(wallet.address);
        const minBalance = web3.utils.toWei(mergedConfig.nativeTokenMinBalance, 'ether');
        
        if (balance > minBalance) {
            const nativeToken = chainConfig.nativeCurrency;
            const balanceInEther = web3.utils.fromWei(balance, 'ether');
            const minBalanceInEther = web3.utils.fromWei(minBalance, 'ether');
            const transferAmount = BigInt(balance) - BigInt(minBalance);
            
            console.log(`Found ${balanceInEther} ${nativeToken.symbol} in wallet ${wallet.name || wallet.address} on ${nativeToken.name}`);
            
            // Get gas price
            const gasPrice = await getGasPrice(chain);
            const multiplier = Math.floor(mergedConfig.gasPriceMultiplier * 1000);
            const increasedGasPrice = (BigInt(gasPrice) * BigInt(multiplier) / 1000n).toString();
            
            // Calculate gas cost
            const gasCost = BigInt(increasedGasPrice) * BigInt(mergedConfig.nativeTokenGasLimit);
            
            // Ensure we have enough for gas
            if (transferAmount > gasCost) {
                const actualTransferAmount = transferAmount - gasCost;
                
                const tx = {
                    from: wallet.address,
                    to: wallet.baseTokenRecipient,
                    value: actualTransferAmount.toString(),
                    gas: mergedConfig.nativeTokenGasLimit,
                    gasPrice: increasedGasPrice
                };
                
                // Get user-specific transaction manager
                const transactionManager = getUserTransactionManager(wallet.user_id, chain);
                if (!transactionManager) {
                    console.error(`No transaction manager available for ${chain} for user ${wallet.user_id}`);
                    return;
                }
                
                // Ensure private key has 0x prefix for Web3.js compatibility
                const formattedPrivateKey = wallet.privateKey.startsWith('0x') ? wallet.privateKey : `0x${wallet.privateKey}`;
                const receipt = await transactionManager.sendTransaction(tx, formattedPrivateKey);
                
                if (receipt.status) {
                    metrics.successfulTransactions++;
                    metrics.chains[chain].successfulTransactions++;
                    metrics.chains[chain].nativeToken.successfulTransactions++;
                    metrics.totalGasUsed = (BigInt(metrics.totalGasUsed) + BigInt(receipt.gasUsed)).toString();
                    metrics.chains[chain].gasUsed = (BigInt(metrics.chains[chain].gasUsed) + BigInt(receipt.gasUsed)).toString();
                    metrics.chains[chain].nativeToken.gasUsed = (BigInt(metrics.chains[chain].nativeToken.gasUsed) + BigInt(receipt.gasUsed)).toString();
                    metrics.chains[chain].nativeToken.totalTransferred = (BigInt(metrics.chains[chain].nativeToken.totalTransferred) + actualTransferAmount).toString();
                    
                    // Update wallet metrics in database for native token transaction
                    try {
                        const currentWallet = await database.getWalletsByUserId(wallet.user_id);
                        const walletToUpdate = currentWallet.find(w => w.address === wallet.address);
                        if (walletToUpdate) {
                            const updatedWallet = {
                                ...walletToUpdate,
                                transactions: (walletToUpdate.transactions || 0) + 1,
                                successfulTransactions: (walletToUpdate.successfulTransactions || 0) + 1,
                                gasUsed: (BigInt(walletToUpdate.gasUsed || '0') + BigInt(receipt.gasUsed)).toString(),
                                totalTransferred: (BigInt(walletToUpdate.totalTransferred || '0') + actualTransferAmount).toString(),
                                lastActive: new Date().toISOString(),
                                nativeTokenStats: {
                                    ...walletToUpdate.nativeTokenStats,
                                    [chain]: {
                                        transactions: (walletToUpdate.nativeTokenStats?.[chain]?.transactions || 0) + 1,
                                        successfulTransactions: (walletToUpdate.nativeTokenStats?.[chain]?.successfulTransactions || 0) + 1,
                                        gasUsed: (BigInt(walletToUpdate.nativeTokenStats?.[chain]?.gasUsed || '0') + BigInt(receipt.gasUsed)).toString(),
                                        totalTransferred: (BigInt(walletToUpdate.nativeTokenStats?.[chain]?.totalTransferred || '0') + actualTransferAmount).toString()
                                    }
                                }
                            };
                            await database.updateWallet(walletToUpdate.id, updatedWallet);
                            console.log(`📊 Updated native token metrics in database for ${wallet.name || wallet.address}`);
                        }
                    } catch (dbError) {
                        console.error('Failed to update native token metrics in database:', dbError.message);
                    }
                    
                    const transferredInEther = web3.utils.fromWei(actualTransferAmount.toString(), 'ether');
                    console.log(`Successfully transferred ${transferredInEther} ${nativeToken.symbol} to ${wallet.baseTokenRecipient} on ${nativeToken.name}`);
                } else {
                    metrics.failedTransactions++;
                    metrics.chains[chain].failedTransactions++;
                    metrics.chains[chain].nativeToken.failedTransactions++;
                    
                    // Update wallet metrics in database for failed native token transaction
                    try {
                        const currentWallet = await database.getWalletsByUserId(wallet.user_id);
                        const walletToUpdate = currentWallet.find(w => w.address === wallet.address);
                        if (walletToUpdate) {
                            const updatedWallet = {
                                ...walletToUpdate,
                                transactions: (walletToUpdate.transactions || 0) + 1,
                                failedTransactions: (walletToUpdate.failedTransactions || 0) + 1,
                                lastActive: new Date().toISOString(),
                                nativeTokenStats: {
                                    ...walletToUpdate.nativeTokenStats,
                                    [chain]: {
                                        transactions: (walletToUpdate.nativeTokenStats?.[chain]?.transactions || 0) + 1,
                                        failedTransactions: (walletToUpdate.nativeTokenStats?.[chain]?.failedTransactions || 0) + 1
                                    }
                                }
                            };
                            await database.updateWallet(walletToUpdate.id, updatedWallet);
                        }
                    } catch (dbError) {
                        console.error('Failed to update native token metrics in database:', dbError.message);
                    }
                    
                    console.error('Native token transaction failed');
                }
                
                metrics.totalTransactions++;
                metrics.chains[chain].transactions++;
                metrics.chains[chain].nativeToken.transactions++;
            } else {
                console.log(`Insufficient ${nativeToken.symbol} balance for gas costs on ${nativeToken.name}`);
            }
        }
    } catch (error) {
        console.error('Error checking/transferring native balance:', error.message);
        metrics.failedTransactions++;
        metrics.chains[chain].failedTransactions++;
        metrics.chains[chain].nativeToken.failedTransactions++;
        metrics.totalTransactions++;
        metrics.chains[chain].transactions++;
        metrics.chains[chain].nativeToken.transactions++;
        metrics.chains[chain].rpcErrors++;
        
        // Fix the metrics error by ensuring rpcErrors is an object
        if (typeof metrics.chains[chain].rpcErrors === 'number') {
            metrics.chains[chain].rpcErrors = {
                count: metrics.chains[chain].rpcErrors,
                lastError: error.message,
                lastErrorTime: new Date().toISOString()
            };
        } else {
            metrics.chains[chain].rpcErrors.lastError = error.message;
            metrics.chains[chain].rpcErrors.lastErrorTime = new Date().toISOString();
        }
    }
}

// Check and transfer token balance (now takes mergedConfig and chainConfig)
async function checkAndTransferBalance(wallet, token, mergedConfig, chainConfig) {
    try {
        // Check if transaction is already in progress for this wallet/token combination
        if (isTransactionLocked(wallet.address, token.tokenAddress, token.chain)) {
            console.log(`⏳ Transaction already in progress for ${token.tokenType} on ${token.chain} for wallet ${wallet.name || wallet.address}`);
            return;
        }
        
        // Get user-specific Web3 instance
        const web3 = getUserWeb3(wallet.user_id, token.chain);
        if (!web3) {
            console.warn(`No Web3 connection available for ${token.chain} for user ${wallet.user_id}`);
            return;
        }
        
        // Get user-specific token standards
        const userTokenStandards = await database.getTokenStandards(wallet.user_id);
        const tokenStandard = userTokenStandards[token.chain]?.[token.tokenType] || tokenStandards[token.chain]?.[token.tokenType];
        
        if (!tokenStandard) {
            console.warn(`No token standard found for ${token.tokenType} on ${token.chain} for user ${wallet.user_id}`);
            return;
        }
        
        // Load ABI from abiMap (already imported)
        const abi = abiMap[tokenStandard];
        console.log('DEBUG: tokenStandard:', tokenStandard, 'abi:', typeof abi, Array.isArray(abi), abi && abi.length, abi);
        if (!abi) {
            console.error(`ABI not found for token standard: ${tokenStandard}`);
            return;
        }
        
        const tokenContract = new web3.eth.Contract(abi, token.tokenAddress);
        
        const balance = await tokenContract.methods.balanceOf(wallet.address).call();
        if (balance > 0) {
            console.log(`💰 Found ${balance} ${token.tokenType} tokens in wallet ${wallet.name || wallet.address} on ${token.chain}`);
            
            // Set transaction lock to prevent duplicate transactions
            setTransactionLock(wallet.address, token.tokenAddress, token.chain);
            
            // Use mergedConfig for gas price multiplier
            const gasPrice = await getGasPrice(token.chain);
            const multiplier = Math.floor(mergedConfig.gasPriceMultiplier * 1000);
            const increasedGasPrice = (BigInt(gasPrice) * BigInt(multiplier) / 1000n).toString();
            let tx;
            if (token.tokenType === 'erc20' || token.tokenType === 'bep20') {
                tx = {
                    from: wallet.address,
                    to: token.tokenAddress,
                    data: tokenContract.methods.transfer(token.recipientAddress, balance).encodeABI(),
                    gas: 100000,
                    gasPrice: increasedGasPrice
                };
            } else if (token.tokenType === 'erc721' || token.tokenType === 'bep721') {
                tx = {
                    from: wallet.address,
                    to: token.tokenAddress,
                    data: tokenContract.methods.transferFrom(wallet.address, token.recipientAddress, balance).encodeABI(),
                    gas: 150000,
                    gasPrice: increasedGasPrice
                };
            } else if (token.tokenType === 'erc1155') {
                tx = {
                    from: wallet.address,
                    to: token.tokenAddress,
                    data: tokenContract.methods.safeTransferFrom(wallet.address, token.recipientAddress, token.tokenId, balance, '0x').encodeABI(),
                    gas: 200000,
                    gasPrice: increasedGasPrice
                };
            } else {
                console.error(`Unsupported token type: ${token.tokenType}`);
                return;
            }
            
            // Get user-specific transaction manager
            const transactionManager = getUserTransactionManager(wallet.user_id, token.chain);
            if (!transactionManager) {
                console.error(`No transaction manager available for ${token.chain} for user ${wallet.user_id}`);
                return;
            }
            
            console.log(`🚀 Attempting to transfer ${balance} ${token.tokenType} tokens from ${wallet.address} to ${token.recipientAddress} on ${token.chain}`);
            // Ensure private key has 0x prefix for Web3.js compatibility
            const formattedPrivateKey = wallet.privateKey.startsWith('0x') ? wallet.privateKey : `0x${wallet.privateKey}`;
            const receipt = await transactionManager.sendTransaction(tx, formattedPrivateKey);
            
            if (receipt.status) {
                metrics.successfulTransactions++;
                metrics.chains[token.chain].successfulTransactions++;
                metrics.chains[token.chain].tokenTypes[token.tokenType].successfulTransactions++;
                metrics.totalGasUsed = (BigInt(metrics.totalGasUsed) + BigInt(receipt.gasUsed)).toString();
                metrics.chains[token.chain].gasUsed = (BigInt(metrics.chains[token.chain].gasUsed) + BigInt(receipt.gasUsed)).toString();
                metrics.chains[token.chain].tokenTypes[token.tokenType].gasUsed = 
                    (BigInt(metrics.chains[token.chain].tokenTypes[token.tokenType].gasUsed) + BigInt(receipt.gasUsed)).toString();
                
                // Update wallet metrics in database
                try {
                    const currentWallet = await database.getWalletsByUserId(wallet.user_id);
                    const walletToUpdate = currentWallet.find(w => w.address === wallet.address);
                    if (walletToUpdate) {
                        const updatedWallet = {
                            ...walletToUpdate,
                            transactions: (walletToUpdate.transactions || 0) + 1,
                            successfulTransactions: (walletToUpdate.successfulTransactions || 0) + 1,
                            gasUsed: (BigInt(walletToUpdate.gasUsed || '0') + BigInt(receipt.gasUsed)).toString(),
                            lastActive: new Date().toISOString(),
                            chainStats: {
                                ...walletToUpdate.chainStats,
                                [token.chain]: {
                                    transactions: (walletToUpdate.chainStats?.[token.chain]?.transactions || 0) + 1,
                                    successfulTransactions: (walletToUpdate.chainStats?.[token.chain]?.successfulTransactions || 0) + 1,
                                    gasUsed: (BigInt(walletToUpdate.chainStats?.[token.chain]?.gasUsed || '0') + BigInt(receipt.gasUsed)).toString()
                                }
                            }
                        };
                        await database.updateWallet(walletToUpdate.id, updatedWallet);
                        console.log(`📊 Updated wallet metrics in database for ${wallet.name || wallet.address}`);
                    }
                } catch (dbError) {
                    console.error('Failed to update wallet metrics in database:', dbError.message);
                }
                
                console.log(`✅ Successfully transferred ${token.tokenType} token from ${wallet.name || wallet.address} to ${token.recipientAddress} on ${token.chain}`);
            } else {
                metrics.failedTransactions++;
                metrics.chains[token.chain].failedTransactions++;
                metrics.chains[token.chain].tokenTypes[token.tokenType].failedTransactions++;
                
                // Update wallet metrics in database for failed transaction
                try {
                    const currentWallet = await database.getWalletsByUserId(wallet.user_id);
                    const walletToUpdate = currentWallet.find(w => w.address === wallet.address);
                    if (walletToUpdate) {
                        const updatedWallet = {
                            ...walletToUpdate,
                            transactions: (walletToUpdate.transactions || 0) + 1,
                            failedTransactions: (walletToUpdate.failedTransactions || 0) + 1,
                            lastActive: new Date().toISOString(),
                            chainStats: {
                                ...walletToUpdate.chainStats,
                                [token.chain]: {
                                    transactions: (walletToUpdate.chainStats?.[token.chain]?.transactions || 0) + 1,
                                    failedTransactions: (walletToUpdate.chainStats?.[token.chain]?.failedTransactions || 0) + 1
                                }
                            }
                        };
                        await database.updateWallet(walletToUpdate.id, updatedWallet);
                    }
                } catch (dbError) {
                    console.error('Failed to update wallet metrics in database:', dbError.message);
                }
                
                console.error(`❌ ${token.tokenType} token transaction failed`);
            }
            
            metrics.totalTransactions++;
            metrics.chains[token.chain].transactions++;
            metrics.chains[token.chain].tokenTypes[token.tokenType].transactions++;
        } else {
            console.log(`💤 No ${token.tokenType} tokens found in wallet ${wallet.name || wallet.address} on ${token.chain}`);
        }
    } catch (error) {
        console.error(`Error checking/transferring ${token.tokenType} balance:`, error.message);
        metrics.failedTransactions++;
        metrics.chains[token.chain].failedTransactions++;
        metrics.chains[token.chain].tokenTypes[token.tokenType].failedTransactions++;
        metrics.totalTransactions++;
        metrics.chains[token.chain].transactions++;
        metrics.chains[token.chain].tokenTypes[token.tokenType].transactions++;
        metrics.chains[token.chain].rpcErrors++;
        
        // Fix the metrics error by ensuring rpcErrors is an object
        if (typeof metrics.chains[token.chain].rpcErrors === 'number') {
            metrics.chains[token.chain].rpcErrors = {
                count: metrics.chains[token.chain].rpcErrors,
                lastError: error.message,
                lastErrorTime: new Date().toISOString()
            };
        } else {
            metrics.chains[token.chain].rpcErrors.lastError = error.message;
            metrics.chains[token.chain].rpcErrors.lastErrorTime = new Date().toISOString();
        }
    }
}

// Get gas price for a chain
async function getGasPrice(chain) {
    try {
        const web3 = getUserWeb3(1, chain); // Use first user as default
        if (!web3) {
            console.warn(`No Web3 connection available for ${chain}`);
            return '20000000000'; // 20 gwei default
        }
        
        const gasPrice = await web3.eth.getGasPrice();
        return gasPrice.toString();
    } catch (error) {
        console.error(`Error getting gas price for ${chain}:`, error.message);
        return '20000000000'; // 20 gwei default
    }
}

// Get token contract with proper ABI
function getTokenContract(chain, tokenType, tokenAddress) {
    try {
        const web3 = getUserWeb3(1, chain); // Use first user as default
        if (!web3) {
            console.warn(`No Web3 connection available for ${chain}`);
            return null;
        }
        
        let abi;
        if (tokenType === 'erc20' || tokenType === 'bep20') {
            abi = erc20Abi;
        } else if (tokenType === 'erc721' || tokenType === 'bep721') {
            abi = erc721Abi;
        } else if (tokenType === 'erc1155') {
            abi = erc1155Abi;
        } else {
            console.error(`Unsupported token type: ${tokenType}`);
            return null;
        }
        
        return new web3.eth.Contract(abi, tokenAddress);
    } catch (error) {
        console.error(`Error creating token contract for ${tokenType} on ${chain}:`, error.message);
        return null;
    }
}

// ABI mapping for token standards
const abiMap = {
    'erc20.json': erc20Abi,
    'bep20.json': erc20Abi,
    'erc721.json': erc721Abi,
    'bep721.json': erc721Abi,
    'erc1155.json': erc1155Abi
};

// Get merged configuration (global + user-specific)
function getMergedConfig(globalConfig, userConfig) {
    return {
        ...globalConfig,
        ...userConfig
    };
}

// Transaction locking to prevent duplicate transactions
const transactionLocks = new Map();

function getTransactionLockKey(walletAddress, tokenAddress, chain) {
    return `${walletAddress}-${tokenAddress}-${chain}`;
}

function isTransactionLocked(walletAddress, tokenAddress, chain) {
    const key = getTransactionLockKey(walletAddress, tokenAddress, chain);
    return transactionLocks.has(key);
}

function setTransactionLock(walletAddress, tokenAddress, chain, duration = 5000) {
    const key = getTransactionLockKey(walletAddress, tokenAddress, chain);
    transactionLocks.set(key, Date.now() + duration);
    
    // Auto-clear after duration
    setTimeout(() => {
        transactionLocks.delete(key);
    }, duration);
}

function clearTransactionLocks() {
    transactionLocks.clear();
}

// Main wallet balance checking function
async function checkWalletBalances(wallet) {
    try {
        if (wallet.isPaused) {
            console.log(`⏸️  Wallet ${wallet.name || wallet.address} is paused, skipping...`);
            return;
        }
        
        console.log(`🔍 Checking balances for wallet: ${wallet.name || wallet.address}`);
        
        // Get user-specific configuration
        const userConfig = await database.getUserConfig(wallet.user_id);
        const mergedConfig = getMergedConfig(config, userConfig);
        
        // Check native token balance for each chain
        for (const chain of wallet.chains) {
            if (!mergedConfig.chains.includes(chain)) {
                console.log(`⏭️  Skipping ${chain} - not in user's active chains`);
                continue;
            }
            
            const chainConfig = chainsConfig[chain];
            if (!chainConfig) {
                console.warn(`⚠️  No configuration found for chain: ${chain}`);
                continue;
            }
            
            // Check native token balance
            if (mergedConfig.nativeTokenSupport) {
                await checkAndTransferNativeBalance(wallet, chain, mergedConfig, chainConfig);
            }
            
            // Check token balances
            if (wallet.tokens && wallet.tokens.length > 0) {
                for (const token of wallet.tokens) {
                    if (token.chain === chain) {
                        await checkAndTransferBalance(wallet, token, mergedConfig, chainConfig);
                    }
                }
            }
        }
        
        // Update wallet's last checked time
        wallet.lastChecked = new Date().toISOString();
        
    } catch (error) {
        console.error(`Error checking wallet ${wallet.name || wallet.address}:`, error.message);
    }
}

// Main bot function
async function startBot() {
    try {
        console.log('🚀 Starting EVM Bot...');
        
        // Initialize configuration
        await initializeConfig();
        console.log('✅ Configuration loaded');
        
        // Initialize wallets
        await initializeWallets();
        console.log('✅ Wallets loaded');
        
        // Initialize user Web3 instances
        await initializeUserWeb3Instances();
        console.log('✅ Web3 connections established');
        
        // Initialize API WebSocket connection for real-time updates
        await initializeAPIConnection();
        console.log('✅ API connection established');
        
        // Load metrics from database
        await loadMetricsFromDatabase();
        console.log('✅ Metrics loaded from database');
        
        // Initialize chain metrics
        initializeChainMetrics();
        console.log('✅ Chain metrics initialized');
        
        // Update metrics data
        updateMetricsData();
        console.log('✅ Metrics data updated');
        
        // Start continuous monitoring
        console.log('🔄 Starting continuous monitoring...');
        
        // Initial balance check
        const wallets = await walletManager.getAllWallets();
        console.log(`📊 Monitoring ${wallets.length} wallets across ${Object.keys(chainsConfig).length} chains`);
        
        // Continuous monitoring loop
        setInterval(async () => {
            try {
                const wallets = await walletManager.getAllWallets();
                for (const wallet of wallets) {
                    await checkWalletBalances(wallet);
                }
                
                // Update metrics
                updateMetricsData();
                
                // Clear old transaction locks
                clearTransactionLocks();
                
            } catch (error) {
                console.error('Error in monitoring loop:', error.message);
            }
        }, config.checkInterval || 1000);
        
        // Periodic reload to ensure sync with database (every 30 seconds)
        setInterval(async () => {
            try {
                console.log('🔄 Periodic reload: refreshing wallets and config from database...');
                await reloadWalletsFromAPI();
                await reloadConfigFromAPI();
                console.log('✅ Periodic reload completed');
            } catch (error) {
                console.error('❌ Error during periodic reload:', error.message);
            }
        }, 30000); // 30 seconds
        
        console.log('✅ Bot started successfully!');
        
    } catch (error) {
        console.error('❌ Failed to start bot:', error);
        process.exit(1);
    }
}

// Create Web3 provider with proper error handling
async function createWeb3Provider(url, chain) {
    try {
        let provider;
        
        if (url.startsWith('wss://') || url.startsWith('ws://')) {
            // WebSocket provider
            const WebSocket = (await import('ws')).default;
            provider = new Web3.providers.WebsocketProvider(url);
            
            // Handle connection events
            provider.on('connect', () => {
                console.log(`🔗 WebSocket connected to ${chain}: ${url}`);
            });
            
            provider.on('error', (error) => {
                console.error(`❌ WebSocket error for ${chain}:`, error.message);
            });
            
            provider.on('end', () => {
                console.log(`🔌 WebSocket disconnected from ${chain}: ${url}`);
            });
        } else {
            // HTTP provider
            provider = new Web3.providers.HttpProvider(url);
        }
        
        const web3 = new Web3(provider);
        
        // Test the connection
        await web3.eth.getBlockNumber();
        
        return web3;
    } catch (error) {
        console.error(`Failed to create Web3 provider for ${chain}:`, error.message);
        throw error;
    }
}

// Export functions for API server
export async function reloadWalletsFromAPI() {
    console.log('🔄 Reloading wallets from API request...');
    await walletManager.reloadWallets();
    console.log('✅ Wallets reloaded successfully');
}

export async function reloadConfigFromAPI() {
    console.log('🔄 Reloading configuration from API request...');
    await reloadConfig();
    console.log('✅ Configuration reloaded successfully');
}

// Initialize WebSocket connection to API server
async function initializeAPIConnection() {
    try {
        const apiUrl = process.env.API_URL || 'http://localhost:3002';
        console.log(`🔌 Connecting to API server at ${apiUrl}...`);
        
        apiSocket = ClientIO(apiUrl, {
            transports: ['websocket', 'polling'],
            timeout: 5000,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        apiSocket.on('connect', () => {
            console.log('✅ Connected to API server for real-time updates');
        });

        apiSocket.on('disconnect', () => {
            console.log('❌ Disconnected from API server');
        });

        apiSocket.on('connect_error', (error) => {
            console.log('❌ Failed to connect to API server:', error.message);
        });

        // Listen for wallet reload events
        apiSocket.on('reload-wallets', async () => {
            console.log('🔄 Received wallet reload request from API server');
            try {
                await reloadWalletsFromAPI();
                console.log('✅ Wallets reloaded from API request');
            } catch (error) {
                console.error('❌ Failed to reload wallets from API request:', error.message);
            }
        });

        // Listen for wallet added events
        apiSocket.on('wallet-added', async () => {
            console.log('🆕 Received wallet added notification from API server');
            try {
                await reloadWalletsFromAPI();
                console.log('✅ Wallets reloaded after wallet addition');
            } catch (error) {
                console.error('❌ Failed to reload wallets after wallet addition:', error.message);
            }
        });

        // Listen for wallet removed events
        apiSocket.on('wallet-removed', async () => {
            console.log('🗑️ Received wallet removed notification from API server');
            try {
                await reloadWalletsFromAPI();
                console.log('✅ Wallets reloaded after wallet removal');
            } catch (error) {
                console.error('❌ Failed to reload wallets after wallet removal:', error.message);
            }
        });

        // Listen for wallet updated events
        apiSocket.on('wallet-updated', async () => {
            console.log('✏️ Received wallet updated notification from API server');
            try {
                await reloadWalletsFromAPI();
                console.log('✅ Wallets reloaded after wallet update');
            } catch (error) {
                console.error('❌ Failed to reload wallets after wallet update:', error.message);
            }
        });

        console.log('✅ API WebSocket connection initialized');
    } catch (error) {
        console.error('❌ Failed to initialize API connection:', error.message);
    }
}

// Start the bot
startBot();