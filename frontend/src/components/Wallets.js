import React, { useState, useEffect } from 'react';
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
  Avatar,
  Paper,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  AccountBalanceWallet as WalletIcon,
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useBot } from '../contexts/BotContext';

const Wallets = () => {
  const { wallets, loading, error, api, chains: availableChains } = useBot();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingWallet, setEditingWallet] = useState(null);
  const [showPrivateKey, setShowPrivateKey] = useState({});
  const [animate, setAnimate] = useState(false);
  const [formData, setFormData] = useState({
    privateKey: '',
    name: '',
    chains: ['ethereum'],
    baseTokenRecipient: ''
  });

  useEffect(() => {
    setAnimate(true);
  }, []);

  const handleOpenDialog = (wallet = null) => {
    if (wallet) {
      // Parse chains from JSON string if needed
      const chains = typeof wallet.chains === 'string' ? JSON.parse(wallet.chains) : (wallet.chains || []);
      
      setEditingWallet(wallet);
      setFormData({
        privateKey: wallet.privateKey,
        name: wallet.name || '',
        chains: chains,
        baseTokenRecipient: wallet.baseTokenRecipient || ''
      });
    } else {
      setEditingWallet(null);
      setFormData({
        privateKey: '',
        name: '',
        chains: ['ethereum'],
        baseTokenRecipient: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingWallet(null);
    setFormData({
      privateKey: '',
      name: '',
      chains: ['ethereum'],
      baseTokenRecipient: ''
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingWallet) {
        await api.updateWallet(editingWallet.privateKey, formData);
      } else {
        await api.addWallet(formData);
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save wallet:', error);
    }
  };

  const handleToggleWallet = async (privateKey) => {
    try {
      await api.toggleWallet(privateKey);
    } catch (error) {
      console.error('Failed to toggle wallet:', error);
    }
  };

  const handleDeleteWallet = async (privateKey) => {
    if (window.confirm('Are you sure you want to delete this wallet?')) {
      try {
        await api.removeWallet(privateKey);
      } catch (error) {
        console.error('Failed to delete wallet:', error);
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getWalletStatusColor = (wallet) => {
    if (wallet.isPaused) return '#FF9500';
    return '#34C759';
  };

  const getWalletStatusIcon = (wallet) => {
    if (wallet.isPaused) return <PauseIcon />;
    return <PlayIcon />;
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const renderWalletCard = (wallet, index) => {
    // Parse chains from JSON string if needed
    const chains = typeof wallet.chains === 'string' ? JSON.parse(wallet.chains) : (wallet.chains || []);
    // Parse tokens from JSON string if needed
    const tokens = typeof wallet.tokens === 'string' ? JSON.parse(wallet.tokens) : (wallet.tokens || []);
    
    return (
      <Slide direction="up" in={animate} timeout={800 + index * 100}>
        <Card sx={{ 
          mb: 2,
          position: 'relative',
          overflow: 'visible',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          },
        }}>
          <CardContent>
            {/* Wallet Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ 
                bgcolor: getWalletStatusColor(wallet),
                mr: 2,
                width: 48,
                height: 48,
              }}>
                <WalletIcon />
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {wallet.name || 'Unnamed Wallet'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                  {formatAddress(wallet.address)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  icon={getWalletStatusIcon(wallet)}
                  label={wallet.isPaused ? 'Paused' : 'Active'}
                  size="small"
                  sx={{
                    backgroundColor: getWalletStatusColor(wallet),
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
                <IconButton
                  size="small"
                  onClick={() => setShowPrivateKey(prev => ({ ...prev, [wallet.privateKey]: !prev[wallet.privateKey] }))}
                >
                  {showPrivateKey[wallet.privateKey] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </Box>
            </Box>

            {/* Private Key */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Private Key
              </Typography>
              <Paper sx={{ 
                p: 1.5, 
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                position: 'relative',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                wordBreak: 'break-all'
              }}>
                <Typography variant="body2">
                  {showPrivateKey[wallet.privateKey] 
                    ? wallet.privateKey 
                    : `${wallet.privateKey.slice(0, 10)}...${wallet.privateKey.slice(-10)}`
                  }
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => copyToClipboard(wallet.privateKey)}
                  sx={{ 
                    position: 'absolute', 
                    top: 4, 
                    right: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' }
                  }}
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Paper>
            </Box>

            {/* Wallet Details Accordion */}
            <Accordion sx={{ mb: 2, backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2" fontWeight={600}>
                  Wallet Details
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {/* Supported Chains */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Supported Chains
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {chains.map((chain) => (
                        <Chip
                          key={chain}
                          label={chain}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>
                  </Grid>

                  {/* Native Token Recipient */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Native Token Recipient
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {wallet.baseTokenRecipient 
                        ? formatAddress(wallet.baseTokenRecipient)
                        : 'Not set'
                      }
                    </Typography>
                  </Grid>

                  {/* Token Count */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Monitored Tokens
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {tokens.length} tokens
                    </Typography>
                  </Grid>

                  {/* Status */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Status
                    </Typography>
                    <Chip
                      label={wallet.isPaused ? 'Paused' : 'Active'}
                      size="small"
                      color={wallet.isPaused ? 'warning' : 'success'}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={wallet.isPaused ? <PlayIcon /> : <PauseIcon />}
                onClick={() => handleToggleWallet(wallet.privateKey)}
                sx={{ flex: 1 }}
              >
                {wallet.isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={() => handleOpenDialog(wallet)}
                sx={{ flex: 1 }}
              >
                Edit
              </Button>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDeleteWallet(wallet.privateKey)}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </CardContent>
        </Card>
      </Slide>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Fade in={animate} timeout={800}>
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Typography variant="h3" sx={{ 
            fontWeight: 700, 
            background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1,
            fontSize: { xs: '1.75rem', md: '2.5rem' }
          }}>
            Wallet Management
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, fontSize: { xs: '0.875rem', md: '1rem' } }}>
            Manage your connected wallets and monitor their token transfers
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
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary.main" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
                  {wallets.length}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                  Total Wallets
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
                  {wallets.filter(w => !w.isPaused).length}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                  Active Wallets
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
                  {wallets.filter(w => w.isPaused).length}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                  Paused Wallets
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{
                background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #30D158 0%, #28A745 100%)',
                },
                fontSize: { xs: '0.75rem', md: '0.875rem' }
              }}
            >
              Add Wallet
            </Button>
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

      {/* Wallets List */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          {wallets.length === 0 ? (
            <Grow in={animate} timeout={1000}>
              <Card sx={{ 
                textAlign: 'center', 
                py: 8,
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(20px)',
              }}>
                <WalletIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  No Wallets Added
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Add your first wallet to start monitoring token transfers
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                  sx={{
                    background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #30D158 0%, #28A745 100%)',
                    },
                  }}
                >
                  Add Your First Wallet
                </Button>
              </Card>
            </Grow>
          ) : (
            <Box>
              {wallets.map((wallet, index) => renderWalletCard(wallet, index))}
            </Box>
          )}
        </Grid>
      </Grid>

      {/* Add/Edit Wallet Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
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
          {editingWallet ? 'Edit Wallet' : 'Add New Wallet'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Private Key"
                value={formData.privateKey}
                onChange={(e) => setFormData({ ...formData, privateKey: e.target.value })}
                placeholder="Enter wallet private key"
                multiline
                rows={3}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Wallet Name (Optional)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Give your wallet a name"
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Supported Chains</InputLabel>
                <Select
                  multiple
                  value={formData.chains}
                  onChange={(e) => setFormData({ ...formData, chains: e.target.value })}
                  label="Supported Chains"
                >
                  {Object.keys(availableChains).map((chain) => (
                    <MenuItem key={chain} value={chain}>
                      {availableChains[chain].name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Native Token Recipient (Optional)"
                value={formData.baseTokenRecipient}
                onChange={(e) => setFormData({ ...formData, baseTokenRecipient: e.target.value })}
                placeholder="Address to receive native tokens"
                sx={{ mb: 2 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleCloseDialog} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={!formData.privateKey}
            sx={{
              background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #30D158 0%, #28A745 100%)',
              },
            }}
          >
            {editingWallet ? 'Update Wallet' : 'Add Wallet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Wallets;