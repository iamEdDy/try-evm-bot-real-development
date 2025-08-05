# EVM Bot Frontend Dashboard

A modern React-based dashboard for controlling and monitoring your EVM bot in real-time.

## 🚀 Quick Start

### Option 1: All-in-One Startup (Recommended)
```bash
./start.sh
```

This will start:
- 🤖 Bot (index.js)
- 🌐 API Server (port 3002)
- 🎨 React Frontend (port 3000)

### Option 2: Manual Startup

1. **Start the Bot:**
```bash
node index.js
```

2. **Start the API Server:**
```bash
cd api
npm install
node server.js
```

3. **Start the React Frontend:**
```bash
cd frontend
npm install
npm start
```

## 📊 Dashboard Features

### Real-Time Monitoring
- **Live Metrics**: Transaction counts, success rates, gas usage
- **Bot Status**: Connection status, runtime, configuration
- **Performance Charts**: Visual representation of bot performance
- **WebSocket Updates**: Real-time data without page refresh

### Wallet Management
- **Add/Remove Wallets**: Secure private key management
- **Chain Configuration**: Support for Ethereum, BSC, Polygon, Arbitrum
- **Token Management**: Add/remove tokens per wallet
- **Pause/Resume**: Individual wallet control
- **Native Token Support**: Configure native token recipients

### Configuration Control
- **Gas Price Settings**: Adjust gas price multipliers
- **Native Token Support**: Enable/disable native token transfers
- **Performance Tuning**: Cache durations, check intervals
- **Real-time Updates**: Configuration changes apply immediately

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   API Server    │    │   EVM Bot       │
│   (Port 3000)   │◄──►│   (Port 3002)   │◄──►│   (index.js)    │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • REST API      │    │ • Web3 Monitor  │
│ • Wallet Mgmt   │    │ • WebSocket     │    │ • Transaction   │
│ • Configuration │    │ • File I/O      │    │ • RPC Rotation  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack
- **Frontend**: React 18, Material-UI, Recharts
- **API**: Express.js, Socket.IO, CORS
- **State Management**: React Context + useReducer
- **Real-time**: WebSocket connections
- **Styling**: Material-UI with dark theme

## 📁 Project Structure

```
try-evm-bot-real/
├── api/                    # API Server
│   ├── server.js          # Express + Socket.IO server
│   └── package.json       # API dependencies
├── frontend/              # React Application
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── Dashboard.js
│   │   │   ├── Wallets.js
│   │   │   ├── Configuration.js
│   │   │   └── Navigation.js
│   │   ├── contexts/      # State management
│   │   │   └── BotContext.js
│   │   └── App.js         # Main app component
│   └── package.json       # Frontend dependencies
├── index.js               # Main bot logic
├── start.sh              # All-in-one startup script
└── README-FRONTEND.md    # This file
```

## 🔧 API Endpoints

### Bot Status
- `GET /api/status` - Get bot status and metrics
- `GET /api/health` - Health check

### Wallet Management
- `GET /api/wallets` - Get all wallets
- `GET /api/wallets/active` - Get active wallets
- `POST /api/wallets` - Add new wallet
- `PUT /api/wallets/:privateKey` - Update wallet
- `DELETE /api/wallets/:privateKey` - Remove wallet
- `POST /api/wallets/:privateKey/toggle` - Pause/unpause wallet

### Token Management
- `POST /api/wallets/:privateKey/tokens` - Add token to wallet
- `DELETE /api/wallets/:privateKey/tokens/:tokenAddress` - Remove token

### Configuration
- `GET /api/config` - Get current configuration
- `PUT /api/config` - Update configuration
- `GET /api/stats` - Get wallet statistics

### WebSocket Events
- `bot-status` - Initial bot status
- `metrics-update` - Real-time metrics updates

## 🎨 UI Components

### Dashboard
- **Metric Cards**: Key performance indicators
- **Transaction Charts**: Success rate visualization
- **Configuration Summary**: Current settings overview
- **Real-time Updates**: Live data refresh

### Wallets
- **Wallet Cards**: Individual wallet information
- **Add/Edit Dialogs**: Modal forms for wallet management
- **Token Lists**: Per-wallet token management
- **Status Indicators**: Active/paused states

### Configuration
- **Form Controls**: Input fields for all settings
- **Real-time Validation**: Input validation and feedback
- **Save/Refresh**: Configuration persistence

## 🔒 Security Features

- **Private Key Protection**: Secure input fields
- **CORS Configuration**: Controlled API access
- **Input Validation**: Server-side validation
- **Error Handling**: Graceful error management

## 📈 Performance Features

- **RPC Rotation**: Load balancing across multiple RPC endpoints
- **Caching**: Gas prices and contract instances
- **WebSocket**: Real-time updates without polling
- **Optimistic Updates**: Immediate UI feedback

## 🚀 Deployment

### Local Development
```bash
# Install dependencies
cd api && npm install
cd ../frontend && npm install

# Start development servers
./start.sh
```

### Production Deployment
```bash
# Build frontend
cd frontend
npm run build

# Start production servers
cd ../api
NODE_ENV=production node server.js
```

### Docker Deployment
```dockerfile
# Example Dockerfile for API
FROM node:18-alpine
WORKDIR /app
COPY api/package*.json ./
RUN npm ci --only=production
COPY api/ ./
EXPOSE 3002
CMD ["node", "server.js"]
```

## 🔧 Configuration

### Environment Variables
```bash
# API Server
PORT=3002
NODE_ENV=production

# Frontend
REACT_APP_API_URL=http://localhost:3002
```

### API Configuration
The API server automatically loads configuration from:
- `config/config.json` - Bot configuration
- `config/chains.json` - Chain configurations
- `wallets.json` - Wallet data

## 📊 Monitoring

### Real-time Metrics
- Transaction success/failure rates
- Gas usage per chain
- RPC connection status
- Native token transfer statistics

### Performance Monitoring
- Response times
- Error rates
- RPC rotation statistics
- Cache hit rates

## 🛠️ Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Check if API server is running on port 3002
   - Verify CORS configuration
   - Check firewall settings

2. **WebSocket Disconnection**
   - Verify bot is running and connected
   - Check network connectivity
   - Restart API server

3. **Configuration Not Saving**
   - Check file permissions for config files
   - Verify API server has write access
   - Check for validation errors

### Debug Mode
```bash
# Enable debug logging
DEBUG=* node api/server.js

# Frontend development
cd frontend && npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the main bot README
3. Open an issue on GitHub

---

**Note**: This frontend is designed to work with the existing EVM bot. Make sure your bot is properly configured before using the dashboard. 