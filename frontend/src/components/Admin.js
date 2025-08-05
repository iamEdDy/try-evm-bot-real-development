import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Fade,
  Slide,
  Grow,
  Zoom,
  Paper,
  CircularProgress,
  Avatar,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  NetworkCheck as NetworkIcon,
  Bolt as BoltIcon,
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useBot } from '../contexts/BotContext';

const Admin = ({ activeTab = 'rpc' }) => {
  const { api, loading, error, config: currentConfig } = useBot();
  const [chains, setChains] = useState([]);
  const [rpcEndpoints, setRpcEndpoints] = useState({});
  const [openChainDialog, setOpenChainDialog] = useState(false);
  const [openRpcDialog, setOpenRpcDialog] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState({});
  const [rpcFormData, setRpcFormData] = useState({
    chain: '',
    endpoint: '',
    apiKey: '',
    name: ''
  });
  const [chainFormData, setChainFormData] = useState({
    name: '',
    chainId: '',
    currency: '',
    explorer: '',
    enabled: true
  });
  const [users, setUsers] = useState([]);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [rpcMenuAnchor, setRpcMenuAnchor] = useState(null);
  const [selectedRpcChain, setSelectedRpcChain] = useState(null);

  useEffect(() => {
    setAnimate(true);
  }, []);

  const loadAdminData = useCallback(async () => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (!token || !user) {
        console.log('User not authenticated, skipping admin data load');
        return;
      }
      
      // Load RPC endpoints and chains from config
      const config = await api.getConfig();
      if (config.success) {
        setChains(config.config.chains || []);
        
        // Fetch real RPC endpoints from the API
        const headers = { Authorization: `Bearer ${token}` };
        
        const chainsResponse = await fetch('http://localhost:3002/api/chains', { headers });
        if (chainsResponse.ok) {
          const chainsData = await chainsResponse.json();
          
          // Create RPC endpoints data from the real chains config
          const rpcData = {};
          Object.entries(chainsData.chains).forEach(([chainName, chainConfig]) => {
            if (chainConfig.rpc && chainConfig.rpc.length > 0) {
              rpcData[chainName] = {
                endpoints: chainConfig.rpc, // Store the entire array
                name: chainConfig.name || chainName,
                chainId: chainConfig.chainId?.toString() || '1'
              };
            }
          });
          
          setRpcEndpoints(rpcData);
        } else {
          console.error('Failed to load chains data');
        }
        
        // Load users for general admin view
        if (activeTab !== 'rpc' && activeTab !== 'chains') {
          loadUsers();
        }
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    }
  }, [api, activeTab]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Load users when component mounts (only for general admin view)
  useEffect(() => {
    if (activeTab !== 'rpc' && activeTab !== 'chains') {
      loadUsers();
    }
  }, [activeTab]);

  const handleAddRpc = async () => {
    try {
      // Add RPC endpoint logic
      setOpenRpcDialog(false);
      setRpcFormData({ chain: '', endpoint: '', apiKey: '', name: '' });
      await loadAdminData();
    } catch (error) {
      console.error('Failed to add RPC endpoint:', error);
    }
  };

  const handleAddChain = async () => {
    try {
      // Add chain logic
      setOpenChainDialog(false);
      setChainFormData({ name: '', chainId: '', currency: '', explorer: '', enabled: true });
      await loadAdminData();
    } catch (error) {
      console.error('Failed to add chain:', error);
    }
  };

  const handleDeleteRpc = async (chain) => {
    if (window.confirm(`Are you sure you want to delete the RPC endpoint for ${chain}?`)) {
      try {
        // Delete RPC endpoint logic
        await loadAdminData();
      } catch (error) {
        console.error('Failed to delete RPC endpoint:', error);
      }
    }
  };

  const handleDeleteChain = async (chainName) => {
    if (window.confirm(`Are you sure you want to delete the chain ${chainName}?`)) {
      try {
        // Delete chain logic
        await loadAdminData();
      } catch (error) {
      console.error('Failed to delete chain:', error);
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getChainColor = (chain) => {
    const colors = {
      ethereum: '#627EEA',
      bsc: '#F3BA2F',
      polygon: '#8247E5',
      arbitrum: '#28A0F0',
      default: '#007AFF'
    };
    return colors[chain.toLowerCase()] || colors.default;
  };

  const getChainIcon = (chain) => {
    const icons = {
      ethereum: <BoltIcon />,
      bsc: <NetworkIcon />,
      polygon: <NetworkIcon />,
      arbitrum: <NetworkIcon />,
      default: <NetworkIcon />
    };
    return icons[chain.toLowerCase()] || icons.default;
  };

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await fetch('http://localhost:3002/api/auth/users', { headers });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        console.error('Failed to load users');
      }
    } catch (error) {
      console.error('Network error:', error);
    }
  };

  const handleCreateUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      } : { 'Content-Type': 'application/json' };
      
      const response = await fetch('http://localhost:3002/api/auth/users', {
        method: 'POST',
        headers,
        body: JSON.stringify(userForm)
      });

      const data = await response.json();

      if (data.success) {
        console.log('User created successfully');
        setOpenUserDialog(false);
        setUserForm({ username: '', email: '', password: '', role: 'user' });
        loadUsers();
      } else {
        console.error(data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Network error:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await fetch(`http://localhost:3002/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers
      });

      const data = await response.json();

      if (data.success) {
        console.log('User deleted successfully');
        loadUsers();
      } else {
        console.error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Network error:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleColor = (role) => {
    return role === 'admin' ? 'error' : 'primary';
  };

  const handleRpcMenuOpen = (event, chain) => {
    setRpcMenuAnchor(event.currentTarget);
    setSelectedRpcChain(chain);
  };

  const handleRpcMenuClose = () => {
    setRpcMenuAnchor(null);
    setSelectedRpcChain(null);
  };

  const handleCopyRpc = (rpc) => {
    copyToClipboard(rpc);
    handleRpcMenuClose();
  };

  const renderRpcContent = () => (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>RPC Management</Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage RPC endpoints for connected chains
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenRpcDialog(true)}
        >
          Add RPC Endpoint
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Zoom in={!!error}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        </Zoom>
      )}

      {!loading && !error && (
        <Box>
          {Object.entries(rpcEndpoints).map(([chain, endpoint], index) => (
            <Accordion key={chain} sx={{ 
              mb: 1.5,
              '&:before': { display: 'none' },
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              '&.Mui-expanded': {
                margin: 'auto',
                marginBottom: 1.5,
              }
            }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Avatar sx={{ bgcolor: getChainColor(chain), mr: 2 }}>
                    {getChainIcon(chain)}
                  </Avatar>
                  <Typography sx={{ flexGrow: 1, fontWeight: 500 }}>
                    {endpoint.name}
                  </Typography>
                  <Chip label={`${endpoint.endpoints.length} RPCs`} size="small" sx={{ mr: 2 }} />
                  <Chip label={`Chain ID: ${endpoint.chainId}`} size="small" variant="outlined" />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ backgroundColor: 'rgba(0,0,0,0.02)', pt: 2, pb: 2 }}>
                <List dense>
                  {endpoint.endpoints.map((rpc, rpcIndex) => (
                    <ListItem
                      key={rpcIndex}
                      secondaryAction={
                        <IconButton edge="end" onClick={() => copyToClipboard(rpc)}>
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={rpc}
                        primaryTypographyProps={{ sx: { fontFamily: 'monospace', fontSize: '0.875rem' } }}
                      />
                    </ListItem>
                  ))}
                </List>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setOpenRpcDialog(true)}>
                    Add RPC
                  </Button>
                  <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleDeleteChain(chain)}>
                    Delete Chain
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );

  const renderChainsContent = () => (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>Chain Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage blockchain networks
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenChainDialog(true)}
        >
          Add Chain
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Zoom in={!!error}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        </Zoom>
      )}

      {!loading && !error && (
        <Box>
          {chains.map((chain) => (
            <Paper key={chain} sx={{ 
              p: 2, 
              mb: 2, 
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: 2,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ 
                    bgcolor: getChainColor(chain),
                    mr: 2,
                    width: 32,
                    height: 32,
                  }}>
                    {getChainIcon(chain)}
                  </Avatar>
                  <Typography variant="body1" fontWeight={600}>
                    {chain}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    label="Active"
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteChain(chain)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Fade in={animate} timeout={800}>
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Typography variant="h3" sx={{ 
            fontWeight: 700, 
            background: 'linear-gradient(135deg, #FF3B30 0%, #FF6B6B 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1,
            fontSize: { xs: '1.75rem', md: '2.5rem' }
          }}>
            {activeTab === 'rpc' ? 'RPC Management' : 
             activeTab === 'chains' ? 'Chain Management' : 
             'System Administration'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, fontSize: { xs: '0.875rem', md: '1rem' } }}>
            {activeTab === 'rpc' ? 'Manage blockchain RPC connections and endpoints' :
             activeTab === 'chains' ? 'Configure supported blockchain networks' :
             'Manage RPC endpoints, chains, and system configuration'}
          </Typography>

          {/* Stats Bar */}
          <Paper sx={{ 
            p: { xs: 1.5, md: 2 }, 
            background: 'rgba(255, 255, 255, 0.8)', 
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 3 } }}>
              {activeTab === 'rpc' && (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
                    {Object.keys(rpcEndpoints).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                    RPC Endpoints
                  </Typography>
                </Box>
              )}
              {activeTab === 'chains' && (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
                    {chains.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                    Active Chains
                  </Typography>
                </Box>
              )}
              {activeTab !== 'rpc' && activeTab !== 'chains' && (
                <>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary.main" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
                      {chains.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                      Active Chains
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
                      {Object.keys(rpcEndpoints).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                      RPC Endpoints
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
                      {currentConfig?.enableWebSocket ? 'ON' : 'OFF'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                      WebSocket
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {activeTab === 'chains' && (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenChainDialog(true)}
                  sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                >
                  Add Chain
                </Button>
              )}
              {activeTab === 'rpc' && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenRpcDialog(true)}
                  sx={{
                    background: 'linear-gradient(135deg, #FF3B30 0%, #FF6B6B 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #FF6B6B 0%, #FF3B30 100%)',
                    },
                    fontSize: { xs: '0.75rem', md: '0.875rem' }
                  }}
                >
                  Add RPC
                </Button>
              )}
              {activeTab !== 'rpc' && activeTab !== 'chains' && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenChainDialog(true)}
                    sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                  >
                    Add Chain
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenRpcDialog(true)}
                    sx={{
                      background: 'linear-gradient(135deg, #FF3B30 0%, #FF6B6B 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #FF6B6B 0%, #FF3B30 100%)',
                      },
                      fontSize: { xs: '0.75rem', md: '0.875rem' }
                    }}
                  >
                    Add RPC
                  </Button>
                </>
              )}
            </Box>
          </Paper>
        </Box>
      </Fade>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error Display */}
      {error && (
        <Zoom in={!!error}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        </Zoom>
      )}

      {/* Admin Sections */}
      <Grid container spacing={3}>
        {/* RPC Endpoints Management */}
        {(activeTab === 'rpc' || activeTab !== 'chains') && (
          <Grid item xs={12} lg={activeTab === 'rpc' ? 12 : 6}>
            <Slide direction="up" in={animate} timeout={1000}>
              <Card sx={{ 
                height: '100%',
                position: 'relative',
                overflow: 'visible',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                },
              }}>
                <CardContent>
                  {renderRpcContent()}
                </CardContent>
              </Card>
            </Slide>
          </Grid>
        )}

        {/* Chains Management */}
        {(activeTab === 'chains' || activeTab !== 'rpc') && (
          <Grid item xs={12} lg={activeTab === 'chains' ? 12 : 6}>
            <Slide direction="up" in={animate} timeout={1200}>
              <Card sx={{ 
                height: '100%',
                position: 'relative',
                overflow: 'visible',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                },
              }}>
                <CardContent>
                  {renderChainsContent()}
                </CardContent>
              </Card>
            </Slide>
          </Grid>
        )}

        {/* System Status - Only show when not in specific tab mode */}
        {activeTab !== 'rpc' && activeTab !== 'chains' && (
          <Grid item xs={12}>
            <Grow in={animate} timeout={1400}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ 
                      bgcolor: '#5856D6',
                      mr: 2,
                      width: 48,
                      height: 48,
                    }}>
                      <AdminIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        System Status
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Monitor system health and performance
                      </Typography>
                    </Box>
                  </Box>

                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(0, 122, 255, 0.05)', borderRadius: 2 }}>
                        <Typography variant="h6" color="primary.main" fontWeight={600}>
                          {currentConfig?.enableWebSocket ? 'ON' : 'OFF'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          WebSocket Status
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(52, 199, 89, 0.05)', borderRadius: 2 }}>
                        <Typography variant="h6" color="success.main" fontWeight={600}>
                          {currentConfig?.enableMempoolMonitoring ? 'ON' : 'OFF'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Mempool Monitoring
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(255, 149, 0, 0.05)', borderRadius: 2 }}>
                        <Typography variant="h6" color="warning.main" fontWeight={600}>
                          {currentConfig?.enableLogging ? 'ON' : 'OFF'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Logging
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(88, 86, 214, 0.05)', borderRadius: 2 }}>
                        <Typography variant="h6" color="secondary.main" fontWeight={600}>
                          {currentConfig?.enableMetrics ? 'ON' : 'OFF'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Metrics Collection
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grow>
          </Grid>
        )}
      </Grid>

      {/* User Management - Only show when not in specific tab mode */}
      {activeTab !== 'rpc' && activeTab !== 'chains' && (
        <Card
          sx={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            mt: 3,
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>
                User Management
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadUsers}
                  sx={{ borderRadius: 2 }}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenUserDialog(true)}
                  sx={{
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #0056CC 0%, #4A47B8 100%)',
                    },
                  }}
                >
                  Add User
                </Button>
              </Box>
            </Box>

            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                            <PersonIcon />
                          </Avatar>
                          <Typography variant="body2" fontWeight={500}>
                            {user.username}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {user.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.role}
                          color={getRoleColor(user.role)}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(user.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={user.role === 'admin'}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Add RPC Dialog */}
      <Dialog 
        open={openRpcDialog} 
        onClose={() => setOpenRpcDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1,
          background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700,
        }}>
          Add RPC Endpoint
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Chain</InputLabel>
                <Select
                  value={rpcFormData.chain}
                  onChange={(e) => setRpcFormData({ ...rpcFormData, chain: e.target.value })}
                  label="Chain"
                >
                  {chains.map((chain) => (
                    <MenuItem key={chain} value={chain}>
                      {chain}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Endpoint URL"
                value={rpcFormData.endpoint}
                onChange={(e) => setRpcFormData({ ...rpcFormData, endpoint: e.target.value })}
                placeholder="https://mainnet.infura.io/v3/YOUR_PROJECT_ID"
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="API Key (Optional)"
                value={rpcFormData.apiKey}
                onChange={(e) => setRpcFormData({ ...rpcFormData, apiKey: e.target.value })}
                placeholder="Your API key"
                type={showApiKeys[rpcFormData.chain] ? 'text' : 'password'}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowApiKeys(prev => ({ ...prev, [rpcFormData.chain]: !prev[rpcFormData.chain] }))}
                    >
                      {showApiKeys[rpcFormData.chain] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  ),
                }}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name (Optional)"
                value={rpcFormData.name}
                onChange={(e) => setRpcFormData({ ...rpcFormData, name: e.target.value })}
                placeholder="My Ethereum RPC"
                sx={{ mb: 2 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setOpenRpcDialog(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleAddRpc} 
            variant="contained"
            disabled={!rpcFormData.chain || !rpcFormData.endpoint}
            sx={{
              background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5856D6 0%, #007AFF 100%)',
              },
            }}
          >
            Add RPC Endpoint
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Chain Dialog */}
      <Dialog 
        open={openChainDialog} 
        onClose={() => setOpenChainDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1,
          background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700,
        }}>
          Add Blockchain Network
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Chain Name"
                value={chainFormData.name}
                onChange={(e) => setChainFormData({ ...chainFormData, name: e.target.value })}
                placeholder="Ethereum"
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Chain ID"
                value={chainFormData.chainId}
                onChange={(e) => setChainFormData({ ...chainFormData, chainId: e.target.value })}
                placeholder="1"
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Native Currency"
                value={chainFormData.currency}
                onChange={(e) => setChainFormData({ ...chainFormData, currency: e.target.value })}
                placeholder="ETH"
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Block Explorer"
                value={chainFormData.explorer}
                onChange={(e) => setChainFormData({ ...chainFormData, explorer: e.target.value })}
                placeholder="https://etherscan.io"
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={chainFormData.enabled}
                    onChange={(e) => setChainFormData({ ...chainFormData, enabled: e.target.checked })}
                    color="primary"
                  />
                }
                label="Enable Chain"
                sx={{ mb: 2 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setOpenChainDialog(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleAddChain} 
            variant="contained"
            disabled={!chainFormData.name || !chainFormData.chainId}
            sx={{
              background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #30D158 0%, #28A745 100%)',
              },
            }}
          >
            Add Chain
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Username"
            value={userForm.username}
            onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={userForm.email}
            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={userForm.password}
            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
            margin="normal"
            required
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              label="Role"
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUserDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0056CC 0%, #4A47B8 100%)',
              },
            }}
          >
            Create User
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Admin; 