import readline from 'readline';
import WalletManager from './walletManager.js';
import config from './config/config.json' assert { type: "json" };

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const walletManager = new WalletManager();

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function addWallet() {
    console.log('\n=== Add New Wallet ===');
    console.log(`Native token support is currently: ${config.nativeTokenSupport ? 'ENABLED' : 'DISABLED'}`);
    
    const privateKey = await askQuestion('Enter private key: ');
    const name = await askQuestion('Enter wallet name (optional): ');
    
    let baseTokenRecipient = '';
    if (config.nativeTokenSupport) {
        baseTokenRecipient = await askQuestion('Enter base token recipient address (for native tokens like ETH/MATIC/BNB): ');
        if (baseTokenRecipient) {
            console.log('✓ Native token transfers will be enabled for this wallet');
        } else {
            console.log('⚠ No native token recipient set - native tokens will not be transferred');
        }
    } else {
        console.log('⚠ Native token support is disabled in config - native tokens will not be transferred');
    }

    const wallet = walletManager.addWallet(privateKey, name, ['ethereum'], baseTokenRecipient);
    if (wallet) {
        console.log('Wallet added successfully!');
        const addToken = await askQuestion('Would you like to add a token to this wallet? (y/n): ');
        if (addToken.toLowerCase() === 'y') {
            await addTokenToWallet(privateKey);
        }
    }
}

async function addTokenToWallet(privateKey) {
    console.log('\n=== Add Token to Wallet ===');
    console.log('Available token types: ERC20, ERC721, ERC1155 (and their equivalents on other chains)');
    console.log('Note: Native tokens (ETH, MATIC, BNB) are handled automatically if native token support is enabled');
    
    const tokenAddress = await askQuestion('Enter token contract address: ');
    const recipientAddress = await askQuestion('Enter recipient wallet address: ');
    const tokenName = await askQuestion('Enter token name (optional): ');

    if (walletManager.addTokenToWallet(privateKey, tokenAddress, recipientAddress, tokenName)) {
        console.log('Token added successfully!');
        const addAnother = await askQuestion('Would you like to add another token? (y/n): ');
        if (addAnother.toLowerCase() === 'y') {
            await addTokenToWallet(privateKey);
        }
    }
}

async function removeToken() {
    console.log('\n=== Remove Token ===');
    walletManager.listWallets();
    const privateKey = await askQuestion('\nEnter private key: ');
    const tokenAddress = await askQuestion('Enter token address to remove: ');
    
    if (walletManager.removeTokenFromWallet(privateKey, tokenAddress)) {
        console.log('Token removed successfully!');
    }
}

async function removeWallet() {
    console.log('\n=== Remove Wallet ===');
    walletManager.listWallets();
    const privateKey = await askQuestion('\nEnter private key to remove: ');
    
    if (walletManager.removeWallet(privateKey)) {
        console.log('Wallet removed successfully!');
    }
}

async function updateWalletStatus() {
    console.log('\n=== Update Wallet Status ===');
    walletManager.listWallets();
    const privateKey = await askQuestion('\nEnter private key: ');
    const status = await askQuestion('Enter new status (active/inactive): ');

    if (walletManager.updateWalletStatus(privateKey, status)) {
        console.log('Wallet status updated successfully!');
    }
}

async function pauseWallet() {
    const privateKey = await askQuestion('Enter wallet private key to pause: ');
    
    try {
        if (walletManager.pauseWallet(privateKey)) {
            console.log('Wallet paused successfully!');
        }
    } catch (error) {
        console.error('Error pausing wallet:', error.message);
    }
}

async function unpauseWallet() {
    const privateKey = await askQuestion('Enter wallet private key to unpause: ');
    
    try {
        if (walletManager.unpauseWallet(privateKey)) {
            console.log('Wallet unpaused successfully!');
        }
    } catch (error) {
        console.error('Error unpausing wallet:', error.message);
    }
}

async function updateBaseTokenRecipient() {
    console.log('\n=== Update Base Token Recipient ===');
    console.log(`Native token support is currently: ${config.nativeTokenSupport ? 'ENABLED' : 'DISABLED'}`);
    
    if (!config.nativeTokenSupport) {
        console.log('⚠ Native token support is disabled in config. Enable it first to use this feature.');
        return;
    }
    
    walletManager.listWallets();
    const privateKey = await askQuestion('\nEnter private key: ');
    const recipientAddress = await askQuestion('Enter new base token recipient address: ');

    if (walletManager.updateBaseTokenRecipient(privateKey, recipientAddress)) {
        console.log('Base token recipient updated successfully!');
        console.log('✓ Native tokens (ETH/MATIC/BNB) will now be transferred to this address');
    }
}

async function showNativeTokenInfo() {
    console.log('\n=== Native Token Support Information ===');
    console.log(`Status: ${config.nativeTokenSupport ? 'ENABLED' : 'DISABLED'}`);
    
    if (config.nativeTokenSupport) {
        console.log('\nSupported native tokens:');
        console.log('- Ethereum: ETH');
        console.log('- BSC: BNB');
        console.log('- Polygon: MATIC');
        console.log('- Arbitrum: ETH');
        
        console.log('\nConfiguration:');
        console.log(`- Minimum balance to keep: ${config.nativeTokenMinBalance} tokens`);
        console.log(`- Gas limit for native transfers: ${config.nativeTokenGasLimit}`);
        console.log(`- Gas price multiplier: ${config.gasPriceMultiplier}x`);
        
        console.log('\nHow it works:');
        console.log('1. Bot monitors native token balances in configured wallets');
        console.log('2. When balance exceeds minimum, transfers excess to recipient');
        console.log('3. Keeps minimum balance for gas fees');
        console.log('4. Uses optimized gas settings for fast transfers');
    } else {
        console.log('\nTo enable native token support:');
        console.log('1. Edit config/config.json');
        console.log('2. Set "nativeTokenSupport": true');
        console.log('3. Configure "nativeTokenMinBalance" and "nativeTokenGasLimit"');
        console.log('4. Restart the bot');
    }
}

async function showMenu() {
    while (true) {
        console.log('\n=== Wallet Manager ===');
        console.log('1. List all wallets');
        console.log('2. Add new wallet');
        console.log('3. Add token to wallet');
        console.log('4. Remove token');
        console.log('5. Remove wallet');
        console.log('6. Update wallet status');
        console.log('7. Pause wallet');
        console.log('8. Unpause wallet');
        console.log('9. Update base token recipient');
        console.log('10. Native token info');
        console.log('11. Exit');

        const choice = await askQuestion('\nEnter your choice (1-11): ');

        switch (choice) {
            case '1':
                walletManager.listWallets();
                break;
            case '2':
                await addWallet();
                break;
            case '3':
                walletManager.listWallets();
                const privateKey = await askQuestion('\nEnter private key: ');
                await addTokenToWallet(privateKey);
                break;
            case '4':
                await removeToken();
                break;
            case '5':
                await removeWallet();
                break;
            case '6':
                await updateWalletStatus();
                break;
            case '7':
                await pauseWallet();
                break;
            case '8':
                await unpauseWallet();
                break;
            case '9':
                await updateBaseTokenRecipient();
                break;
            case '10':
                await showNativeTokenInfo();
                break;
            case '11':
                console.log('Goodbye!');
                rl.close();
                return;
            default:
                console.log('Invalid choice. Please try again.');
        }
    }
}

// Start the CLI
console.log('Welcome to Wallet Manager!');
console.log(`Native token support: ${config.nativeTokenSupport ? 'ENABLED' : 'DISABLED'}`);
showMenu().catch(console.error); 