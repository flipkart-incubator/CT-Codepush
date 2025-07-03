import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Link,
  CircularProgress,
  SelectChangeEvent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  History as HistoryIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom';
import api from '@/utils/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`deployment-tabpanel-${index}`}
      aria-labelledby={`deployment-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface App {
  name: string;
  deployments: string[];
}

interface Deployment {
  name: string;
  key: string;
  package?: {
    appVersion: string;
    description: string;
    isDisabled: boolean;
    isMandatory: boolean;
    label: string;
    packageHash: string;
    size: number;
    uploadTime: number;
  };
}

export const Deployments: React.FC = () => {
  const { appName } = useParams<{ appName?: string }>();
  const navigate = useNavigate();
  const [apps, setApps] = useState<App[]>([]);
  const [selectedApp, setSelectedApp] = useState<string>('');
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [newDeploymentName, setNewDeploymentName] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deploymentToDelete, setDeploymentToDelete] = useState<Deployment | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const fetchApps = async () => {
    try {
      const response = await api.get<{ apps: App[] }>('/apps');
      setApps(response.data.apps);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch apps';
      console.error('Error fetching apps:', error);
      toast.error(errorMessage);
    }
  };

  const fetchDeployments = async (appName: string) => {
    try {
      setLoading(true);
      const response = await api.get<{ deployments: Deployment[] }>(`/apps/${appName}/deployments`);
      setDeployments(response.data.deployments);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch deployments';
      console.error('Error fetching deployments:', error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  useEffect(() => {
    if (appName && apps.some(app => app.name === appName)) {
      setSelectedApp(appName);
    }
  }, [appName, apps]);

  useEffect(() => {
    if (selectedApp) {
      fetchDeployments(selectedApp);
    }
  }, [selectedApp]);

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewDeploymentName('');
  };

  const handleSubmit = async () => {
    if (!selectedApp || !newDeploymentName) return;

    try {
      await api.post(`/apps/${selectedApp}/deployments`, {
        name: newDeploymentName,
      });
      toast.success('Deployment created successfully');
      handleCloseDialog();
      fetchDeployments(selectedApp);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create deployment';
      console.error('Error creating deployment:', error);
      toast.error(errorMessage);
    }
  };

  const handleAppChange = (event: SelectChangeEvent<string>) => {
    const newAppName = event.target.value;
    setSelectedApp(newAppName);
    navigate(`/code-push/apps/${newAppName}/deployments`);
  };

  const getStatusColor = (deployment: Deployment) => {
    if (!deployment.package) {
      return 'default';
    }
    if (deployment.package.isDisabled) {
      return 'error';
    }
    return 'success';
  };

  const getStatusLabel = (deployment: Deployment) => {
    if (!deployment.package) {
      return 'No Release';
    }
    if (deployment.package.isDisabled) {
      return 'Disabled';
    }
    return 'Active';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('Deployment key copied to clipboard');
  };

  const handleDeleteClick = (deployment: Deployment) => {
    setDeploymentToDelete(deployment);
    setDeleteConfirmationText('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedApp || !deploymentToDelete) return;

    try {
      await api.delete(`/apps/${selectedApp}/deployments/${deploymentToDelete.name}`);
      toast.success(`Successfully deleted deployment "${deploymentToDelete.name}"`);
      setDeleteDialogOpen(false);
      setDeploymentToDelete(null);
      setDeleteConfirmationText('');
      // Refresh the deployments list
      fetchDeployments(selectedApp);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete deployment';
      toast.error(errorMessage);
      console.error('Delete deployment error:', error);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Deployments</Typography>
        <Box display="flex" gap={2}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Select App</InputLabel>
            <Select
              value={selectedApp}
              label="Select App"
              onChange={handleAppChange}
            >
              {apps.map((app) => (
                <MenuItem key={app.name} value={app.name}>
                  {app.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={handleOpenDialog}
            disabled={!selectedApp}
          >
            New Deployment
          </Button>
        </Box>
      </Box>

      {selectedApp && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Deployments" />
            <Tab label="Deployment Keys" />
          </Tabs>
        </Box>
      )}

      <TabPanel value={tabValue} index={0}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {deployments.map((deployment) => (
              <Grid item xs={12} sm={6} md={4} key={deployment.key}>
                <Card>
                  <CardContent>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      mb={2}
                    >
                      <Typography variant="h6">
                        {deployment.name}
                      </Typography>
                      <Chip
                        label={getStatusLabel(deployment)}
                        color={getStatusColor(deployment)}
                        size="small"
                      />
                    </Box>
                    {deployment.package ? (
                      <>
                        <Typography variant="subtitle1" gutterBottom>
                          Version: {deployment.package.appVersion || 'N/A'}
                        </Typography>
                        <Typography color="text.secondary" paragraph>
                          {deployment.package.description || 'No description'}
                        </Typography>
                        <Box display="flex" flexDirection="column" gap={1}>
                          <Typography variant="body2" color="text.secondary">
                            Size: {formatBytes(deployment.package.size)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Released: {formatDate(deployment.package.uploadTime)}
                          </Typography>
                          {deployment.package.isMandatory && (
                            <Chip label="Mandatory" color="primary" size="small" sx={{ alignSelf: 'flex-start' }} />
                          )}
                        </Box>
                      </>
                    ) : (
                      <Typography color="text.secondary">
                        No release has been made to this deployment
                      </Typography>
                    )}
                    <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                      <Link
                        component={RouterLink}
                        to={`/code-push/apps/${selectedApp}/deployments/${deployment.name}/history`}
                        color="primary"
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <HistoryIcon fontSize="small" />
                        View History
                      </Link>
                      {/* <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(deployment)}
                        title="Delete deployment"
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton> */}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Deployment Key</TableCell>
                <TableCell>Latest Version</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Release Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deployments.map((deployment) => (
                <TableRow key={deployment.key}>
                  <TableCell>{deployment.name}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography
                        sx={{
                          fontFamily: 'monospace',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {deployment.key}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleCopyKey(deployment.key)}
                        title="Copy deployment key"
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {deployment.package?.appVersion || 'No Release'}
                  </TableCell>
                  <TableCell>
                    <Typography
                      sx={{
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {deployment.package?.description || 'No description'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {deployment.package ? formatDate(deployment.package.uploadTime) : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(deployment)}
                      color={getStatusColor(deployment)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box display="flex" justifyContent="flex-end" gap={1}>
                      <IconButton
                        size="small"
                        onClick={() => handleCopyKey(deployment.key)}
                        title="Copy deployment key"
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        component={RouterLink}
                        to={`/code-push/apps/${selectedApp}/deployments/${deployment.name}/history`}
                        title="View history"
                      >
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                      {/* <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(deployment)}
                        title="Delete deployment"
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton> */}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Deployment</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <TextField
              fullWidth
              label="Deployment Name"
              value={newDeploymentName}
              onChange={(e) => setNewDeploymentName(e.target.value)}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!newDeploymentName}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Deployment Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main' }}>
          Delete Deployment
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              ⚠️ This action cannot be undone!
            </Typography>
          </Alert>
          <Typography gutterBottom>
            Are you sure you want to permanently delete the deployment <strong>"{deploymentToDelete?.name}"</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This will permanently:
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 2, pl: 2 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              Delete the deployment and all its release history
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Make the deployment key permanently unrecoverable
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Prevent any clients from receiving future updates from this deployment
            </Typography>
          </Box>
          <Typography variant="body2" color="warning.main" sx={{ fontWeight: 'medium' }}>
            Please type the deployment name <strong>"{deploymentToDelete?.name}"</strong> to confirm:
          </Typography>
          <TextField
            fullWidth
            margin="normal"
            placeholder={deploymentToDelete?.name}
            value={deleteConfirmationText}
            onChange={(e) => setDeleteConfirmationText(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            startIcon={<DeleteIcon />}
            disabled={deleteConfirmationText !== deploymentToDelete?.name}
          >
            Delete Deployment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 