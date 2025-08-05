import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import { BotProvider } from './contexts/BotContext';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';

// Apple-style theme with premium aesthetics
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#007AFF',
      light: '#4DA3FF',
      dark: '#0056CC',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#5856D6',
      light: '#7B7AFF',
      dark: '#3634A3',
    },
    background: {
      default: '#F2F2F7',
      paper: '#FFFFFF',
    },
    surface: {
      main: '#FFFFFF',
      secondary: '#F2F2F7',
      tertiary: '#E5E5EA',
    },
    text: {
      primary: '#1D1D1F',
      secondary: '#86868B',
      disabled: '#C7C7CC',
    },
    success: {
      main: '#34C759',
      light: '#5CDB7B',
      dark: '#28A745',
    },
    warning: {
      main: '#FF9500',
      light: '#FFB340',
      dark: '#E6850E',
    },
    error: {
      main: '#FF3B30',
      light: '#FF6961',
      dark: '#D70015',
    },
    info: {
      main: '#007AFF',
      light: '#4DA3FF',
      dark: '#0056CC',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 600,
      letterSpacing: '0.01em',
      textTransform: 'none',
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.4,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.04)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.12)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '12px 24px',
          fontWeight: 600,
          letterSpacing: '0.01em',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
          },
        },
        contained: {
          boxShadow: '0 2px 8px rgba(0, 122, 255, 0.2)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0, 122, 255, 0.3)',
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#007AFF',
              },
            },
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#007AFF',
                borderWidth: '2px',
              },
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          fontSize: '0.75rem',
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .MuiSwitch-switchBase': {
            '&.Mui-checked': {
              '& + .MuiSwitch-track': {
                backgroundColor: '#007AFF',
              },
            },
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          backgroundColor: '#E5E5EA',
        },
        bar: {
          borderRadius: 6,
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: '#007AFF',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser(user);
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = (user, token) => {
    setCurrentUser(user);
  };

  const handleRegister = (user, token) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
  };

  const switchToRegister = () => {
    // This function is passed to Login component but not used in current implementation
  };

  const switchToLogin = () => {
    // This function is passed to Register component but not used in current implementation
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ minHeight: '100vh', background: '#F2F2F7' }}>
          <Routes>
            {/* Public routes */}
            <Route 
              path="/login" 
              element={
                currentUser ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Login onLogin={handleLogin} onSwitchToRegister={switchToRegister} />
                )
              } 
            />
            <Route 
              path="/register" 
              element={
                currentUser ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Register onRegister={handleRegister} onSwitchToLogin={switchToLogin} />
                )
              } 
            />

            {/* Protected routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <BotProvider>
                    <Dashboard onLogout={handleLogout} />
                  </BotProvider>
                </ProtectedRoute>
              } 
            />

            {/* Default redirect */}
            <Route 
              path="/" 
              element={
                currentUser ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
          </Routes>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
