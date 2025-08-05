import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Avatar,
  Divider,
  Chip,
  Fade,
  Zoom,
  CircularProgress,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

const Profile = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
      
      const response = await axios.put(`${API_BASE_URL}/auth/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      }, { headers });

      if (response.data.success) {
        setSuccess('Password changed successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        setError(response.data.error || 'Failed to change password');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
      <Fade in timeout={800}>
        <Box>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h3" sx={{ 
              fontWeight: 700, 
              background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
              fontSize: { xs: '1.75rem', md: '2.5rem' }
            }}>
              Profile Settings
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your account information and security settings
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* User Information */}
            <Grid item xs={12} md={6}>
              <Zoom in timeout={1000}>
                <Card sx={{ 
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  height: 'fit-content'
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <Avatar sx={{ 
                        width: 64, 
                        height: 64, 
                        bgcolor: 'primary.main',
                        mr: 2,
                        background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)'
                      }}>
                        <PersonIcon sx={{ fontSize: 32 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h5" fontWeight={600}>
                          {currentUser.username}
                        </Typography>
                        <Chip 
                          label={currentUser.role} 
                          size="small"
                          sx={{ 
                            bgcolor: currentUser.role === 'admin' ? '#FF3B30' : '#34C759',
                            color: 'white',
                            fontWeight: 600
                          }}
                        />
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <PersonIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                        <Typography variant="body2" color="text.secondary">
                          Username
                        </Typography>
                      </Box>
                      <Typography variant="body1" fontWeight={500}>
                        {currentUser.username}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <EmailIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                        <Typography variant="body2" color="text.secondary">
                          Email
                        </Typography>
                      </Box>
                      <Typography variant="body1" fontWeight={500}>
                        {currentUser.email}
                      </Typography>
                    </Box>

                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <SecurityIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                        <Typography variant="body2" color="text.secondary">
                          Account Type
                        </Typography>
                      </Box>
                      <Typography variant="body1" fontWeight={500}>
                        {currentUser.role === 'admin' ? 'Administrator' : 'Standard User'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Zoom>
            </Grid>

            {/* Password Change */}
            <Grid item xs={12} md={6}>
              <Zoom in timeout={1200}>
                <Card sx={{ 
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <SecurityIcon sx={{ mr: 1, color: 'primary.main', fontSize: 28 }} />
                      <Typography variant="h5" fontWeight={600}>
                        Change Password
                      </Typography>
                    </Box>

                    {success && (
                      <Alert severity="success" sx={{ mb: 3 }}>
                        {success}
                      </Alert>
                    )}

                    {error && (
                      <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                      </Alert>
                    )}

                    <form onSubmit={handlePasswordSubmit}>
                      <TextField
                        fullWidth
                        name="currentPassword"
                        label="Current Password"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        variant="outlined"
                        margin="normal"
                        required
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />

                      <TextField
                        fullWidth
                        name="newPassword"
                        label="New Password"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        variant="outlined"
                        margin="normal"
                        required
                        helperText="Password must be at least 6 characters long"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />

                      <TextField
                        fullWidth
                        name="confirmPassword"
                        label="Confirm New Password"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        variant="outlined"
                        margin="normal"
                        required
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />

                      <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={loading}
                        sx={{
                          mt: 3,
                          py: 1.5,
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #0056CC 0%, #4A47B8 100%)',
                          },
                        }}
                      >
                        {loading ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          'Change Password'
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </Zoom>
            </Grid>
          </Grid>
        </Box>
      </Fade>
    </Container>
  );
};

export default Profile; 