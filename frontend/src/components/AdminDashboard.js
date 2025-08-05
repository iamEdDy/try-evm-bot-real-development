import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  Fade,
  Zoom,
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  People as PeopleIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });

  const token = localStorage.getItem('token');

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3002/api/auth/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        setError('Failed to load users');
      }
    } catch (error) {
      setError('Network error');
    }
  }, [token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userForm)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('User created successfully');
        setOpenUserDialog(false);
        setUserForm({ username: '', email: '', password: '', role: 'user' });
        loadUsers();
      } else {
        setError(data.error || 'Failed to create user');
      }
    } catch (error) {
      setError('Network error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3002/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('User deleted successfully');
        loadUsers();
      } else {
        setError(data.error || 'Failed to delete user');
      }
    } catch (error) {
      setError('Network error');
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

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar
              sx={{
                mr: 2,
                background: 'linear-gradient(135deg, #FF3B30 0%, #FF6B6B 100%)',
                boxShadow: '0 8px 32px rgba(255, 59, 48, 0.3)'
              }}
            >
              <AdminIcon />
            </Avatar>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #FF3B30 0%, #FF6B6B 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Admin Dashboard
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage users and system settings
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Alerts */}
        {error && (
          <Fade in timeout={300}>
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          </Fade>
        )}

        {success && (
          <Fade in timeout={300}>
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
              {success}
            </Alert>
          </Fade>
        )}

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Zoom in timeout={600}>
              <Card
                sx={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 3,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Avatar
                    sx={{
                      mx: 'auto',
                      mb: 2,
                      background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
                      boxShadow: '0 8px 32px rgba(0, 122, 255, 0.3)'
                    }}
                  >
                    <PeopleIcon />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="primary.main">
                    {users.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Users
                  </Typography>
                </CardContent>
              </Card>
            </Zoom>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Zoom in timeout={800}>
              <Card
                sx={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 3,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Avatar
                    sx={{
                      mx: 'auto',
                      mb: 2,
                      background: 'linear-gradient(135deg, #FF3B30 0%, #FF6B6B 100%)',
                      boxShadow: '0 8px 32px rgba(255, 59, 48, 0.3)'
                    }}
                  >
                    <AdminIcon />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="error.main">
                    {users.filter(u => u.role === 'admin').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Administrators
                  </Typography>
                </CardContent>
              </Card>
            </Zoom>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Zoom in timeout={1000}>
              <Card
                sx={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 3,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Avatar
                    sx={{
                      mx: 'auto',
                      mb: 2,
                      background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
                      boxShadow: '0 8px 32px rgba(52, 199, 89, 0.3)'
                    }}
                  >
                    <PersonIcon />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {users.filter(u => u.role === 'user').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Regular Users
                  </Typography>
                </CardContent>
              </Card>
            </Zoom>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Zoom in timeout={1200}>
              <Card
                sx={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 3,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Avatar
                    sx={{
                      mx: 'auto',
                      mb: 2,
                      background: 'linear-gradient(135deg, #FF9500 0%, #FFB340 100%)',
                      boxShadow: '0 8px 32px rgba(255, 149, 0, 0.3)'
                    }}
                  >
                    <SettingsIcon />
                  </Avatar>
                  <Typography variant="h4" fontWeight={700} color="warning.main">
                    System
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active
                  </Typography>
                </CardContent>
              </Card>
            </Zoom>
          </Grid>
        </Grid>

        {/* User Management */}
        <Card
          sx={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
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
      </Box>
    </Container>
  );
};

export default AdminDashboard; 