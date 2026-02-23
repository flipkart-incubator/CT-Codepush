import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  TextField,
  Typography,
  useTheme,
  CircularProgress,
  Link,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Group as GroupIcon,
  MoreVert as MoreVertIcon,
  SwapHoriz as TransferIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import api from '@/utils/api';

interface App {
  name: string;
  description?: string;
  deployments: string[];
  collaborators: Record<string, { permission: string }>;
}

export const Apps: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingApp, setEditingApp] = useState<App | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      setLoading(true);
      const response = await api.get('/apps');
      console.log('Apps response:', response.data);
      setApps(response.data.apps || []);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load apps';
      console.error('Failed to fetch apps:', errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (app?: App) => {
    if (app) {
      setEditingApp(app);
      setFormData({
        name: app.name,
        description: app.description || '',
      });
    } else {
      setEditingApp(null);
      setFormData({
        name: '',
        description: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingApp(null);
    setFormData({
      name: '',
      description: '',
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingApp) {
        await api.patch(`/apps/${editingApp.name}`, formData);
        toast.success('App updated successfully');
      } else {
        await api.post('/apps', formData);
        toast.success('App created successfully');
      }
      handleCloseDialog();
      fetchApps(); // Refresh the apps list
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save app';
      console.error('Failed to save app:', errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (appName: string) => {
    if (window.confirm('Are you sure you want to delete this app?')) {
      try {
        await api.delete(`/apps/${appName}`);
        toast.success('App deleted successfully');
        fetchApps(); // Refresh the apps list
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to delete app';
        console.error('Failed to delete app:', errorMessage);
        toast.error(errorMessage);
      }
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, app: App) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedApp(app);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedApp(null);
  };

  const handleTransfer = () => {
    if (selectedApp) {
      navigate(`/code-push/apps/${selectedApp.name}/transfer`);
    }
    handleMenuClose();
  };

  const handlePushBundle = () => {
    if (selectedApp) {
      navigate(`/code-push/apps/${selectedApp.name}/push`);
    }
    handleMenuClose();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Apps ({apps.length})</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add App
        </Button>
      </Box>

      <Grid container spacing={3}>
        {apps.map((app) => (
          <Grid item xs={12} sm={6} md={4} key={app.name}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8],
                },
              }}
              onClick={(e) => {
                if (
                  e.target instanceof Element &&
                  (e.target.closest('button') || e.target.closest('a'))
                ) {
                  return;
                }
                navigate(`/code-push/apps/${app.name}/deployments`);
              }}
            >
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="flex-start"
                >
                  <Typography variant="h6" gutterBottom>
                    {app.name}
                  </Typography>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, app)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Typography color="text.secondary" paragraph>
                  {app.description || 'No description'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Deployments: {app.deployments?.length || 0}
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <GroupIcon fontSize="small" color="action" />
                  <Link
                    component={RouterLink}
                    to={`/code-push/apps/${app.name}/collaborators`}
                    color="inherit"
                    underline="hover"
                  >
                    Collaborators: {Object.keys(app.collaborators || {}).length}
                  </Link>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingApp ? 'Edit App' : 'Create New App'}
        </DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <TextField
              fullWidth
              label="App Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              margin="normal"
              disabled={!!editingApp}
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              margin="normal"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!formData.name}
          >
            {editingApp ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedApp) navigate(`/code-push/apps/${selectedApp.name}/collaborators`);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <GroupIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Manage Collaborators</ListItemText>
        </MenuItem>
        <MenuItem onClick={handlePushBundle}>
          <ListItemIcon>
            <CloudUploadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Push Bundle</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleTransfer}>
          <ListItemIcon>
            <TransferIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Transfer Ownership</ListItemText>
        </MenuItem>
        {/* <MenuItem onClick={() => {
          if (selectedApp) handleDelete(selectedApp.name);
          handleMenuClose();
        }}> */}
          {/**
           * Commented the delete button because it is not used for now.
           */}
          {/* <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText> */}
        {/* </MenuItem> */}
      </Menu>
    </Box>
  );
}; 