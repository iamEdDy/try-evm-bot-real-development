import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  FormHelperText,
  CardHeader,
  Paper,
  CircularProgress,
  Container,
  Fade,
  Slide,
  Grow,
  Zoom,
  Avatar,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Speed as SpeedIcon,
  NetworkCheck as NetworkIcon,
  Storage as StorageIcon,
  Timeline as TimelineIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useBot } from '../contexts/BotContext';

const Configuration = () => {
  const { api, loading, error, config: currentConfig } = useBot();
  const [config, setConfig] = useState({
    checkInterval: 100,
    gasPriceMultiplier: 1.5,
    maxGasPrice: 100,
    minBalanceThreshold: 0.001,
    nativeTokenSupport: true,
    enableMempoolMonitoring: true,
    enableWebSocket: true,
    maxRetries: 3,
    retryDelay: 1000,
    enableLogging: true,
    logLevel: 'info',
    enableMetrics: true,
    metricsInterval: 5000
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const lastConfigRef = useRef(null);
  const editingTimeoutRef = useRef(null);

  // Memoize current config to prevent unnecessary re-renders
  const memoizedCurrentConfig = useMemo(() => currentConfig || {}, [currentConfig]);

  useEffect(() => {
    setAnimate(true);
  }, []);

  const loadConfig = useCallback(async () => {
    // Don't reload if user is actively editing
    if (isEditing) return;
    
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      console.log('User not authenticated, skipping config load');
      return;
    }
    
    try {
      const response = await api.getConfig();
      if (response.success) {
        const newConfig = response.config;
        
        // Only update if the config has actually changed
        if (JSON.stringify(newConfig) !== JSON.stringify(lastConfigRef.current)) {
          lastConfigRef.current = newConfig;
          
          // Merge with current config to ensure all fields are present
          const mergedConfig = {
            ...config,
            ...newConfig
          };
          setConfig(mergedConfig);
          setHasChanges(false);
        }
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  }, [api, config, isEditing]);

  useEffect(() => {
    // Only load config if user is authenticated
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      loadConfig();
    }
  }, [loadConfig]);

  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  const handleConfigChange = useCallback((key, value) => {
    // Clear any existing editing timeout
    if (editingTimeoutRef.current) {
      clearTimeout(editingTimeoutRef.current);
    }
    
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
    setIsEditing(true);
    
    // Set a longer timeout for editing state
    editingTimeoutRef.current = setTimeout(() => {
      setIsEditing(false);
    }, 10000); // 10 seconds of inactivity
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await api.updateConfig(config);
      setHasChanges(false);
      setSaveSuccess(true);
      setIsEditing(false);
      
      // Clear editing timeout
      if (editingTimeoutRef.current) {
        clearTimeout(editingTimeoutRef.current);
      }
      
      // Reload the configuration to show the updated values
      await loadConfig();
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  }, [api, config, loadConfig]);

  const handleReload = useCallback(async () => {
    try {
      setReloading(true);
      setIsEditing(false);
      
      // Clear editing timeout
      if (editingTimeoutRef.current) {
        clearTimeout(editingTimeoutRef.current);
      }
      
      await api.reloadConfig();
      await loadConfig();
    } catch (error) {
      console.error('Failed to reload configuration:', error);
    } finally {
      setReloading(false);
    }
  }, [api, loadConfig]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (editingTimeoutRef.current) {
        clearTimeout(editingTimeoutRef.current);
      }
    };
  }, []);

  const configSections = [
    {
      id: 'performance',
      title: 'Performance Settings',
      description: 'Configure bot performance and gas optimization',
      icon: <SpeedIcon />,
      color: '#007AFF',
      fields: [
        {
          key: 'checkInterval',
          label: 'Check Interval (ms)',
          type: 'number',
          helperText: 'How often to check wallet balances (in milliseconds)',
          placeholder: memoizedCurrentConfig?.checkInterval?.toString() || "100"
        },
        {
          key: 'gasPriceMultiplier',
          label: 'Gas Price Multiplier',
          type: 'number',
          helperText: 'Multiplier for gas price calculation',
          placeholder: memoizedCurrentConfig?.gasPriceMultiplier?.toString() || "1.5"
        },
        {
          key: 'maxGasPrice',
          label: 'Max Gas Price (Gwei)',
          type: 'number',
          helperText: 'Maximum gas price to pay for transactions',
          placeholder: memoizedCurrentConfig?.maxGasPrice?.toString() || "100"
        },
        {
          key: 'minBalanceThreshold',
          label: 'Min Balance Threshold',
          type: 'number',
          helperText: 'Minimum balance to keep in wallets',
          placeholder: memoizedCurrentConfig?.minBalanceThreshold?.toString() || "0.001"
        }
      ]
    },
    {
      id: 'network',
      title: 'Network Settings',
      description: 'Configure network and WebSocket connections',
      icon: <NetworkIcon />,
      color: '#34C759',
      fields: [
        {
          key: 'enableWebSocket',
          label: 'Enable WebSocket',
          type: 'switch',
          helperText: 'Enable real-time WebSocket connections'
        },
        {
          key: 'enableMempoolMonitoring',
          label: 'Enable Mempool Monitoring',
          type: 'switch',
          helperText: 'Monitor mempool for pending transactions'
        },
        {
          key: 'maxRetries',
          label: 'Max Retries',
          type: 'number',
          helperText: 'Maximum number of retry attempts for failed transactions',
          placeholder: memoizedCurrentConfig?.maxRetries?.toString() || "3"
        },
        {
          key: 'retryDelay',
          label: 'Retry Delay (ms)',
          type: 'number',
          helperText: 'Delay between retry attempts (in milliseconds)',
          placeholder: memoizedCurrentConfig?.retryDelay?.toString() || "1000"
        }
      ]
    },
    {
      id: 'monitoring',
      title: 'Monitoring Settings',
      description: 'Configure monitoring and metrics collection',
      icon: <TimelineIcon />,
      color: '#FF9500',
      fields: [
        {
          key: 'enableMetrics',
          label: 'Enable Metrics',
          type: 'switch',
          helperText: 'Enable performance metrics collection'
        },
        {
          key: 'metricsInterval',
          label: 'Metrics Interval (ms)',
          type: 'number',
          helperText: 'How often to update metrics (in milliseconds)',
          placeholder: memoizedCurrentConfig?.metricsInterval?.toString() || "5000"
        },
        {
          key: 'nativeTokenSupport',
          label: 'Native Token Support',
          type: 'switch',
          helperText: 'Enable native token (ETH, BNB, MATIC) transfers'
        }
      ]
    },
    {
      id: 'logging',
      title: 'Logging Settings',
      description: 'Configure logging and debugging options',
      icon: <StorageIcon />,
      color: '#5856D6',
      fields: [
        {
          key: 'enableLogging',
          label: 'Enable Logging',
          type: 'switch',
          helperText: 'Enable detailed logging for debugging'
        },
        {
          key: 'logLevel',
          label: 'Log Level',
          type: 'select',
          options: [
            { value: 'error', label: 'Error' },
            { value: 'warn', label: 'Warning' },
            { value: 'info', label: 'Info' },
            { value: 'debug', label: 'Debug' }
          ],
          helperText: 'Set the logging level for detailed output'
        }
      ]
    }
  ];

  const renderField = (field) => {
    switch (field.type) {
      case 'switch':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={config[field.key] || false}
                onChange={(e) => handleConfigChange(field.key, e.target.checked)}
                color="primary"
              />
            }
            label={field.label}
            sx={{ mb: 2 }}
          />
        );
      case 'select':
        return (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={config[field.key] || ''}
              onChange={(e) => handleConfigChange(field.key, e.target.value)}
              label={field.label}
            >
              {field.options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{field.helperText}</FormHelperText>
          </FormControl>
        );
      default:
        return (
          <TextField
            fullWidth
            label={field.label}
            type={field.type}
            value={config[field.key] || ''}
            onChange={(e) => handleConfigChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
            placeholder={field.placeholder}
            helperText={field.helperText}
            margin="normal"
          />
        );
    }
  };

  // Memoize action buttons to prevent flickering
  const actionButtons = useMemo(() => (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Button
        variant="outlined"
        startIcon={<RefreshIcon />}
        onClick={loadConfig}
        disabled={loading}
      >
        Refresh
      </Button>
      <Button
        variant="outlined"
        startIcon={reloading ? <CircularProgress size={16} /> : <RefreshIcon />}
        onClick={handleReload}
        disabled={loading || reloading}
        sx={{ transform: 'rotate(180deg)' }}
      >
        Reload Bot
      </Button>
      <Button
        variant="contained"
        startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
        onClick={handleSave}
        disabled={!hasChanges || loading}
        sx={{
          background: 'linear-gradient(135deg, #5856D6 0%, #7B7AFF 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #7B7AFF 0%, #5856D6 100%)',
          },
        }}
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>
    </Box>
  ), [loading, reloading, hasChanges, loadConfig, handleReload, handleSave]);

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Fade in={animate} timeout={800}>
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Typography variant="h3" sx={{ 
            fontWeight: 700, 
            background: 'linear-gradient(135deg, #5856D6 0%, #7B7AFF 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1,
            fontSize: { xs: '1.75rem', md: '2.5rem' }
          }}>
            Bot Configuration
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, fontSize: { xs: '0.875rem', md: '1rem' } }}>
            Configure your bot's performance, network, and monitoring settings
          </Typography>

          {/* Current Configuration Display */}
          <Paper sx={{ 
            p: { xs: 2, md: 3 }, 
            background: 'rgba(255, 255, 255, 0.8)', 
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            mb: 3
          }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, fontSize: { xs: '1rem', md: '1.25rem' } }}>
              Current Configuration
            </Typography>
            <Grid container spacing={{ xs: 1, md: 2 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: { xs: 1, md: 2 }, bgcolor: 'rgba(0, 122, 255, 0.05)', borderRadius: 2 }}>
                  <Typography variant="h6" color="primary.main" fontWeight={600} sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                    {memoizedCurrentConfig?.checkInterval || 100}ms
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                    Check Interval
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: { xs: 1, md: 2 }, bgcolor: 'rgba(52, 199, 89, 0.05)', borderRadius: 2 }}>
                  <Typography variant="h6" color="success.main" fontWeight={600} sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                    {memoizedCurrentConfig?.gasPriceMultiplier || 1.5}x
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                    Gas Multiplier
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: { xs: 1, md: 2 }, bgcolor: 'rgba(255, 149, 0, 0.05)', borderRadius: 2 }}>
                  <Typography variant="h6" color="warning.main" fontWeight={600} sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                    {memoizedCurrentConfig?.maxRetries || 3}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                    Max Retries
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: { xs: 1, md: 2 }, bgcolor: 'rgba(88, 86, 214, 0.05)', borderRadius: 2 }}>
                  <Typography variant="h6" color="secondary.main" fontWeight={600} sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                    {memoizedCurrentConfig?.enableWebSocket ? 'ON' : 'OFF'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                    WebSocket
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      </Fade>

      {/* Configuration Sections */}
      <Grid container spacing={3}>
        {configSections.map((section, index) => (
          <Grid item xs={12} lg={6} key={section.id}>
            <Slide direction="up" in={animate} timeout={1000 + index * 200}>
              <Card sx={{ 
                height: '100%',
                position: 'relative',
                overflow: 'visible',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                },
              }}>
                <CardHeader
                  avatar={
                    <Avatar sx={{ 
                      bgcolor: section.color,
                      width: 48,
                      height: 48,
                    }}>
                      {section.icon}
                    </Avatar>
                  }
                  title={
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {section.title}
                    </Typography>
                  }
                  subheader={
                    <Typography variant="body2" color="text.secondary">
                      {section.description}
                    </Typography>
                  }
                  sx={{ pb: 1 }}
                />
                <CardContent>
                  {section.fields.map((field) => (
                    <Box key={field.key}>
                      {renderField(field)}
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Slide>
          </Grid>
        ))}
      </Grid>

      {/* Action Buttons */}
      <Grow in={animate} timeout={2000}>
        <Paper sx={{ 
          p: 3, 
          mt: 4,
          background: 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Configuration Actions
            </Typography>
            {hasChanges && (
              <Chip
                label="Unsaved Changes"
                color="warning"
                size="small"
                icon={<WarningIcon />}
              />
            )}
          </Box>
          {actionButtons}
        </Paper>
      </Grow>

      {/* Alerts */}
      {error && (
        <Zoom in={!!error}>
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        </Zoom>
      )}

      {saveSuccess && (
        <Zoom in={saveSuccess}>
          <Alert severity="success" sx={{ mt: 3 }} onClose={() => setSaveSuccess(false)}>
            Configuration saved and reloaded successfully!
          </Alert>
        </Zoom>
      )}
    </Container>
  );
};

export default Configuration; 