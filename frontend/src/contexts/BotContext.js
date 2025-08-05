import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

// Global axios interceptor to handle 401 responses
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Clear expired/invalid tokens
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== '/login') {
        console.log('Token expired or invalid, redirecting to login');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const BotContext = createContext();

// Helper function to check if token is expired
const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error parsing token:', error);
    return true;
  }
};

// Helper function to clear expired tokens
const clearExpiredTokens = () => {
  const token = localStorage.getItem('token');
  if (isTokenExpired(token)) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return true;
  }
  return false;
};

const initialState = {
  botStatus: 'connecting',
  metrics: {
    totalWallets: 0,
    totalTokens: 0,
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    nativeTokenSupport: false,
    chains: [],
    lastUpdate: null
  },
  wallets: [],
  config: {},
  stats: {},
  chains: [],
  loading: false,
  error: null,
  socket: null
};

const botReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_BOT_STATUS':
      return { ...state, botStatus: action.payload };
    case 'UPDATE_METRICS':
      return { ...state, metrics: { ...state.metrics, ...action.payload } };
    case 'SET_WALLETS':
      return { ...state, wallets: action.payload };
    case 'SET_CONFIG':
      return { ...state, config: action.payload };
    case 'SET_CHAINS':
      return { ...state, chains: action.payload };
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    case 'SET_SOCKET':
      return { ...state, socket: action.payload };
    case 'ADD_WALLET':
      return { ...state, wallets: [...state.wallets, action.payload] };
    case 'UPDATE_WALLET':
      return {
        ...state,
        wallets: state.wallets.map(wallet =>
          wallet.privateKey === action.payload.privateKey ? action.payload : wallet
        )
      };
    case 'REMOVE_WALLET':
      return {
        ...state,
        wallets: state.wallets.filter(wallet => wallet.privateKey !== action.payload)
      };
    default:
      return state;
  }
};

