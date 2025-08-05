import Web3 from 'web3';
import config from './config/config.json' assert { type: "json" };
import erc20Abi from './abis/erc20.json' assert { type: "json" };
import erc721Abi from './abis/erc721.json' assert { type: "json" };
import erc1155Abi from './abis/erc1155.json' assert { type: "json" };

// Map of ABI files (same as in index.js)
const abiMap = {
    'erc20.json': erc20Abi.abi,
    'erc721.json': erc721Abi.abi,
    'erc1155.json': erc1155Abi.abi,
    'bep20.json': erc20Abi.abi,
    'bep721.json': erc721Abi.abi,
    'polygon-erc20.json': erc20Abi.abi,
    'polygon-erc721.json': erc721Abi.abi,
    'arbitrum-erc20.json': erc20Abi.abi,
    'arbitrum-erc721.json': erc721Abi.abi
};

export class TransactionManager {
    constructor(web3) {
        this.web3 = web3;
        this.nonceCache = new Map();
        this.nonceUpdateInterval = config.nonceUpdateInterval || 5000;
        this.startNonceUpdates();
        this.gasPriceCache = {
            price: null,
            timestamp: 0,
            duration: 1000 // 1 second cache
        };
        this.contractCache = new Map();
    }

    // Initialize nonce for an account
    async initializeNonce(address) {
        if (!address) {
            return 0;
        }
        
        try {
            // Get the current nonce for the account
            const nonce = await this.web3.eth.getTransactionCount(address, 'pending');
            this.nonceCache.set(address, nonce);
            console.log(`Initialized nonce for ${address}: ${nonce}`);
            return nonce;
        } catch (error) {
            console.error('Error initializing nonce:', error.message);
            // Set a default nonce if we can't get it
            this.nonceCache.set(address, 0);
            return 0;
        }
    }

    // Get current nonce for an address
    async getNonce(address) {
        if (!this.nonceCache.has(address)) {
            return await this.initializeNonce(address);
        }
        return this.nonceCache.get(address);
    }

    // Update nonce for an address
    updateNonce(address) {
        const currentNonce = this.nonceCache.get(address) || 0;
        this.nonceCache.set(address, currentNonce + 1);
    }

    // Get contract instance with caching
    getContract(tokenAddress, chain = 'ethereum', tokenType = 'erc20') {
        const cacheKey = `${chain}-${tokenType}-${tokenAddress}`;
        if (!this.contractCache.has(cacheKey)) {
            // Map token types to ABI files
            let abiFile;
            if (tokenType === 'erc20' || tokenType === 'bep20') {
                abiFile = 'erc20.json';
            } else if (tokenType === 'erc721' || tokenType === 'bep721') {
                abiFile = 'erc721.json';
            } else if (tokenType === 'erc1155') {
                abiFile = 'erc1155.json';
            } else {
                throw new Error(`Unsupported token type: ${tokenType}`);
            }
            
            const abi = abiMap[abiFile];
            if (!abi) {
                throw new Error(`ABI not found for token type: ${tokenType}`);
            }
            
            this.contractCache.set(cacheKey, new this.web3.eth.Contract(abi, tokenAddress));
        }
        return this.contractCache.get(cacheKey);
    }

    // Create a transaction
    async createTransaction(tokenAddress, recipientAddress, amount, privateKey = null, chain = 'ethereum', tokenType = 'erc20') {
        if (!privateKey) {
            throw new Error('No account configured for transaction');
        }

        const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
        const contract = this.getContract(tokenAddress, chain, tokenType);
        
        // Get current nonce
        const nonce = await this.getNonce(account.address);
        
        // Get gas price with caching
        const gasPrice = await this.getGasPrice();
        const increasedGasPrice = (gasPrice * 1.5).toString();

        // Create transaction
        const tx = {
            from: account.address,
            to: tokenAddress,
            nonce: nonce,
            gasPrice: increasedGasPrice,
            data: contract.methods.transfer(recipientAddress, amount).encodeABI()
        };

        // Estimate gas
        const gasLimit = await contract.methods.transfer(recipientAddress, amount)
            .estimateGas({ from: account.address })
            .catch(() => 100000); // Fallback gas limit

        tx.gas = gasLimit;

        // Update nonce
        this.updateNonce(account.address);

        return tx;
    }

    // Get cached gas price or fetch new one
    async getGasPrice() {
        const now = Date.now();
        if (this.gasPriceCache.price && (now - this.gasPriceCache.timestamp) < this.gasPriceCache.duration) {
            return this.gasPriceCache.price;
        }

        const gasPrice = await this.web3.eth.getGasPrice();
        this.gasPriceCache.price = gasPrice;
        this.gasPriceCache.timestamp = now;
        return gasPrice;
    }

    // Send a transaction
    async sendTransaction(tx, privateKey) {
        try {
            const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
            
            // Always get fresh nonce from network to prevent "nonce too low" errors
            const freshNonce = await this.web3.eth.getTransactionCount(account.address, 'pending');
            tx.nonce = freshNonce;
            
            // Update cache with the fresh nonce (handle BigInt properly)
            const nextNonce = BigInt(freshNonce) + 1n;
            this.nonceCache.set(account.address, nextNonce.toString());

            // Sign and send transaction
            const signedTx = await this.web3.eth.accounts.signTransaction(tx, privateKey);
            const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);

            return receipt;
        } catch (error) {
            console.error('Transaction error:', error.message);
            throw error;
        }
    }

    // Execute fast transaction
    async executeFastTransaction(tokenAddress, recipientAddress, amount, privateKey = null, chain = 'ethereum', tokenType = 'erc20') {
        const tx = await this.createTransaction(tokenAddress, recipientAddress, amount, privateKey, chain, tokenType);
        return this.sendTransaction(tx, privateKey);
    }

    // Start nonce updates
    startNonceUpdates() {
        // Remove the automatic nonce updates since we don't have accounts loaded
        // Nonces will be updated when transactions are created
        console.log('Nonce updates disabled - nonces will be managed per transaction');
    }
}
