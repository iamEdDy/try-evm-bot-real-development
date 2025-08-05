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
  Paper,
  CircularProgress,
  Avatar,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Token as TokenIcon,
  ContentCopy as CopyIcon,
  Bolt as BoltIcon,
  Cloud as CloudIcon,
} from '@mui/icons-material';
import { useBot } from '../contexts/BotContext';

const Tokens = () => {
  const { wallets, loading, error, api, chains: availableChains, config } = useBot();
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);
  const [animate, setAnimate] = useState(false);
  const [tokenFormData, setTokenFormData] = useState({
    tokenAddress: '',
    recipientAddress: '',
    tokenName: '',
    chain: (availableChains && typeof availableChains === 'object' ? Object.keys(availableChains)[0] : 'ethereum') || 'ethereum',
    tokenType: 'erc20'
  });
  const [showPausedTokens, setShowPausedTokens] = useState(true);

  useEffect(() => {
    setAnimate(true);
  }, []);

  const tokenTypes = config.tokenStandards || ['erc20', 'erc721', 'erc1155'];

  // Get all tokens from all wallets with wallet status
  const allTokens = (Array.isArray(wallets) ? wallets : []).flatMap(wallet => {
    // Ensure wallet.tokens is an array
    const walletTokens = Array.isArray(wallet.tokens) ? wallet.tokens : [];
    
    return walletTokens.map(token => ({
      ...token,
      walletName: wallet.name || 'Unnamed Wallet',
      walletAddress: wallet.address,
      walletPrivateKey: wallet.privateKey,
      walletIsPaused: wallet.isPaused || false,
      walletStatus: wallet.status || 'unknown'
    }));
  });

  // Filter tokens by active/paused status
  const filteredTokens = showPausedTokens 
    ? allTokens 
    : allTokens.filter(token => !token.walletIsPaused);

  // Debug logging
  useEffect(() => {
    if (Array.isArray(wallets) && wallets.length > 0) {
      console.log('Wallets data:', wallets);
      console.log('All tokens:', allTokens);
      console.log('Active wallets:', wallets.filter(w => !w.isPaused && w.status === 'active').length);
      console.log('Paused wallets:', wallets.filter(w => w.isPaused).length);
    }
  }, [wallets, allTokens]);

  const handleAddToken = async () => {
    if (!selectedWallet) return;
    
    try {
      await api.addTokenToWallet(
        selectedWallet.privateKey,
        tokenFormData.tokenAddress,
        tokenFormData.recipientAddress,
        tokenFormData.tokenName,
        tokenFormData.chain,
        tokenFormData.tokenType
      );
      setOpenAddDialog(false);
      setSelectedWallet(null);
      setTokenFormData({
        tokenAddress: '',
        recipientAddress: '',
        tokenName: '',
        chain: (availableChains && typeof availableChains === 'object' ? Object.keys(availableChains)[0] : 'ethereum') || 'ethereum',
        tokenType: 'erc20'
      });
    } catch (error) {
      console.error('Failed to add token:', error);
    }
  };

  const handleEditToken = async () => {
    if (!selectedWallet || !selectedToken) return;
    
    try {
      // Remove the old token and add the updated one
      await api.removeTokenFromWallet(selectedWallet.privateKey, selectedToken.tokenAddress, selectedToken.chain);
      await api.addTokenToWallet(
        selectedWallet.privateKey,
        tokenFormData.tokenAddress,
        tokenFormData.recipientAddress,
        tokenFormData.tokenName,
        tokenFormData.chain,
        tokenFormData.tokenType
      );
      setOpenEditDialog(false);
      setSelectedWallet(null);
      setSelectedToken(null);
      setTokenFormData({
        tokenAddress: '',
        recipientAddress: '',
        tokenName: '',
        chain: (availableChains && typeof availableChains === 'object' ? Object.keys(availableChains)[0] : 'ethereum') || 'ethereum',
        tokenType: 'erc20'
      });
    } catch (error) {
      console.error('Failed to edit token:', error);
    }
  };

  const handleRemoveToken = async (walletPrivateKey, tokenAddress, chain) => {
    if (window.confirm('Are you sure you want to remove this token?')) {
      try {
        await api.removeTokenFromWallet(walletPrivateKey, tokenAddress, chain);
      } catch (error) {
        console.error('Failed to remove token:', error);
      }
    }
  };

  const openAddToken = () => {
    if (!Array.isArray(wallets) || wallets.length === 0) {
      alert('Please add a wallet first before adding tokens.');
      return;
    }
    setSelectedWallet(wallets[0]); // Default to first wallet
    setOpenAddDialog(true);
  };

  const openEditToken = (token) => {
    if (!Array.isArray(wallets)) return;
    
    const wallet = wallets.find(w => w.privateKey === token.walletPrivateKey);
    if (!wallet) return;
    
    setSelectedWallet(wallet);
    setSelectedToken(token);
    setTokenFormData({
      tokenAddress: token.tokenAddress,
      recipientAddress: token.recipientAddress,
      tokenName: token.name || '',
      chain: token.chain,
      tokenType: token.tokenType
    });
    setOpenEditDialog(true);
  };

  const getTokenTypeColor = (type) => {
    const colors = {
      erc20: '#007AFF',
      erc721: '#34C759',
      erc1155: '#FF9500',
      default: '#5856D6'
    };
    return colors[type.toLowerCase()] || colors.default;
  };

  const getTokenTypeIcon = (type) => {
    const icons = {
      erc20: <TokenIcon />,
      erc721: <BoltIcon />,
      erc1155: <CloudIcon />,
      default: <TokenIcon />
    };
    return icons[type.toLowerCase()] || icons.default;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Fade in={animate} timeout={800}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" sx={{ 
                fontWeight: 700,
                background: 'linear-gradient(135deg, #FF9500 0%, #FFB340 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1
              }}>
                Token Management
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage tokens across all wallets
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showPausedTokens}
                    onChange={(e) => setShowPausedTokens(e.target.checked)}
                    color="warning"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2">Show Paused</Typography>
                    <Chip 
                      label={allTokens.filter(t => t.walletIsPaused).length} 
                      size="small" 
                      color="warning"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>
                }
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openAddToken}
                sx={{
                  background: 'linear-gradient(135deg, #FF9500 0%, #FFB340 100%)',
                  color: 'white',
                  fontWeight: 600,
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(255, 149, 0, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #FF8A00 0%, #FFA800 100%)',
                    boxShadow: '0 6px 16px rgba(255, 149, 0, 0.4)',
                  }
                }}
              >
                Add Token
              </Button>
            </Box>
          </Box>
        </Box>
      </Fade>

      {/* Token Summary */}
      <Fade in={animate} timeout={1000}>
        <Paper sx={{ 
          p: { xs: 1.5, md: 2 }, 
          mb: 3,
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
                {allTokens.length}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                Total Tokens
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
                {allTokens.filter(t => !t.walletIsPaused).length}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                Active Tokens
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
                {allTokens.filter(t => t.walletIsPaused).length}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                Paused Tokens
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
                {new Set((Array.isArray(allTokens) ? allTokens : []).map(t => t.chain)).size}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                Chains Supported
              </Typography>
            </Box>
          </Box>
        </Paper>
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

      {/* Tokens List */}
      <Grid container spacing={3}>
        {allTokens.length === 0 ? (
          <Grid item xs={12}>
            <Grow in={animate} timeout={1000}>
              <Card sx={{ 
                textAlign: 'center', 
                py: 8,
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(20px)',
              }}>
                <TokenIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  No Tokens Added
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {(!Array.isArray(wallets) || wallets.length === 0)
                    ? 'Add a wallet first, then add tokens to start monitoring'
                    : 'Add tokens to your wallets to start monitoring transfers'
                  }
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openAddToken}
                  disabled={!Array.isArray(wallets) || wallets.length === 0}
                  sx={{
                    background: 'linear-gradient(135deg, #FF9500 0%, #FFB340 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #FFB340 0%, #FF9500 100%)',
                    },
                  }}
                >
                  {(!Array.isArray(wallets) || wallets.length === 0) ? 'Add Wallet First' : 'Add Your First Token'}
                </Button>
              </Card>
            </Grow>
          </Grid>
        ) : (
          filteredTokens.map((token, index) => (
            <Grid item xs={12} md={6} xl={4} key={`${token.walletPrivateKey}-${token.tokenAddress}-${token.chain}`}>
              <Slide direction="up" in={animate} timeout={800 + index * 100}>
                <Card sx={{ 
                  height: '100%',
                  minHeight: 450,
                  position: 'relative',
                  overflow: 'visible',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                  },
                }}>
                  <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: { xs: 2, md: 3 } }}>
                    {/* Token Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ 
                        bgcolor: getTokenTypeColor(token.tokenType),
                        mr: 2,
                        width: 48,
                        height: 48
                      }}>
                        {getTokenTypeIcon(token.tokenType)}
                      </Avatar>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, wordBreak: 'break-word' }}>
                          {token.name || 'Unnamed Token'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                            {token.walletName}
                          </Typography>
                          <Chip
                            label={token.walletIsPaused ? 'PAUSED' : 'ACTIVE'}
                            size="small"
                            color={token.walletIsPaused ? 'warning' : 'success'}
                            sx={{ 
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              height: 20
                            }}
                          />
                        </Box>
                      </Box>
                      <Chip
                        label={`${token.tokenType.toUpperCase()} on ${token.chain}`}
                        size="small"
                        sx={{
                          backgroundColor: getTokenTypeColor(token.tokenType),
                          color: 'white',
                          fontWeight: 600,
                          ml: 1,
                        }}
                      />
                    </Box>

                    {/* Token Address */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Token Address
                      </Typography>
                      <Paper sx={{ 
                        p: 1.5, 
                        bgcolor: 'rgba(0, 0, 0, 0.02)', 
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        wordBreak: 'break-all',
                      }}>
                        <Typography sx={{ 
                          fontFamily: 'monospace',
                          fontSize: { xs: '0.75rem', md: '0.875rem' },
                          flex: 1,
                          mr: 1
                        }}>
                          {token.tokenAddress}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => copyToClipboard(token.tokenAddress)}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Paper>
                    </Box>

                    {/* Recipient Address */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Recipient Address
                      </Typography>
                      <Paper sx={{ 
                        p: 1.5, 
                        bgcolor: 'rgba(0, 0, 0, 0.02)', 
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        wordBreak: 'break-all',
                      }}>
                        <Typography sx={{ 
                          fontFamily: 'monospace',
                          fontSize: { xs: '0.75rem', md: '0.875rem' },
                          flex: 1,
                          mr: 1
                        }}>
                          {token.recipientAddress}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => copyToClipboard(token.recipientAddress)}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Paper>
                    </Box>

                    {/* Transaction Statistics */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Transaction Statistics
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={4}>
                          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'rgba(0, 122, 255, 0.05)', borderRadius: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {token.transactions || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Total
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'rgba(52, 199, 89, 0.05)', borderRadius: 1 }}>
                            <Typography variant="body2" fontWeight={600} color="success.main">
                              {token.successfulTransactions || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Success
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'rgba(255, 59, 48, 0.05)', borderRadius: 1 }}>
                            <Typography variant="body2" fontWeight={600} color="error.main">
                              {token.failedTransactions || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Failed
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>

                    {/* Total Transferred */}
                    {token.totalTransferred && token.totalTransferred !== "0" && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Total Transferred
                        </Typography>
                        <Typography variant="body1" color="success.main" fontWeight={600}>
                          {token.totalTransferred}
                        </Typography>
                      </Box>
                    )}

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: 2 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => openEditToken(token)}
                        disabled={token.walletIsPaused}
                        sx={{ flex: 1 }}
                      >
                        Edit
                      </Button>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveToken(token.walletPrivateKey, token.tokenAddress, token.chain)}
                        disabled={token.walletIsPaused}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    {token.walletIsPaused && (
                      <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                        Wallet is paused - actions disabled
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Slide>
            </Grid>
          ))
        )}
      </Grid>

      {/* Add Token Dialog */}
      <Dialog 
        open={openAddDialog} 
        onClose={() => setOpenAddDialog(false)}
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
          background: 'linear-gradient(135deg, #FF9500 0%, #FFB340 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700,
        }}>
          Add Token to {selectedWallet?.name || 'Wallet'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Wallet</InputLabel>
                <Select
                  value={selectedWallet?.privateKey || ''}
                  onChange={(e) => {
                    const wallet = (Array.isArray(wallets) ? wallets : []).find(w => w.privateKey === e.target.value);
                    setSelectedWallet(wallet);
                    setTokenFormData({ ...tokenFormData, chain: (availableChains && typeof availableChains === 'object' ? Object.keys(availableChains)[0] : 'ethereum') || 'ethereum' });
                  }}
                >
                  {(Array.isArray(wallets) ? wallets : []).map((wallet) => (
                    <MenuItem key={wallet.privateKey} value={wallet.privateKey}>
                      {wallet.name || 'Unnamed Wallet'} ({wallet.address.slice(0, 8)}...)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Token Address"
                value={tokenFormData.tokenAddress}
                onChange={(e) => setTokenFormData({ ...tokenFormData, tokenAddress: e.target.value })}
                placeholder="0x..."
                sx={{ mb: 2 }}
                required
                helperText="Contract address of the token"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Recipient Address"
                value={tokenFormData.recipientAddress}
                onChange={(e) => setTokenFormData({ ...tokenFormData, recipientAddress: e.target.value })}
                placeholder="0x..."
                sx={{ mb: 2 }}
                required
                helperText="Address to receive the tokens"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Token Name (Optional)"
                value={tokenFormData.tokenName}
                onChange={(e) => setTokenFormData({ ...tokenFormData, tokenName: e.target.value })}
                placeholder="My Token"
                sx={{ mb: 2 }}
                helperText="Display name for the token"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Chain</InputLabel>
                <Select
                  value={tokenFormData.chain}
                  onChange={(e) => setTokenFormData({ ...tokenFormData, chain: e.target.value })}
                  label="Chain"
                >
                  {(availableChains && typeof availableChains === 'object' ? Object.keys(availableChains) : []).map((chain) => (
                    <MenuItem key={chain} value={chain}>
                      {availableChains[chain].name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Token Type</InputLabel>
                <Select
                  value={tokenFormData.tokenType}
                  onChange={(e) => setTokenFormData({ ...tokenFormData, tokenType: e.target.value })}
                  label="Token Type"
                >
                  {(Array.isArray(tokenTypes) ? tokenTypes : []).map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setOpenAddDialog(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleAddToken} 
            variant="contained"
            disabled={!tokenFormData.tokenAddress || !tokenFormData.recipientAddress}
            sx={{
              background: 'linear-gradient(135deg, #FF9500 0%, #FFB340 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #FFB340 0%, #FF9500 100%)',
              },
            }}
          >
            Add Token
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Token Dialog */}
      <Dialog 
        open={openEditDialog} 
        onClose={() => setOpenEditDialog(false)}
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
          background: 'linear-gradient(135deg, #FF9500 0%, #FFB340 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 700,
        }}>
          Edit Token in {selectedWallet?.name || 'Wallet'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Token Address"
                value={tokenFormData.tokenAddress}
                onChange={(e) => setTokenFormData({ ...tokenFormData, tokenAddress: e.target.value })}
                placeholder="0x..."
                sx={{ mb: 2 }}
                required
                helperText="Contract address of the token"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Recipient Address"
                value={tokenFormData.recipientAddress}
                onChange={(e) => setTokenFormData({ ...tokenFormData, recipientAddress: e.target.value })}
                placeholder="0x..."
                sx={{ mb: 2 }}
                required
                helperText="Address to receive the tokens"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Token Name (Optional)"
                value={tokenFormData.tokenName}
                onChange={(e) => setTokenFormData({ ...tokenFormData, tokenName: e.target.value })}
                placeholder="My Token"
                sx={{ mb: 2 }}
                helperText="Display name for the token"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Chain</InputLabel>
                <Select
                  value={tokenFormData.chain}
                  onChange={(e) => setTokenFormData({ ...tokenFormData, chain: e.target.value })}
                  label="Chain"
                >
                  {(availableChains && typeof availableChains === 'object' ? Object.keys(availableChains) : []).map((chain) => (
                    <MenuItem key={chain} value={chain}>
                      {availableChains[chain].name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Token Type</InputLabel>
                <Select
                  value={tokenFormData.tokenType}
                  onChange={(e) => setTokenFormData({ ...tokenFormData, tokenType: e.target.value })}
                  label="Token Type"
                >
                  {(Array.isArray(tokenTypes) ? tokenTypes : []).map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setOpenEditDialog(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleEditToken} 
            variant="contained"
            disabled={!tokenFormData.tokenAddress || !tokenFormData.recipientAddress}
            sx={{
              background: 'linear-gradient(135deg, #FF9500 0%, #FFB340 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #FFB340 0%, #FF9500 100%)',
              },
            }}
          >
            Update Token
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Tokens; 