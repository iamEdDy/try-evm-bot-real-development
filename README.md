# Multi-Chain EVM Token Transfer Bot

A high-performance Node.js bot for monitoring and automatically transferring tokens across multiple EVM-compatible blockchains. Supports real-time monitoring, RPC rotation, and multiple token standards.

## Features

- **Multi-Chain Support**: Ethereum, BSC, Polygon, Arbitrum
- **Multiple Token Standards**: ERC20, ERC721, ERC1155 (and equivalents)
- **Native Token Support**: ETH, MATIC, BNB with configurable on/off toggle
- **Real-Time Monitoring**: WebSocket connections for instant block detection
- **RPC Rotation**: Load balancing across multiple RPC endpoints per chain
- **High Performance**: ~300-400ms from detection to transaction submission
- **Comprehensive Metrics**: Detailed performance and transaction tracking
- **Wallet Management**: CLI tool for easy wallet and token configuration
- **Gas Optimization**: Smart gas price management with configurable multipliers
- **Error Handling**: Robust retry logic and error recovery
- **Contract Caching**: Optimized contract instance management

## Native Token Support

The bot now supports native tokens (ETH, MATIC, BNB) with a configurable on/off toggle:

### Configuration

Edit `config/config.json` to control native token support:

```json
{
    "nativeTokenSupport": true,
    "nativeTokenGasLimit": 21000,
    "nativeTokenMinBalance": "0.001",
    "gasPriceMultiplier": 1.5
}
```

- `nativeTokenSupport`: Enable/disable native token transfers
- `nativeTokenGasLimit`: Gas limit for native token transfers (default: 21000)
- `nativeTokenMinBalance`: Minimum balance to keep for gas fees
- `gasPriceMultiplier`: Multiplier for gas price optimization

### How Native Token Transfers Work

1. **Balance Monitoring**: Bot checks native token balances in configured wallets
2. **Threshold Check**: When balance exceeds minimum, triggers transfer
3. **Gas Calculation**: Automatically calculates required gas and keeps minimum balance
4. **Optimized Transfer**: Uses optimized gas settings for fast execution
5. **Recipient Transfer**: Sends excess tokens to configured recipient address

### Supported Native Tokens

- **Ethereum**: ETH
- **BSC**: BNB  
- **Polygon**: MATIC
- **Arbitrum**: ETH

### Setup for Native Tokens

1. Enable native token support in config
2. Add wallet with `baseTokenRecipient` address
3. Bot automatically handles native token transfers
4. No need to add native tokens as separate token entries

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd try-evm-bot-real

# Install dependencies
npm install

# Create configuration files
cp config/config.example.json config/config.json
```

## Configuration

### 1. Chain Configuration (`config/chains.json`)

Configure RPC endpoints for each chain:

```json
{
    "ethereum": {
        "name": "Ethereum",
        "rpc": [
            "wss://mainnet.infura.io/ws/v3/YOUR_PROJECT_ID",
            "wss://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY"
        ],
        "nativeCurrency": {
            "symbol": "ETH",
            "decimals": 18
        }
    }
}
```

### 2. Token Standards (`config/tokenStandards.json`)

Define supported token types per chain:

```json
{
    "ethereum": {
        "erc20": {
            "name": "ERC20",
            "abi": "erc20.json"
        },
        "erc721": {
            "name": "ERC721", 
            "abi": "erc721.json"
        }
    }
}
```

### 3. Bot Configuration (`config/config.json`)

Main bot settings:

```json
{
    "chains": ["ethereum", "bsc", "polygon", "arbitrum"],
    "gasPriceMultiplier": 1.5,
    "gasPriceCacheDuration": 1000,
    "nonceUpdateInterval": 5000,
    "metricsUpdateInterval": 5000,
    "backupCheckInterval": 100,
    "minBalanceToKeep": "0.01",
    "nativeTokenSupport": true,
    "nativeTokenGasLimit": 21000,
    "nativeTokenMinBalance": "0.001"
}
```

## Usage

### 1. Wallet Management

Use the CLI tool to manage wallets and tokens:

```bash
node manage-wallets.js
```

**Available Commands:**
- List all wallets
- Add new wallet (with native token recipient)
- Add token to wallet
- Remove token/wallet
- Update wallet status
- Pause/unpause wallets
- Update base token recipient
- View native token information

### 2. Adding Wallets

```bash
# Interactive mode
node manage-wallets.js

