import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Slider,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Restore as RollbackIcon,
  Publish as PromoteIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { rollbackDeployment } from '@/utils/api';

interface DeploymentMetrics {
  active: number;
  downloaded: number;
  failed: number;
  installed: number;
}

interface Package {
  appVersion: string;
  blobUrl: string;
  description: string;
  isDisabled: boolean;
  isMandatory: boolean;
  label: string;
  packageHash: string;
  releaseMethod: string;
  releasedBy: string;
  rollout: number | null;
  size: number;
  uploadTime: number;
  metrics?: DeploymentMetrics;
}

interface Deployment {
  name: string;
  key: string;
}

export const DeploymentHistory: React.FC = () => {
  const { appName, deploymentName } = useParams<{ appName: string; deploymentName: string }>();
  const navigate = useNavigate();
  const [history, setHistory] = useState<Package[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Package | null>(null);
  const [promoteForm, setPromoteForm] = useState({
    targetDeployment: '',
    description: '',
    mandatory: false,
    disabled: false,
    rollout: 100,
  });

  const fetchDeploymentHistory = async () => {
    if (!appName || !deploymentName) {
      setError('Missing app name or deployment name');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/apps/${appName}/deployments/${deploymentName}/history`);
      const metricsResponse = await api.get(`/apps/${appName}/deployments/${deploymentName}/metrics`);
      
      const historyWithMetrics = response.data.history.map((pkg: Package) => ({
        ...pkg,
        metrics: metricsResponse.data.metrics[pkg.label] || {
          active: 0,
          downloaded: 0,
          failed: 0,
          installed: 0,
        },
      }));
      
      setHistory(historyWithMetrics);

      // Also fetch all deployments for promote functionality
      try {
        const deploymentsResponse = await api.get(`/apps/${appName}/deployments`);
        if (deploymentsResponse.data.deployments) {
          setDeployments(deploymentsResponse.data.deployments);
        }
      } catch (deploymentsError: any) {
        console.warn('Failed to fetch deployments list:', deploymentsError);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch deployment history';
      console.error('Error fetching deployment history:', error);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!appName || !deploymentName) return;

    try {
      await api.delete(`/apps/${appName}/deployments/${deploymentName}/history`);
      toast.success('Deployment history cleared successfully');
      fetchDeploymentHistory();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to clear deployment history';
      console.error('Error clearing deployment history:', error);
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleRollbackClick = (pkg: Package) => {
    setSelectedVersion(pkg);
    setRollbackDialogOpen(true);
  };

  const handleRollbackConfirm = async () => {
    if (!appName || !deploymentName || !selectedVersion) return;

    try {
      await rollbackDeployment(appName, deploymentName, selectedVersion.label);
      toast.success('Successfully rolled back to version ' + selectedVersion.label);
      setRollbackDialogOpen(false);
      // Refresh the deployment history
      fetchDeploymentHistory();
      // Navigate back to deployment details to see the changes
      navigate(`/code-push/apps/${appName}/deployments/${deploymentName}`);
    } catch (error: any) {
      const errorMessage = error.response?.status === 409
        ? (error.response?.data?.message || 'Cannot rollback: This version is not compatible with the current deployment.')
        : (error.response?.data?.message || error.message || 'Failed to rollback deployment');
      
      toast.error(errorMessage);
    }
  };

  const handlePromoteClick = (pkg: Package) => {
    setSelectedVersion(pkg);
    // Pre-fill form with selected package data
    setPromoteForm({
      targetDeployment: '',
      description: pkg.description || '',
      mandatory: pkg.isMandatory,
      disabled: pkg.isDisabled,
      rollout: pkg.rollout || 100,
    });
    setPromoteDialogOpen(true);
  };

  const handlePromoteConfirm = async () => {
    if (!appName || !deploymentName || !promoteForm.targetDeployment || !selectedVersion) return;

    try {
      const packageInfo: any = {};
      
      // Only include changed properties
      if (promoteForm.description !== selectedVersion.description) {
        packageInfo.description = promoteForm.description;
      }
      if (promoteForm.mandatory !== selectedVersion.isMandatory) {
        packageInfo.isMandatory = promoteForm.mandatory;
      }
      if (promoteForm.disabled !== selectedVersion.isDisabled) {
        packageInfo.isDisabled = promoteForm.disabled;
      }
      if (promoteForm.rollout !== (selectedVersion.rollout || 100)) {
        packageInfo.rollout = promoteForm.rollout;
      }

      // Add label to specify which version to promote
      packageInfo.label = selectedVersion.label;

      await api.post(
        `/apps/${appName}/deployments/${deploymentName}/promote/${promoteForm.targetDeployment}`,
        packageInfo
      );

      toast.success(`Successfully promoted version ${selectedVersion.label} to ${promoteForm.targetDeployment}`);
      setPromoteDialogOpen(false);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to promote deployment';
      toast.error(errorMessage);
    }
  };

  useEffect(() => {
    fetchDeploymentHistory();
  }, [appName, deploymentName]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (pkg: Package) => {
    if (pkg.isDisabled) {
      return <WarningIcon color="warning" />;
    }
    if (pkg.metrics?.failed && pkg.metrics.failed > 0) {
      return <ErrorIcon color="error" />;
    }
    return <SuccessIcon color="success" />;
  };

  if (!appName || !deploymentName) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Invalid URL. Please select an app and deployment to view history.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Deployment History for {appName}/{deploymentName}
        </Typography>
        {/* <Box display="flex" gap={2}>
          <Tooltip title="Clear History">
            <IconButton onClick={clearHistory} color="error">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box> */}
      </Box>

      {history.length === 0 ? (
        <Alert severity="info">No deployment history available.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Label</TableCell>
                <TableCell>App Version</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Release Time</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Metrics</TableCell>
                <TableCell>Properties</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((pkg, index) => (
                <TableRow 
                  key={pkg.label}
                  sx={{ 
                    backgroundColor: index === 0 ? 'action.hover' : 'inherit',
                    '&:hover': { backgroundColor: 'action.selected' }
                  }}
                >
                  <TableCell>{getStatusIcon(pkg)}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {pkg.label}
                      {index === 0 && (
                        <Chip label="Current" color="primary" size="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{pkg.appVersion}</TableCell>
                  <TableCell>
                    <Typography
                      sx={{
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {pkg.description || 'No description'}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDate(pkg.uploadTime)}</TableCell>
                  <TableCell>{formatBytes(pkg.size)}</TableCell>
                  <TableCell>
                    {pkg.metrics && (
                      <Box>
                        <Typography variant="body2">Active: {pkg.metrics.active}</Typography>
                        <Typography variant="body2">Downloads: {pkg.metrics.downloaded}</Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {pkg.isMandatory && (
                        <Chip label="Mandatory" color="primary" size="small" />
                      )}
                      {pkg.isDisabled && (
                        <Chip label="Disabled" color="error" size="small" />
                      )}
                      {pkg.rollout !== null && pkg.rollout < 100 && (
                        <Chip label={`${pkg.rollout}% Rollout`} color="warning" size="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="Promote this version">
                        <IconButton
                          onClick={() => handlePromoteClick(pkg)}
                          size="small"
                        >
                          <PromoteIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Rollback to this version">
                        <IconButton
                          onClick={() => handleRollbackClick(pkg)}
                          disabled={index === 0} // Disable for the latest version
                          size="small"
                        >
                          <RollbackIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Rollback Confirmation Dialog */}
      <Dialog open={rollbackDialogOpen} onClose={() => setRollbackDialogOpen(false)}>
        <DialogTitle>Confirm Rollback</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to rollback to version {selectedVersion?.label}?
            This will create a new release with the exact same code and metadata as version {selectedVersion?.label}.
          </Typography>
          <Box mt={2}>
            <Typography variant="subtitle2" color="warning.main">
              Note: This action cannot be undone.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRollbackDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRollbackConfirm} color="primary" variant="contained">
            Rollback
          </Button>
        </DialogActions>
      </Dialog>

      {/* Promote Dialog */}
      <Dialog open={promoteDialogOpen} onClose={() => setPromoteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Promote Version {selectedVersion?.label}</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Target Deployment</InputLabel>
              <Select
                value={promoteForm.targetDeployment}
                onChange={(e) => setPromoteForm({ ...promoteForm, targetDeployment: e.target.value })}
                label="Target Deployment"
              >
                {deployments
                  .filter(d => d.name !== deploymentName)
                  .map(deployment => (
                    <MenuItem key={deployment.name} value={deployment.name}>
                      {deployment.name}
                    </MenuItem>
                  ))
                }
              </Select>
            </FormControl>

            <TextField
              fullWidth
              margin="normal"
              label="Description (optional)"
              multiline
              rows={3}
              value={promoteForm.description}
              onChange={(e) => setPromoteForm({ ...promoteForm, description: e.target.value })}
              helperText="Leave empty to use the original description"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={promoteForm.mandatory}
                  onChange={(e) => setPromoteForm({ ...promoteForm, mandatory: e.target.checked })}
                />
              }
              label="Mandatory Update"
              sx={{ mt: 2, mb: 1 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={promoteForm.disabled}
                  onChange={(e) => setPromoteForm({ ...promoteForm, disabled: e.target.checked })}
                />
              }
              label="Disabled"
              sx={{ mb: 2 }}
            />

            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography gutterBottom>
                Rollout Percentage: {promoteForm.rollout}%
              </Typography>
              <Slider
                value={promoteForm.rollout}
                onChange={(_, value) => setPromoteForm({ ...promoteForm, rollout: value as number })}
                min={1}
                max={100}
                marks={[
                  { value: 1, label: '1%' },
                  { value: 25, label: '25%' },
                  { value: 50, label: '50%' },
                  { value: 75, label: '75%' },
                  { value: 100, label: '100%' },
                ]}
                valueLabelDisplay="auto"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromoteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handlePromoteConfirm} 
            color="primary" 
            variant="contained"
            disabled={!promoteForm.targetDeployment}
          >
            Promote
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 