export const BotProvider = ({ children }) => {
  const [state, dispatch] = useReducer(botReducer, initialState);

  // Initialize socket connection
  useEffect(() => {
    const socketUrl = process.env.REACT_APP_WS_URL || 'http://localhost:3002';
    const socket = io(socketUrl);
    
    socket.on('connect', () => {
      console.log('Connected to bot API');
      dispatch({ type: 'SET_BOT_STATUS', payload: 'connected' });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from bot API');
      dispatch({ type: 'SET_BOT_STATUS', payload: 'disconnected' });
    });

    socket.on('bot-status', (data) => {
      dispatch({ type: 'UPDATE_METRICS', payload: data.metrics });
      dispatch({ type: 'SET_CONFIG', payload: data.config });
    });

    socket.on('metrics-update', (metrics) => {
      dispatch({ type: 'UPDATE_METRICS', payload: metrics });
    });

    dispatch({ type: 'SET_SOCKET', payload: socket });

    return () => {
      socket.disconnect();
    };
  }, []);

  // API functions wrapped in useCallback to prevent dependency issues
  const api = useMemo(() => ({
    // Get bot status
    getStatus: async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        console.log('Making API call with token:', token ? 'Present' : 'Missing');
        console.log('Headers:', headers);
        
        const response = await axios.get(`${API_BASE_URL}/status`, { headers });
        dispatch({ type: 'UPDATE_METRICS', payload: response.data.metrics });
        dispatch({ type: 'SET_CONFIG', payload: response.data.config });
        return response.data;
      } catch (error) {
        console.error('API call failed:', error.response?.status, error.response?.data);
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Get wallets
    getWallets: async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(`${API_BASE_URL}/wallets`, { headers });
        dispatch({ type: 'SET_WALLETS', payload: response.data.wallets });
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Get chains
    getChains: async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(`${API_BASE_URL}/chains`, { headers });
        if (response.data.success) {
          dispatch({ type: 'SET_CHAINS', payload: response.data.chains });
        }
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      }
    },

    // Add wallet
    addWallet: async (walletData) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
        const response = await axios.post(`${API_BASE_URL}/wallets`, walletData, { headers });
        if (response.data.success) {
          dispatch({ type: 'ADD_WALLET', payload: response.data.wallet });
        }
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Update wallet
    updateWallet: async (privateKey, updates) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
        const response = await axios.put(`${API_BASE_URL}/wallets/${privateKey}`, updates, { headers });
        if (response.data.success) {
          dispatch({ type: 'UPDATE_WALLET', payload: response.data.wallet });
        }
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Remove wallet
    removeWallet: async (privateKey) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.delete(`${API_BASE_URL}/wallets/${privateKey}`, { headers });
        if (response.data.success) {
          dispatch({ type: 'REMOVE_WALLET', payload: privateKey });
        }
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Toggle wallet pause
    toggleWallet: async (privateKey) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.post(`${API_BASE_URL}/wallets/${privateKey}/toggle`, {}, { headers });
        if (response.data.success) {
          dispatch({ type: 'UPDATE_WALLET', payload: response.data.wallet });
        }
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Add token to wallet
    addToken: async (privateKey, tokenData) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
        const response = await axios.post(`${API_BASE_URL}/wallets/${privateKey}/tokens`, tokenData, { headers });
        if (response.data.success) {
          // Refresh wallets to get updated token list
          await api.getWallets();
        }
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Add token to wallet (with individual parameters)
    addTokenToWallet: async (privateKey, tokenAddress, recipientAddress, tokenName, chain, tokenType) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
        const response = await axios.post(`${API_BASE_URL}/wallets/${privateKey}/tokens`, {
          tokenAddress,
          recipientAddress,
          tokenName,
          chain,
          tokenType
        }, { headers });
        if (response.data.success) {
          // Refresh wallets to get updated token list
          await api.getWallets();
        }
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Remove token from wallet
    removeToken: async (privateKey, tokenAddress, chain) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.delete(`${API_BASE_URL}/wallets/${privateKey}/tokens/${tokenAddress}?chain=${chain}`, { headers });
        if (response.data.success) {
          // Refresh wallets to get updated token list
          await api.getWallets();
        }
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Remove token from wallet (alias for consistency)
    removeTokenFromWallet: async (privateKey, tokenAddress, chain) => {
      return api.removeToken(privateKey, tokenAddress, chain);
    },

    // Add chain to wallet
    addChainToWallet: async (privateKey, chain) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
        const response = await axios.post(`${API_BASE_URL}/wallets/${privateKey}/chains`, { chain }, { headers });
        if (response.data.success) {
          // Refresh wallets to get updated chain list
          await api.getWallets();
        }
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Remove chain from wallet
    removeChainFromWallet: async (privateKey, chain) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.delete(`${API_BASE_URL}/wallets/${privateKey}/chains/${chain}`, { headers });
        if (response.data.success) {
          // Refresh wallets to get updated chain list
          await api.getWallets();
        }
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Update native token recipient
    updateNativeTokenRecipient: async (privateKey, recipientAddress) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
        const response = await axios.put(`${API_BASE_URL}/wallets/${privateKey}/native-recipient`, { recipientAddress }, { headers });
        if (response.data.success) {
          // Refresh wallets to get updated recipient
          await api.getWallets();
        }
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Admin: Get RPC configuration
    getRpcConfig: async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(`${API_BASE_URL}/admin/rpc`, { headers });
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Admin: Update RPC configuration
    updateRpcConfig: async (chain, rpc) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
        const response = await axios.put(`${API_BASE_URL}/admin/rpc`, { chain, rpc }, { headers });
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Admin: Add new chain
    addChain: async (chain, config) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
        const response = await axios.post(`${API_BASE_URL}/admin/chains`, { chain, config }, { headers });
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Admin: Remove chain
    removeChain: async (chain) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.delete(`${API_BASE_URL}/admin/chains/${chain}`, { headers });
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Get configuration
    getConfig: async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.log('No token available for getConfig, skipping');
          return { success: false, error: 'No authentication token' };
        }
        
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get(`${API_BASE_URL}/config`, { headers });
        dispatch({ type: 'SET_CONFIG', payload: response.data.config });
        return response.data;
      } catch (error) {
        console.error('getConfig error:', error.response?.status, error.response?.data);
        // Don't throw error if it's a 401/403/404 due to no auth
        if (error.response?.status === 401 || error.response?.status === 403 || error.response?.status === 404) {
          console.log('Authentication required for config access');
          return { success: false, error: 'Authentication required' };
        }
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Load configuration when needed (for authenticated users)
    loadConfig: async () => {
      try {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (!token || !userData) {
          console.log('User not authenticated, cannot load config');
          return { success: false, error: 'User not authenticated' };
        }
        
        return await api.getConfig();
      } catch (error) {
        console.error('loadConfig error:', error);
        return { success: false, error: error.message };
      }
    },

    // Update configuration
    updateConfig: async (updates) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
        const response = await axios.put(`${API_BASE_URL}/config`, updates, { headers });
        if (response.data.success) {
          dispatch({ type: 'SET_CONFIG', payload: response.data.config });
        }
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Get statistics
    getStats: async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(`${API_BASE_URL}/stats`, { headers });
        dispatch({ type: 'SET_STATS', payload: response.data.stats });
        return response.data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Get metrics (alias for getStatus)
    getMetrics: async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(`${API_BASE_URL}/status`, { headers });
        dispatch({ type: 'UPDATE_METRICS', payload: response.data.metrics });
        return response.data;
      } catch (error) {
        console.error('Failed to get metrics:', error);
        throw error;
      }
    },

    // Reload configuration
    reloadConfig: async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.log('No token available for reloadConfig, skipping');
          return { success: false, error: 'No authentication token' };
        }
        
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.post(`${API_BASE_URL}/config/reload`, {}, { headers });
        if (response.data.success) {
          dispatch({ type: 'SET_CONFIG', payload: response.data.config });
        }
        return response.data;
      } catch (error) {
        console.error('reloadConfig error:', error.response?.status, error.response?.data);
        // Don't throw error if it's a 401/403/404 due to no auth
        if (error.response?.status === 401 || error.response?.status === 403 || error.response?.status === 404) {
          console.log('Authentication required for config reload');
          return { success: false, error: 'Authentication required' };
        }
        dispatch({ type: 'SET_ERROR', payload: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    // Refresh all data
    refreshData: async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.log('No token available for refreshData, skipping');
          return { success: false, error: 'No authentication token' };
        }
        
        // Refresh wallets, config, and metrics
        const results = await Promise.allSettled([
          api.getWallets(),
          api.getConfig(),
          api.getMetrics()
        ]);
        
        // Log any failures but don't throw
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Failed to refresh data item ${index}:`, result.reason);
          }
        });
        
        return { success: true };
      } catch (error) {
        console.error('refreshData error:', error);
        return { success: false, error: error.message };
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  }), []);

  // Fetch initial data when the provider mounts
  useEffect(() => {
    const loadInitialData = async () => {
      if (clearExpiredTokens()) {
        // If tokens were cleared, no need to fetch data
        return;
      }
      
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');

      if (token && user) {
        try {
          await api.getWallets();
          // Only try to get config if we have a valid token
          const configResult = await api.getConfig();
          if (!configResult.success) {
            console.log('Config not available:', configResult.error);
          }
          await api.getChains(); // Fetch chains on initial load
        } catch (error) {
          console.error('Failed to load initial data:', error);
        }
      }
    };

    loadInitialData();
  }, [api]);

  // Reduced frequency metrics updates (every 15 seconds instead of 10)
  useEffect(() => {
    const interval = setInterval(() => {
      // Check for expired tokens before making API calls
      if (clearExpiredTokens()) {
        console.log('Expired token detected during metrics update, stopping updates');
        return;
      }
      
      if (api) {
        api.getMetrics();
      }
    }, 15000); // Changed from 10000 to 15000

    return () => clearInterval(interval);
  }, [api]);

  const value = {
    ...state,
    api
  };

  return (
    <BotContext.Provider value={value}>
      {children}
    </BotContext.Provider>
  );
};

export const useBot = () => {
  const context = useContext(BotContext);
  if (!context) {
    throw new Error('useBot must be used within a BotProvider');
  }
  return context;
}; 