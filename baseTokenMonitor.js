import Web3 from 'web3';
import { TransactionManager } from './transactionManager.js';
import WalletManager from './walletManager.js';
import config from './config/config.json' assert { type: "json" };
import chainsConfig from './config/chains.json' assert { type: "json" };

// Initialize Web3 instances for each chain
const web3Instances = {};
Object.entries(chainsConfig).forEach(([chain, chainConfig]) => {
    if (config.chains.includes(chain)) {
        web3Instances[chain] = chainConfig.rpc.map(url => {
            const provider = new Web3.providers.WebsocketProvider(url, {
                timeout: 30000,
                clientConfig: {
                    keepalive: true,
                    keepaliveInterval: 60000
                },
                reconnect: {
                    auto: true,
                    delay: 1000,
                    maxAttempts: 5,
                    onTimeout: false
                }
            });
            return new Web3(provider);
        });
    }
});

// Initialize managers
const transactionManagers = {};
Object.keys(web3Instances).forEach(chain => {
    transactionManagers[chain] = new TransactionManager(web3Instances[chain][0]);
});

const walletManager = new WalletManager();

// Performance metrics
const metrics = {
    startTime: Date.now(),
    totalWallets: 0,
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    totalGasUsed: 0,
    averageGasPrice: 0,
    totalExecutionTime: 0,
    balanceChecks: 0,
    balanceCheckTime: 0,
    transactionCreationTime: 0,
    transactionConfirmationTime: 0,
    chainMetrics: {}
};

// Initialize chain-specific metrics
Object.keys(web3Instances).forEach(chain => {
    metrics.chainMetrics[chain] = {
        transactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        gasUsed: 0,
        totalTransferred: '0'
    };
});

// Initialize wallet components
async function initializeWalletComponents() {
    const wallets = walletManager.getActiveWallets();
    metrics.totalWallets = wallets.length;

    // Initialize nonces for all wallets in parallel
    await Promise.all(wallets.map(async wallet => {
        await Promise.all(wallet.chains.map(async chain => {
            const account = web3Instances[chain][0].eth.accounts.privateKeyToAccount(wallet.privateKey);
            await transactionManagers[chain].initializeNonce(account.address);
        }));
    }));
}

// Check balance for base token
async function checkBalance(web3, walletAddress, chain) {
    const startTime = Date.now();
    try {
        const balance = await web3.eth.getBalance(walletAddress);
        const decimals = chainsConfig[chain].nativeCurrency.decimals;
        const symbol = chainsConfig[chain].nativeCurrency.symbol;
        
        metrics.balanceChecks++;
        metrics.balanceCheckTime += (Date.now() - startTime);
        
        return {
            balance: balance / Math.pow(10, decimals),
            symbol,
            decimals
        };
    } catch (error) {
        console.error(`Error checking balance: ${error.message}`);
        return null;
    }
}

// Cache for gas prices to reduce API calls
const gasPriceCache = {};
Object.keys(web3Instances).forEach(chain => {
    gasPriceCache[chain] = {
        price: null,
        timestamp: 0,
        duration: config.gasPriceCacheDuration || 1000
    };
});

// Get cached gas price or fetch new one
async function getGasPrice(chain) {
    const now = Date.now();
    if (gasPriceCache[chain].price && (now - gasPriceCache[chain].timestamp) < gasPriceCache[chain].duration) {
        return gasPriceCache[chain].price;
    }

    const gasPrice = await web3Instances[chain][0].eth.getGasPrice();
    gasPriceCache[chain].price = gasPrice;
    gasPriceCache[chain].timestamp = now;
    return gasPrice;
}

// Update metrics periodically
setInterval(() => {
    const now = Date.now();
    const runtime = (now - metrics.startTime) / 1000;
    const wallets = walletManager.getActiveWallets();
    
    metrics.totalWallets = wallets.length;
    
    console.log('\n=== Base Token Performance Metrics ===');
    console.log(`Runtime: ${runtime.toFixed(2)} seconds`);
    console.log(`Active Wallets: ${metrics.totalWallets}`);
    console.log(`Total Transactions: ${metrics.totalTransactions}`);
    console.log(`Successful Transactions: ${metrics.successfulTransactions}`);
    console.log(`Failed Transactions: ${metrics.failedTransactions}`);
    console.log(`Success Rate: ${((metrics.successfulTransactions / metrics.totalTransactions) * 100).toFixed(2)}%`);
    
    // Chain-specific metrics
    console.log('\n=== Chain Metrics ===');
    Object.entries(metrics.chainMetrics).forEach(([chain, chainMetric]) => {
        console.log(`\n${chainsConfig[chain].name}:`);
        console.log(`Transactions: ${chainMetric.transactions}`);
        console.log(`Successful: ${chainMetric.successfulTransactions}`);
        console.log(`Failed: ${chainMetric.failedTransactions}`);
        console.log(`Gas Used: ${web3Instances[chain][0].utils.fromWei(chainMetric.gasUsed.toString(), 'ether')} ${chainsConfig[chain].nativeCurrency.symbol}`);
        console.log(`Total Transferred: ${web3Instances[chain][0].utils.fromWei(chainMetric.totalTransferred, 'ether')} ${chainsConfig[chain].nativeCurrency.symbol}`);
    });
    
    console.log('\n========================');
}, config.metricsUpdateInterval || 5000);

