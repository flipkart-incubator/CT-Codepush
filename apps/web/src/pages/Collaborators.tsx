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
  CircularProgress,
  Link,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Apps as AppsIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import api from '@/utils/api';

interface CollaboratorProperties {
  permission: 'Owner' | 'Collaborator';
  isCurrentAccount: boolean;
}

interface CollaboratorMap {
  [email: string]: CollaboratorProperties;
}

interface App {
  id: string;
  name: string;
  collaborators: CollaboratorMap;
}

export const Collaborators: React.FC = () => {
  const { appName, email: emailParam } = useParams<{ appName: string; email: string }>();
  const navigate = useNavigate();
  const [collaborators, setCollaborators] = useState<CollaboratorMap>({});
  const [apps, setApps] = useState<App[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingCollaborator, setAddingCollaborator] = useState(false);

  const fetchApps = async () => {
    try {
      setLoading(true);
      const response = await api.get('/apps');
      setApps(response.data.apps || []);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load apps';
      console.error('Failed to fetch apps:', error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollaborators = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/apps/${appName}/collaborators`);
      setCollaborators(response.data.collaborators);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch collaborators';
      console.error('Error fetching collaborators:', error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (appName) {
      fetchCollaborators();
    } else {
      fetchApps();
    }
  }, [appName]);

  useEffect(() => {
    const addCollaboratorFromUrl = async () => {
      if (emailParam && appName && !addingCollaborator) {
        setAddingCollaborator(true);
        try {
          await api.post(`/apps/${appName}/collaborators/${emailParam}`);
          toast.success('Collaborator added successfully');
          await fetchCollaborators();
          // Navigate to the main collaborators page after successful addition
          navigate(`/code-push/apps/${appName}/collaborators`);
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Failed to add collaborator';
          console.error('Error adding collaborator:', error);
          toast.error(errorMessage);
        }
      }
    };

    addCollaboratorFromUrl();
  }, [emailParam, appName]);

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEmail('');
  };

  const handleSubmit = async () => {
    try {
      await api.post(`/apps/${appName}/collaborators/${email}`);
      toast.success('Collaborator added successfully');
      handleCloseDialog();
      fetchCollaborators();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add collaborator';
      console.error('Error adding collaborator:', error);
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (collaboratorEmail: string) => {
    try {
      await api.delete(`/apps/${appName}/collaborators/${collaboratorEmail}`);
      toast.success('Collaborator removed successfully');
      fetchCollaborators();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to remove collaborator';
      console.error('Error removing collaborator:', error);
      toast.error(errorMessage);
    }
  };

  const getRoleColor = (permission: CollaboratorProperties['permission']) => {
    switch (permission) {
      case 'Owner':
        return 'error.main';
      case 'Collaborator':
        return 'primary.main';
      default:
        return 'text.primary';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (addingCollaborator) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography ml={2}>Adding collaborator...</Typography>
      </Box>
    );
  }

  // Global collaborators view
  if (!appName) {
    return (
      <Box p={3}>
        <Typography variant="h4" gutterBottom>
          All Collaborators
        </Typography>
        <Grid container spacing={3}>
          {apps.map((app) => (
            <Grid item xs={12} sm={6} md={4} key={app.name}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <AppsIcon color="primary" />
                    <Typography variant="h6">{app.name}</Typography>
                  </Box>
                  <Box mb={2}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Collaborators ({Object.keys(app.collaborators || {}).length})
                    </Typography>
                    {Object.entries(app.collaborators || {}).map(([email, properties]) => (
                      <Box key={email} display="flex" alignItems="center" gap={1} mb={1}>
                        <PersonIcon fontSize="small" />
                        <Typography variant="body2">{email}</Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: getRoleColor(properties.permission) }}
                        >
                          ({properties.permission})
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <Link
                    component={RouterLink}
                    to={`/code-push/apps/${app.name}/collaborators`}
                    color="primary"
                    underline="hover"
                  >
                    Manage Collaborators
                  </Link>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // App-specific collaborators view
  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Collaborators for {appName}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Add Collaborator
        </Button>
      </Box>

      <Grid container spacing={3}>
        {Object.entries(collaborators).map(([collaboratorEmail, properties]) => (
          <Grid item xs={12} sm={6} md={4} key={collaboratorEmail}>
            <Card>
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="flex-start"
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonIcon />
                    <Typography variant="h6">{collaboratorEmail}</Typography>
                  </Box>
                  {!properties.isCurrentAccount && (
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(collaboratorEmail)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
                <Typography
                  variant="subtitle1"
                  sx={{ color: getRoleColor(properties.permission) }}
                >
                  {properties.permission}
                </Typography>
                {properties.isCurrentAccount && (
                  <Typography variant="body2" color="text.secondary">
                    (Current Account)
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add Collaborator</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!email}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 