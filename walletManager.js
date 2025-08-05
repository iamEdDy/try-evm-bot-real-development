import fs from 'fs';
import path from 'path';
import Web3 from 'web3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to import database (optional - for backward compatibility)
let database = null;
try {
    database = await import('./api/database.js');
} catch (error) {
    console.log('Database not available, using JSON file fallback');
}

export class WalletManager {
    constructor() {
        // Try to find wallets.json in current directory or parent directory
        if (fs.existsSync(path.join(__dirname, 'wallets.json'))) {
            this.walletsFile = path.join(__dirname, 'wallets.json');
        } else {
            this.walletsFile = path.join(__dirname, '..', 'wallets.json');
        }
        this.chainsConfig = {};
        this.tokenStandards = {};
        this.wallets = []; // Initialize as empty array
        this.loadWallets(); // Load wallets asynchronously
        this.loadChainsAndStandards(); // Load chains and standards asynchronously
    }

    async loadChainsAndStandards() {
        // Try to load from database first
        if (database) {
            try {
                console.log('Loading chains and token standards from database...');
                
                // Load all chains from database
                const allChains = await database.default.getAllChains();
                this.chainsConfig = {};
                for (const [userId, userChains] of Object.entries(allChains)) {
                    Object.assign(this.chainsConfig, userChains);
                }
                console.log(`Loaded ${Object.keys(this.chainsConfig).length} chains from database`);
                
                // Load all token standards from database
                const allTokenStandards = await database.default.getAllTokenStandards();
                this.tokenStandards = {};
                for (const [userId, userStandards] of Object.entries(allTokenStandards)) {
                    Object.assign(this.tokenStandards, userStandards);
                }
                console.log(`Loaded token standards from database for ${Object.keys(this.tokenStandards).length} chains`);
                
                return;
            } catch (error) {
                console.error('Failed to load chains/standards from database:', error.message);
                console.log('Falling back to JSON files...');
            }
        }
        
        // Fallback to JSON files
        try {
            const chainsPath = path.join(__dirname, 'config', 'chains.json');
            const tokenStandardsPath = path.join(__dirname, 'config', 'tokenStandards.json');
            
            if (fs.existsSync(chainsPath)) {
                this.chainsConfig = JSON.parse(fs.readFileSync(chainsPath, 'utf8'));
                console.log(`Loaded ${Object.keys(this.chainsConfig).length} chains from JSON file`);
            }
            
            if (fs.existsSync(tokenStandardsPath)) {
                this.tokenStandards = JSON.parse(fs.readFileSync(tokenStandardsPath, 'utf8'));
                console.log(`Loaded token standards from JSON file for ${Object.keys(this.tokenStandards).length} chains`);
            }
        } catch (error) {
            console.error('Error loading chains/standards from files:', error);
            // Set default empty configs
            this.chainsConfig = {};
            this.tokenStandards = {};
        }
    }

    // Reload chains and standards from database (for real-time updates)
    async reloadChainsAndStandards() {
        await this.loadChainsAndStandards();
        return { chainsConfig: this.chainsConfig, tokenStandards: this.tokenStandards };
    }