async function checkAndTransferBalance(wallet, chain) {
    try {
        if (!wallet.baseTokenRecipient) {
            console.log(`No base token recipient set for wallet ${wallet.name || wallet.address}`);
            return;
        }

        const web3 = web3Instances[chain][0];
        const balance = await web3.eth.getBalance(wallet.address);
        
        // Get current gas price
        const gasPrice = await getGasPrice(chain);
        const increasedGasPrice = (gasPrice * (config.gasPriceMultiplier || 1.5)).toString();
        
        // Calculate gas cost for the transfer (21000 gas units for native token transfer)
        const gasCost = BigInt(21000) * BigInt(increasedGasPrice);
        
        if (balance > gasCost) {
            const transferAmount = balance - gasCost;
            console.log(`Found ${web3.utils.fromWei(balance, 'ether')} ${chainsConfig[chain].nativeCurrency.symbol} in wallet ${wallet.name || wallet.address} on ${chainsConfig[chain].name}`);
            
            const tx = {
                from: wallet.address,
                to: wallet.baseTokenRecipient,
                value: transferAmount,
                gas: 21000,
                gasPrice: increasedGasPrice
            };
            
            const receipt = await transactionManagers[chain].sendTransaction(tx, wallet.privateKey);
            
            if (receipt.status) {
                metrics.successfulTransactions++;
                metrics.chainMetrics[chain].successfulTransactions++;
                metrics.totalGasUsed = (metrics.totalGasUsed + receipt.gasUsed).toString();
                metrics.chainMetrics[chain].gasUsed = (metrics.chainMetrics[chain].gasUsed + receipt.gasUsed).toString();
                metrics.chainMetrics[chain].totalTransferred = 
                    (BigInt(metrics.chainMetrics[chain].totalTransferred) + BigInt(transferAmount)).toString();
                console.log(`Successfully transferred ${web3.utils.fromWei(transferAmount, 'ether')} ${chainsConfig[chain].nativeCurrency.symbol} to ${wallet.baseTokenRecipient} on ${chainsConfig[chain].name}`);
            } else {
                metrics.failedTransactions++;
                metrics.chainMetrics[chain].failedTransactions++;
                console.error('Transaction failed');
            }
            
            metrics.totalTransactions++;
            metrics.chainMetrics[chain].transactions++;
        }
    } catch (error) {
        console.error('Error checking/transferring balance:', error.message);
        metrics.failedTransactions++;
        metrics.chainMetrics[chain].failedTransactions++;
        metrics.totalTransactions++;
        metrics.chainMetrics[chain].transactions++;
    }
}

async function checkWalletBalances(wallet) {
    // Check all chains for this wallet in parallel
    const chainChecks = wallet.chains.map(chain => checkAndTransferBalance(wallet, chain));
    await Promise.all(chainChecks);
}

async function startBot() {
    console.log('Starting base token monitor...');
    
    // Subscribe to new blocks for each chain using WebSocket
    Object.entries(web3Instances).forEach(([chain, instances]) => {
        instances.forEach((web3, index) => {
            web3.eth.subscribe('newBlockHeaders', async (error, blockHeader) => {
                if (error) {
                    console.error(`Block subscription error on ${chainsConfig[chain].name} (RPC ${index + 1}):`, error);
                    return;
                }
                
                console.log(`New block detected on ${chainsConfig[chain].name}: ${blockHeader.number}`);
                
                const wallets = walletManager.getActiveWalletsByChain(chain);
                // Check all wallets in parallel
                await Promise.all(wallets.map(wallet => checkWalletBalances(wallet)));
            }).on('error', (error) => {
                console.error(`WebSocket subscription error on ${chainsConfig[chain].name} (RPC ${index + 1}):`, error);
            });
        });
    });
}

// Export the start function
export {
    startBot,
    initializeWalletComponents
}; 