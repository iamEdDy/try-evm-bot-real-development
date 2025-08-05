import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  AccountBalanceWallet as WalletIcon,
  Token as TokenIcon,
  Settings as SettingsIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';

const Navigation = ({ currentPage, onPageChange }) => {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, page: 'dashboard' },
    { text: 'Wallets', icon: <WalletIcon />, page: 'wallets' },
    { text: 'Tokens', icon: <TokenIcon />, page: 'tokens' },
    { text: 'Configuration', icon: <SettingsIcon />, page: 'configuration' },
    { text: 'Admin', icon: <AdminIcon />, page: 'admin' }
  ];

  const handlePageChange = (page) => {
    onPageChange(page);
    setDrawerOpen(false);
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            EVM Bot Dashboard
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: 250 }} role="presentation">
          <List>
            {menuItems.map((item) => (
              <ListItem
                button
                key={item.text}
                onClick={() => handlePageChange(item.page)}
                selected={currentPage === item.page}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Navigation; 