    async loadWallets() {
        // Try to load from database first
        if (database) {
            try {
                console.log('Loading wallets from database...');
                const dbWallets = await database.default.getAllWallets();
                const formattedWallets = dbWallets.map(wallet => {
                    try {
                        return {
                            ...wallet,
                            user_id: wallet.user_id, // Ensure user_id is preserved
                            chains: typeof wallet.chains === 'string' ? JSON.parse(wallet.chains || '[]') : (wallet.chains || []),
                            tokens: typeof wallet.tokens === 'string' ? JSON.parse(wallet.tokens || '[]') : (wallet.tokens || []),
                            chainStats: typeof wallet.chainStats === 'string' ? JSON.parse(wallet.chainStats || '{}') : (wallet.chainStats || {}),
                            nativeTokenStats: typeof wallet.nativeTokenStats === 'string' ? JSON.parse(wallet.nativeTokenStats || '{}') : (wallet.nativeTokenStats || {}),
                            isPaused: Boolean(wallet.isPaused)
                        };
                    } catch (parseError) {
                        console.error('Error parsing wallet data:', parseError);
                        return {
                            ...wallet,
                            user_id: wallet.user_id, // Ensure user_id is preserved even on error
                            chains: [],
                            tokens: [],
                            chainStats: {},
                            nativeTokenStats: {},
                            isPaused: Boolean(wallet.isPaused)
                        };
                    }
                });
                this.wallets = formattedWallets;
                console.log(`Loaded ${formattedWallets.length} wallets from database`);
                return formattedWallets;
            } catch (error) {
                console.error('Failed to load wallets from database:', error.message);
                console.log('Falling back to JSON file...');
            }
        }
        
        // Fallback to JSON file
        try {
            if (fs.existsSync(this.walletsFile)) {
                const wallets = JSON.parse(fs.readFileSync(this.walletsFile, 'utf8'));
                this.wallets = wallets;
                console.log(`Loaded ${wallets.length} wallets from JSON file`);
                return wallets;
            }
            // Create default wallets.json if it doesn't exist
            const defaultWallets = [];
            this.saveWallets(defaultWallets);
            this.wallets = defaultWallets;
            return defaultWallets;
        } catch (error) {
            console.error('Error loading wallets:', error);
            this.wallets = [];
            return [];
        }
    }

    // Reload wallets from database (for real-time updates)
    async reloadWallets() {
        await this.loadWallets();
        return this.wallets;
    }

    saveWallets(wallets = this.wallets) {
        try {
            fs.writeFileSync(this.walletsFile, JSON.stringify(wallets, null, 2));
        } catch (error) {
            console.error('Error saving wallets:', error);
        }
    }

    addWallet(privateKey, name = '', chains = ['ethereum'], baseTokenRecipient = '') {
        // Validate chains
        const invalidChains = chains.filter(chain => !this.chainsConfig[chain]);
        if (invalidChains.length > 0) {
            throw new Error(`Unsupported chains: ${invalidChains.join(', ')}`);
        }

        if (this.getWalletByPrivateKey(privateKey)) {
            console.error('Wallet with this private key already exists');
            return null;
        }

        const web3 = new Web3();
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);

        const wallet = {
            privateKey,
            name,
            address: account.address,
            chains: chains,
            baseTokenRecipient,
            addedAt: new Date().toISOString(),
            lastChecked: null,
            status: 'active',
            tokens: [], // Array to store multiple tokens
            totalTransferred: '0',
            transactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            gasUsed: '0',
            isPaused: false,
            lastActive: Date.now(),
            chainStats: {}
        };

        // Initialize chain-specific stats
        chains.forEach(chain => {
            wallet.chainStats[chain] = {
                transactions: 0,
                successfulTransactions: 0,
                failedTransactions: 0,
                gasUsed: '0',
                lastChecked: null
            };
        });

