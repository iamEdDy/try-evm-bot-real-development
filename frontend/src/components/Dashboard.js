import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  IconButton,
  Fade,
  Slide,
  Grow,
  Zoom,
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Button,
  Alert,
  Fab,
  LinearProgress,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AccountBalanceWallet as WalletIcon,
  Token as TokenIcon,
  Settings as SettingsIcon,
  AdminPanelSettings as AdminIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Bolt as BoltIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  NetworkCheck as NetworkIcon,
  Storage as StorageIcon,
  Notifications as NotificationsIcon,
  Refresh as RefreshIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useBot } from '../contexts/BotContext';
import Wallets from './Wallets';
import Configuration from './Configuration';
import Tokens from './Tokens';
import Profile from './Profile';
import AdminDashboard from './AdminDashboard';
import Admin from './Admin';

const Dashboard = ({ onLogout }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { botStatus, metrics, loading, error, api } = useBot();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [animate, setAnimate] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setAnimate(true);
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, color: '#007AFF' },
    ...(currentUser.role !== 'admin' ? [
      { id: 'wallets', label: 'Wallets', icon: <WalletIcon />, color: '#34C759' },
      { id: 'tokens', label: 'Tokens', icon: <TokenIcon />, color: '#FF9500' },
      { id: 'configuration', label: 'Settings', icon: <SettingsIcon />, color: '#5856D6' },
    ] : []),
    { id: 'profile', label: 'Profile', icon: <PersonIcon />, color: '#AF52DE' },
    ...(currentUser.role === 'admin' ? [
      { id: 'admin', label: 'User Management', icon: <AdminIcon />, color: '#FF3B30' },
      { id: 'rpc', label: 'RPC Management', icon: <NetworkIcon />, color: '#FF6B35' },
      { id: 'chains', label: 'Chain Management', icon: <BoltIcon />, color: '#FFD700' },
    ] : []),
  ];

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'connected': return '#34C759';
      case 'connecting': return '#FF9500';
      case 'disconnected': return '#FF3B30';
      default: return '#86868B';
    }
  }, []);

  const getStatusIcon = useCallback((status) => {
    switch (status) {
      case 'connected': return <CheckCircleIcon />;
      case 'connecting': return <CircularProgress size={16} />;
      case 'disconnected': return <ErrorIcon />;
      default: return <WarningIcon />;
    }
  }, []);

  // Memoize metrics calculations
  const memoizedMetrics = useMemo(() => ({
    totalTransactions: metrics.totalTransactions,
    successfulTransactions: metrics.successfulTransactions,
    failedTransactions: metrics.failedTransactions,
    totalWallets: metrics.totalWallets,
    totalTokens: metrics.totalTokens,
    chains: metrics.chains ? Object.keys(metrics.chains) : [],
    lastUpdate: metrics.lastUpdate,
    successRate: metrics.totalTransactions > 0 
      ? ((metrics.successfulTransactions / metrics.totalTransactions) * 100).toFixed(1)
      : '0.0'
  }), [metrics]);

  const renderDashboard = () => (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Fade in={animate} timeout={800}>
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Typography variant="h3" sx={{ 
            fontWeight: 700, 
            background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1,
            fontSize: { xs: '1.75rem', md: '2.5rem' }
          }}>
            {currentUser.role === 'admin' ? 'Admin Dashboard' : 'EVM Bot Dashboard'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, fontSize: { xs: '0.875rem', md: '1rem' } }}>
            {currentUser.role === 'admin' 
              ? 'System administration and user management'
              : 'Real-time monitoring and control for your multi-chain token transfer bot'
            }
          </Typography>
          
          {/* Status Bar */}
          <Paper sx={{ 
            p: { xs: 1.5, md: 2 }, 
            background: 'rgba(255, 255, 255, 0.8)', 
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap'
          }}>
            <Chip
              icon={getStatusIcon(botStatus)}
              label={`Bot ${botStatus}`}
              sx={{
                backgroundColor: getStatusColor(botStatus),
                color: 'white',
                fontWeight: 600,
                fontSize: { xs: '0.75rem', md: '0.875rem' }
              }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
              {currentUser.role === 'admin' 
                ? 'System monitoring and user management'
                : `${memoizedMetrics.totalWallets} wallets • ${memoizedMetrics.totalTokens} tokens • ${memoizedMetrics.totalTransactions} transactions`
              }
            </Typography>
          </Paper>
        </Box>
      </Fade>

      {/* Key Metrics */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 3, md: 4 } }}>
        <Grid item xs={12} sm={6} md={3}>
          <Slide direction="up" in={animate} timeout={1000}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #007AFF 0%, #4DA3FF 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              height: { xs: 120, md: 160 }
            }}>
              <Box sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
              }} />
              <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <BoltIcon sx={{ mr: 1, fontSize: { xs: 20, md: 24 } }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', md: '1rem' } }}>
                    {currentUser.role === 'admin' ? 'System Status' : 'Total Transactions'}
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, fontSize: { xs: '1.5rem', md: '2rem' } }}>
                  {currentUser.role === 'admin' ? 'Active' : memoizedMetrics.totalTransactions.toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                  {currentUser.role === 'admin' ? 'Bot running' : `${memoizedMetrics.successfulTransactions} successful`}
                </Typography>
              </CardContent>
            </Card>
          </Slide>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Slide direction="up" in={animate} timeout={1200}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #34C759 0%, #5CDB7B 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Box sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
              }} />
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckCircleIcon sx={{ mr: 1, fontSize: 24 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {currentUser.role === 'admin' ? 'Admin Access' : 'Success Rate'}
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, fontSize: { xs: '1.5rem', md: '2rem' } }}>
                  {currentUser.role === 'admin' ? 'Full' : `${memoizedMetrics.successRate}%`}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                  {currentUser.role === 'admin' ? 'User management' : `${memoizedMetrics.successfulTransactions} / ${memoizedMetrics.totalTransactions}`}
                </Typography>
              </CardContent>
            </Card>
          </Slide>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Slide direction="up" in={animate} timeout={1400}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #FF9500 0%, #FFB340 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Box sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
              }} />
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SpeedIcon sx={{ mr: 1, fontSize: 24 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {currentUser.role === 'admin' ? 'System Health' : 'Active Wallets'}
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {currentUser.role === 'admin' ? 'Good' : memoizedMetrics.totalWallets}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                  {currentUser.role === 'admin' ? 'All systems operational' : `Monitoring ${memoizedMetrics.totalTokens} tokens`}
                </Typography>
              </CardContent>
            </Card>
          </Slide>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Slide direction="up" in={animate} timeout={1600}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #5856D6 0%, #7B7AFF 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Box sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
              }} />
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <NetworkIcon sx={{ mr: 1, fontSize: 24 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {currentUser.role === 'admin' ? 'Quick Actions' : 'Chains Active'}
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, fontSize: { xs: '1.5rem', md: '2rem' } }}>
                  {currentUser.role === 'admin' ? 'Manage' : memoizedMetrics.chains.length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {currentUser.role === 'admin' ? 'Users & system' : 'Multi-chain support'}
                </Typography>
              </CardContent>
            </Card>
          </Slide>
        </Grid>
      </Grid>

      {/* Performance Charts - Only show for non-admin users */}
      {currentUser.role !== 'admin' && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Grow in={animate} timeout={1800}>
              <Card sx={{ height: 400 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <TimelineIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      Performance Overview
                    </Typography>
                  </Box>
                  
                  {/* Transaction Success Rate */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Transaction Success Rate
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {memoizedMetrics.successRate}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={memoizedMetrics.successRate ? parseFloat(memoizedMetrics.successRate) : 0}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'rgba(52, 199, 89, 0.2)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#34C759',
                        },
                      }}
                    />
                  </Box>

                  {/* Native Token Support */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Native Token Support
                      </Typography>
                      <Chip
                        label={metrics.nativeTokenSupport ? 'Enabled' : 'Disabled'}
                        size="small"
                        color={metrics.nativeTokenSupport ? 'success' : 'default'}
                      />
                    </Box>
                  </Box>

                  {/* Runtime Stats */}
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Runtime Statistics
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(0, 122, 255, 0.05)', borderRadius: 2 }}>
                          <Typography variant="h6" color="primary.main" fontWeight={600}>
                            {memoizedMetrics.totalTransactions}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Total Transactions
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(52, 199, 89, 0.05)', borderRadius: 2 }}>
                          <Typography variant="h6" color="success.main" fontWeight={600}>
                            {memoizedMetrics.successfulTransactions}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Successful
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(255, 59, 48, 0.05)', borderRadius: 2 }}>
                          <Typography variant="h6" color="error.main" fontWeight={600}>
                            {memoizedMetrics.failedTransactions}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Failed
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(88, 86, 214, 0.05)', borderRadius: 2 }}>
                          <Typography variant="h6" color="secondary.main" fontWeight={600}>
                            {memoizedMetrics.totalWallets}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Active Wallets
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </CardContent>
              </Card>
            </Grow>
          </Grid>
        </Grid>
      )}

      {/* System Status Card - Show for all users */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} lg={currentUser.role === 'admin' ? 12 : 4}>
          <Grow in={animate} timeout={2000}>
            <Card sx={{ height: 500 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <StorageIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    System Status
                  </Typography>
                </Box>

                {/* Bot Status */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Bot Status
                  </Typography>
                  <Chip
                    icon={getStatusIcon(botStatus)}
                    label={botStatus}
                    sx={{
                      backgroundColor: getStatusColor(botStatus),
                      color: 'white',
                      fontWeight: 600,
                      width: '100%',
                      justifyContent: 'flex-start',
                      height: 40,
                    }}
                  />
                </Box>

                {/* Last Update */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Last Update
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {memoizedMetrics.lastUpdate 
                      ? new Date(memoizedMetrics.lastUpdate).toLocaleTimeString()
                      : 'Never'}
                  </Typography>
                </Box>

                {/* Supported Chains */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Supported Chains
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {memoizedMetrics.chains.map((chain, index) => (
                      <Chip
                        key={chain}
                        label={chain}
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(0, 122, 255, 0.1)',
                          color: 'primary.main',
                          fontWeight: 500,
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Quick Actions */}
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Quick Actions
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<RefreshIcon />}
                      onClick={api.refreshData}
                      disabled={loading}
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      Refresh Data
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<NotificationsIcon />}
                      onClick={api.reloadConfig}
                      disabled={loading}
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      Reload Config
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grow>
        </Grid>
      </Grid>

      {/* Error Display */}
      {error && (
        <Zoom in={!!error}>
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        </Zoom>
      )}
    </Container>
  );

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return renderDashboard();
      case 'wallets':
        return <Wallets />;
      case 'tokens':
        return <Tokens />;
      case 'configuration':
        return <Configuration />;
      case 'admin':
        return <AdminDashboard />;
      case 'rpc':
        return <Admin activeTab="rpc" />;
      case 'chains':
        return <Admin activeTab="chains" />;
      case 'profile':
        return <Profile />;
      default:
        return renderDashboard();
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile App Bar */}
      {isMobile && (
        <AppBar position="fixed" sx={{ 
          background: 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: 'none'
        }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
              EVM Bot
            </Typography>
            <IconButton color="inherit">
              <NotificationsIcon />
            </IconButton>
            <IconButton
              color="inherit"
              onClick={handleUserMenuOpen}
              sx={{ ml: 1 }}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                <PersonIcon />
              </Avatar>
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: 280,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 280,
              boxSizing: 'border-box',
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(20px)',
              borderRight: '1px solid rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          <Toolbar sx={{ height: 80, display: 'flex', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <BoltIcon sx={{ mr: 1, color: 'primary.main', fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                EVM Bot
              </Typography>
            </Box>
          </Toolbar>
          <Divider />
          <List sx={{ pt: 2, flexGrow: 1 }}>
            {menuItems.map((item) => (
              <ListItem
                key={item.id}
                button
                selected={currentPage === item.id}
                onClick={() => setCurrentPage(item.id)}
                sx={{
                  mx: 1,
                  mb: 0.5,
                  borderRadius: 2,
                  '&.Mui-selected': {
                    backgroundColor: `${item.color}15`,
                    '&:hover': {
                      backgroundColor: `${item.color}25`,
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: currentPage === item.id ? item.color : 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label} 
                  sx={{ 
                    '& .MuiListItemText-primary': {
                      fontWeight: currentPage === item.id ? 600 : 400,
                      color: currentPage === item.id ? item.color : 'text.primary',
                    }
                  }}
                />
              </ListItem>
            ))}
          </List>
          
          {/* User Profile Section */}
          <Box sx={{ 
            p: 2, 
            borderTop: '1px solid rgba(0, 0, 0, 0.1)',
            background: 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(10px)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ 
                width: 40, 
                height: 40, 
                bgcolor: 'primary.main',
                mr: 2,
                background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)'
              }}>
                <PersonIcon />
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.2 }}>
                  {currentUser.username}
                </Typography>
                <Chip 
                  label={currentUser.role} 
                  size="small"
                  sx={{ 
                    bgcolor: currentUser.role === 'admin' ? '#FF3B30' : '#34C759',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    height: 20
                  }}
                />
              </Box>
            </Box>
            
            <Button
              variant="outlined"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              fullWidth
              size="small"
              sx={{
                borderRadius: 2,
                borderColor: 'rgba(0, 0, 0, 0.2)',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: '#FF3B30',
                  color: '#FF3B30',
                  backgroundColor: 'rgba(255, 59, 48, 0.05)',
                },
              }}
            >
              Logout
            </Button>
          </Box>
        </Drawer>
      )}

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
          },
        }}
      >
        <Toolbar sx={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BoltIcon sx={{ mr: 1, color: 'primary.main', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              EVM Bot
            </Typography>
          </Box>
          <IconButton onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
        <Divider />
        <List sx={{ pt: 2 }}>
          {menuItems.map((item) => (
            <ListItem
              key={item.id}
              button
              selected={currentPage === item.id}
              onClick={() => {
                setCurrentPage(item.id);
                setDrawerOpen(false);
              }}
              sx={{
                mx: 1,
                mb: 0.5,
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: `${item.color}15`,
                },
              }}
            >
              <ListItemIcon sx={{ color: currentPage === item.id ? item.color : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label} 
                sx={{ 
                  '& .MuiListItemText-primary': {
                    fontWeight: currentPage === item.id ? 600 : 400,
                    color: currentPage === item.id ? item.color : 'text.primary',
                  }
                }}
              />
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ 
        flexGrow: 1, 
        pt: isMobile ? 8 : 0,
        minHeight: '100vh',
        background: 'transparent',
        overflow: 'auto'
      }}>
        {renderPage()}
      </Box>

      {/* Floating Action Button for Mobile */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="menu"
          onClick={() => setDrawerOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
            zIndex: 1000,
          }}
        >
          <MenuIcon />
        </Fab>
      )}

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        PaperProps={{
          sx: {
            borderRadius: 2,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
          }
        }}
      >
        <MenuItem onClick={handleUserMenuClose}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ mr: 2, width: 32, height: 32, bgcolor: 'primary.main' }}>
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {currentUser.username}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {currentUser.role}
              </Typography>
            </Box>
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { handleLogout(); handleUserMenuClose(); }}>
          <LogoutIcon sx={{ mr: 2 }} />
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Dashboard; 