# Or programmatically
const walletManager = new WalletManager();
walletManager.addWallet(
    privateKey,
    walletName,
    ['ethereum', 'polygon'],
    baseTokenRecipient // For native token transfers
);
```

### 3. Adding Tokens

```bash
# Via CLI
node manage-wallets.js

# Or programmatically
walletManager.addTokenToWallet(
    privateKey,
    tokenAddress,
    recipientAddress,
    tokenName,
    chain,
    tokenType
);
```

### 4. Running the Bot

```bash
# Start the bot
node index.js

# With PM2 (recommended for production)
pm2 start index.js --name evm-bot
pm2 logs evm-bot
pm2 status
```

## Architecture

### Core Components

1. **Main Bot (`index.js`)**
   - WebSocket block monitoring
   - RPC rotation and load balancing
   - Transaction orchestration
   - Performance metrics

2. **Wallet Manager (`walletManager.js`)**
   - Wallet and token management
   - Configuration persistence
   - Status tracking

3. **Transaction Manager (`transactionManager.js`)**
   - Transaction creation and signing
   - Nonce management
   - Gas price optimization

### Performance Optimizations

- **RPC Rotation**: Distributes requests across multiple endpoints
- **Contract Caching**: Reuses contract instances
- **Gas Price Caching**: Reduces API calls with 1-second cache
- **WebSocket Connections**: Real-time block monitoring
- **Parallel Processing**: Concurrent balance checks and transfers

### Monitoring and Metrics

The bot provides comprehensive metrics every 5 seconds:

```
=== Performance Metrics ===
Runtime: 120.45 seconds
Active Wallets: 5
Total Tokens: 15
Total Transactions: 25
Successful Transactions: 24
Failed Transactions: 1
Success Rate: 96.00%
Native Token Support: ENABLED

=== Chain Metrics ===
Ethereum:
  Transactions: 10
  Successful: 10
  Failed: 0
  Gas Used: 0.0023 ETH
  Native ETH:
    Transactions: 3
    Successful: 3
    Failed: 0
    Gas Used: 0.0006 ETH
    Total Transferred: 0.15 ETH
```

## Safety Features

- **Minimum Balance Protection**: Keeps specified amounts for gas fees
- **Gas Price Optimization**: Configurable multipliers for transaction success
- **Error Recovery**: Automatic retry logic for failed transactions
- **RPC Failover**: Multiple RPC endpoints per chain
- **Transaction Validation**: Checks transaction status before marking success

## Hosting Options

### 1. Local Development

```bash
# Install PM2 for process management
npm install -g pm2

# Start the bot
pm2 start index.js --name evm-bot

# Monitor logs
pm2 logs evm-bot

# Auto-restart on reboot
pm2 startup
pm2 save
```

### 2. Cloud VMs

**Google Cloud / AWS / Oracle Cloud:**

```bash
# Install Node.js and PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g pm2

# Clone and setup
git clone <repository-url>
cd try-evm-bot-real
npm install

# Configure and start
pm2 start index.js --name evm-bot
pm2 startup
pm2 save
```

### 3. Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "index.js"]
```

```bash
# Build and run
docker build -t evm-bot .
docker run -d --name evm-bot evm-bot
```

### 4. Serverless Functions

For AWS Lambda or similar:

```javascript
// handler.js
export const handler = async (event) => {
    // Bot logic here
    return { statusCode: 200, body: 'Bot executed successfully' };
};
```

## Troubleshooting

### Common Issues

1. **RPC Connection Failures**
   - Check RPC endpoint URLs
   - Verify API keys and rate limits
   - Enable RPC rotation for redundancy

2. **Transaction Failures**
   - Increase gas price multiplier
   - Check wallet balances
   - Verify recipient addresses

3. **Native Token Issues**
   - Ensure `nativeTokenSupport` is enabled
   - Set `baseTokenRecipient` for wallets
   - Check minimum balance configuration

### Performance Tuning

- **Increase RPC endpoints** for better load distribution
- **Adjust gas price multiplier** based on network congestion
- **Optimize backup check interval** for faster response
- **Monitor metrics** for bottlenecks

## Security Considerations

- **Private Key Storage**: Store securely, never commit to version control
- **RPC Security**: Use HTTPS/WSS endpoints with API keys
- **Network Security**: Run on secure networks with firewall protection
- **Access Control**: Limit access to bot configuration and logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section
- Review configuration examples
- Monitor bot metrics for insights
- Enable debug logging for detailed analysis 