        this.wallets.push(wallet);
        this.saveWallets();
        console.log(`Added wallet: ${name || privateKey.slice(0, 6)}... on chains: ${chains.map(c => this.chainsConfig[c].name).join(', ')}`);
        if (baseTokenRecipient) {
            console.log(`Base token recipient set to: ${baseTokenRecipient}`);
        }
        return wallet;
    }

    addTokenToWallet(privateKey, tokenAddress, recipientAddress, tokenName = '', chain = 'ethereum', tokenType = 'erc20') {
        const wallet = this.getWalletByPrivateKey(privateKey);
        if (!wallet) {
            console.error('Wallet not found');
            return false;
        }

        if (!wallet.chains.includes(chain)) {
            console.error(`Wallet does not support chain: ${chain}`);
            return false;
        }

        if (!this.tokenStandards[chain][tokenType]) {
            console.error(`Unsupported token type: ${tokenType} for chain: ${chain}`);
            return false;
        }

        // Check if token already exists for this wallet
        if (wallet.tokens.some(t => t.tokenAddress === tokenAddress && t.chain === chain)) {
            console.error('Token already exists for this wallet on this chain');
            return false;
        }

        const token = {
            tokenAddress,
            recipientAddress,
            name: tokenName,
            chain,
            tokenType,
            addedAt: new Date().toISOString(),
            totalTransferred: '0',
            transactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            lastChecked: null,
            lastTransfer: null
        };

        wallet.tokens.push(token);
        this.saveWallets();
        console.log(`Added ${tokenType.toUpperCase()} token ${tokenName || tokenAddress.slice(0, 6)}... to wallet ${wallet.name || privateKey.slice(0, 6)}... on ${this.chainsConfig[chain].name}`);
        return true;
    }

    removeTokenFromWallet(privateKey, tokenAddress, chain) {
        const wallet = this.getWalletByPrivateKey(privateKey);
        if (!wallet) {
            console.error('Wallet not found');
            return false;
        }

        const initialLength = wallet.tokens.length;
        wallet.tokens = wallet.tokens.filter(t => !(t.tokenAddress === tokenAddress && t.chain === chain));
        
        if (wallet.tokens.length === initialLength) {
            console.error('Token not found in wallet for specified chain');
            return false;
        }

        this.saveWallets();
        console.log(`Removed token ${tokenAddress.slice(0, 6)}... from wallet ${wallet.name || privateKey.slice(0, 6)}... on ${this.chainsConfig[chain].name}`);
        return true;
    }

    removeWallet(privateKey) {
        const wallet = this.getWalletByPrivateKey(privateKey);
        if (wallet) {
            this.wallets = this.wallets.filter(w => w.privateKey !== privateKey);
            this.saveWallets();
            console.log(`Removed wallet: ${wallet.name || privateKey.slice(0, 6)}...`);
            return true;
        }
        console.error('Wallet not found');
        return false;
    }

    updateWalletStatus(privateKey, status) {
        const wallet = this.getWalletByPrivateKey(privateKey);
        if (wallet) {
            wallet.status = status;
            this.saveWallets();
            console.log(`Updated status for wallet ${wallet.name || privateKey.slice(0, 6)}... to ${status}`);
            return true;
        }
        console.error('Wallet not found');
        return false;
    }

    updateTokenStats(privateKey, tokenAddress, chain, stats) {
        const wallet = this.getWalletByPrivateKey(privateKey);
        if (!wallet) return false;

        const token = wallet.tokens.find(t => t.tokenAddress === tokenAddress && t.chain === chain);
        if (!token) return false;

        Object.assign(token, stats);
        this.saveWallets();
        return true;
    }

    getActiveWallets() {
        return this.wallets.filter(w => w.status === 'active' && !w.isPaused);
    }

    getWalletsByChain(chain) {
        return this.wallets.filter(w => w.chains.includes(chain));
    }

    getActiveWalletsByChain(chain) {
        return this.wallets.filter(w => w.chains.includes(chain) && w.status === 'active' && !w.isPaused);
    }

    getWalletByPrivateKey(privateKey) {
        return this.wallets.find(w => w.privateKey === privateKey);
    }

    getAllWallets() {
        return this.wallets;
    }

    // Helper method to create a new wallets.json file
    createNewWalletsFile(wallets = []) {
        this.saveWallets(wallets);
        console.log('Created new wallets.json file');
    }

    // Helper method to list all wallets
    listWallets() {
        console.log('\n=== Wallets ===');
        this.wallets.forEach((wallet, index) => {
            console.log(`\n${index + 1}. ${wallet.name || 'Unnamed Wallet'}`);
            console.log(`   Address: ${wallet.address}`);
            console.log(`   Chains: ${wallet.chains.map(c => this.chainsConfig[c].name).join(', ')}`);
            console.log(`   Status: ${wallet.isPaused ? 'PAUSED' : wallet.status}`);
            if (wallet.baseTokenRecipient) {
                console.log(`   Base Token Recipient: ${wallet.baseTokenRecipient}`);
            }
            console.log(`   Total Transferred: ${wallet.totalTransferred}`);
            console.log(`   Total Transactions: ${wallet.transactions} (${wallet.successfulTransactions} successful, ${wallet.failedTransactions} failed)`);
            
            // Chain-specific stats
            console.log('\n   Chain Stats:');
            Object.entries(wallet.chainStats).forEach(([chain, stats]) => {
                console.log(`   ${this.chainsConfig[chain].name}:`);
                console.log(`      Transactions: ${stats.transactions} (${stats.successfulTransactions} successful, ${stats.failedTransactions} failed)`);
                console.log(`      Gas Used: ${stats.gasUsed}`);
            });
            
            if (wallet.tokens.length > 0) {
                console.log('\n   Tokens:');
                wallet.tokens.forEach((token, tokenIndex) => {
                    console.log(`   ${tokenIndex + 1}. ${token.name || 'Unnamed Token'}`);
                    console.log(`      Token: ${token.tokenAddress}`);
                    console.log(`      Type: ${token.tokenType.toUpperCase()}`);
                    console.log(`      Chain: ${this.chainsConfig[token.chain].name}`);
                    console.log(`      Recipient: ${token.recipientAddress}`);
                    console.log(`      Total Transferred: ${token.totalTransferred}`);
                    console.log(`      Transactions: ${token.transactions} (${token.successfulTransactions} successful, ${token.failedTransactions} failed)`);
                });
            } else {
                console.log('   No tokens added yet');
            }
        });
    }

    pauseWallet(privateKey) {
        const wallet = this.getWalletByPrivateKey(privateKey);
        if (!wallet) {
            console.error('Wallet not found');
            return false;
        }
        wallet.isPaused = true;
        this.saveWallets();
        console.log(`Paused wallet: ${wallet.name || privateKey.slice(0, 6)}...`);
        return true;
    }

    unpauseWallet(privateKey) {
        const wallet = this.getWalletByPrivateKey(privateKey);
        if (!wallet) {
            console.error('Wallet not found');
            return false;
        }
        wallet.isPaused = false;
        this.saveWallets();
        console.log(`Unpaused wallet: ${wallet.name || privateKey.slice(0, 6)}...`);
        return true;
    }

    isWalletPaused(privateKey) {
        const wallet = this.getWalletByPrivateKey(privateKey);
        if (!wallet) {
            console.error('Wallet not found');
            return false;
        }
        return wallet.isPaused;
    }

    // New method to add a chain to an existing wallet
    addChainToWallet(privateKey, chain) {
        const wallet = this.getWalletByPrivateKey(privateKey);
        if (!wallet) {
            console.error('Wallet not found');
            return false;
        }

        if (!this.chainsConfig[chain]) {
            console.error(`Unsupported chain: ${chain}`);
            return false;
        }

        if (wallet.chains.includes(chain)) {
            console.error(`Wallet already supports chain: ${chain}`);
            return false;
        }

        wallet.chains.push(chain);
        wallet.chainStats[chain] = {
            transactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            gasUsed: '0',
            lastChecked: null
        };

        this.saveWallets();
        console.log(`Added chain ${this.chainsConfig[chain].name} to wallet ${wallet.name || privateKey.slice(0, 6)}...`);
        return true;
    }

    // New method to remove a chain from a wallet
    removeChainFromWallet(privateKey, chain) {
        const wallet = this.getWalletByPrivateKey(privateKey);
        if (!wallet) {
            console.error('Wallet not found');
            return false;
        }

        if (!wallet.chains.includes(chain)) {
            console.error(`Wallet does not support chain: ${chain}`);
            return false;
        }

        // Remove chain and its tokens
        wallet.chains = wallet.chains.filter(c => c !== chain);
        wallet.tokens = wallet.tokens.filter(t => t.chain !== chain);
        delete wallet.chainStats[chain];

        this.saveWallets();
        console.log(`Removed chain ${this.chainsConfig[chain].name} from wallet ${wallet.name || privateKey.slice(0, 6)}...`);
        return true;
    }

    // Add method to update base token recipient
    updateBaseTokenRecipient(privateKey, recipientAddress) {
        const wallet = this.getWalletByPrivateKey(privateKey);
        if (wallet) {
            wallet.baseTokenRecipient = recipientAddress;
            this.saveWallets();
            console.log(`Updated base token recipient for wallet ${wallet.name || privateKey.slice(0, 6)}... to ${recipientAddress}`);
            return true;
        }
        console.error('Wallet not found');
        return false;
    }

    getStats() {
        const stats = {
            totalWallets: this.wallets.length,
            activeWallets: this.getActiveWallets().length,
            pausedWallets: this.wallets.filter(w => w.isPaused).length,
            totalTokens: this.wallets.reduce((sum, wallet) => sum + wallet.tokens.length, 0),
            totalTransactions: this.wallets.reduce((sum, wallet) => sum + wallet.transactions, 0),
            successfulTransactions: this.wallets.reduce((sum, wallet) => sum + wallet.successfulTransactions, 0),
            failedTransactions: this.wallets.reduce((sum, wallet) => sum + wallet.failedTransactions, 0),
            totalGasUsed: this.wallets.reduce((sum, wallet) => sum + parseFloat(wallet.gasUsed || 0), 0),
            chains: {},
            tokenTypes: {}
        };

        // Chain-specific stats
        Object.keys(this.chainsConfig).forEach(chain => {
            const chainWallets = this.getWalletsByChain(chain);
            stats.chains[chain] = {
                wallets: chainWallets.length,
                activeWallets: chainWallets.filter(w => w.status === 'active' && !w.isPaused).length,
                tokens: chainWallets.reduce((sum, wallet) => sum + wallet.tokens.filter(t => t.chain === chain).length, 0),
                transactions: chainWallets.reduce((sum, wallet) => sum + (wallet.chainStats[chain]?.transactions || 0), 0),
                successfulTransactions: chainWallets.reduce((sum, wallet) => sum + (wallet.chainStats[chain]?.successfulTransactions || 0), 0),
                failedTransactions: chainWallets.reduce((sum, wallet) => sum + (wallet.chainStats[chain]?.failedTransactions || 0), 0),
                gasUsed: chainWallets.reduce((sum, wallet) => sum + parseFloat(wallet.chainStats[chain]?.gasUsed || 0), 0)
            };
        });

        // Token type stats
        this.wallets.forEach(wallet => {
            wallet.tokens.forEach(token => {
                if (!stats.tokenTypes[token.tokenType]) {
                    stats.tokenTypes[token.tokenType] = {
                        count: 0,
                        transactions: 0,
                        successfulTransactions: 0,
                        failedTransactions: 0
                    };
                }
                stats.tokenTypes[token.tokenType].count++;
                stats.tokenTypes[token.tokenType].transactions += token.transactions;
                stats.tokenTypes[token.tokenType].successfulTransactions += token.successfulTransactions;
                stats.tokenTypes[token.tokenType].failedTransactions += token.failedTransactions;
            });
        });

        return stats;
    }

    toggleWallet(privateKey) {
        const wallet = this.getWalletByPrivateKey(privateKey);
        if (wallet) {
            wallet.isPaused = !wallet.isPaused;
            this.saveWallets();
            console.log(`Wallet ${wallet.name || privateKey.slice(0, 6)}... ${wallet.isPaused ? 'paused' : 'unpaused'}`);
            return wallet;
        }
        console.error('Wallet not found');
        return null;
    }

    updateWallet(privateKey, updates) {
        const wallet = this.getWalletByPrivateKey(privateKey);
        if (wallet) {
            // Only allow updating certain fields
            const allowedUpdates = ['name', 'chains', 'baseTokenRecipient'];
            allowedUpdates.forEach(field => {
                if (updates[field] !== undefined) {
                    wallet[field] = updates[field];
                }
            });
            this.saveWallets();
            console.log(`Updated wallet: ${wallet.name || privateKey.slice(0, 6)}...`);
            return wallet;
        }
        console.error('Wallet not found');
        return null;
    }
} 


export default WalletManager; 