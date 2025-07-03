import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  History as HistoryIcon,
  CloudUpload as CloudUploadIcon,
  Restore as RollbackIcon,
  Publish as PromoteIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { rollbackDeployment } from '@/utils/api';

interface DeploymentPackage {
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
}

interface DeploymentMetrics {
  active: number;
  downloaded: number;
  failed: number;
  installed: number;
}

interface Deployment {
  name: string;
  key: string;
  package?: DeploymentPackage;
  metrics?: DeploymentMetrics;
}

export const DeploymentDetails: React.FC = () => {
  const { appName, deploymentName } = useParams<{ appName: string; deploymentName: string }>();
  const navigate = useNavigate();
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [promoteForm, setPromoteForm] = useState({
    targetDeployment: '',
    description: '',
    mandatory: false,
    disabled: false,
    rollout: 100,
  });

  useEffect(() => {
    const fetchDeployment = async () => {
      if (!appName || !deploymentName) return;

      try {
        setLoading(true);
        setError(null);
        
        console.log(`Fetching deployment details for ${appName}/${deploymentName}`);
        const response = await api.get(`/apps/${appName}/deployments/${deploymentName}`);
        console.log('Deployment response:', response.data);
        
        if (!response.data.deployment) {
          throw new Error('No deployment data received');
        }

        const deploymentData = response.data.deployment;
        
        // Only fetch metrics if we have a package
        if (deploymentData.package) {
          console.log('Fetching metrics...');
          try {
            const metricsResponse = await api.get(`/apps/${appName}/deployments/${deploymentName}/metrics`);
            console.log('Metrics response:', metricsResponse.data);
            
            if (metricsResponse.data.metrics) {
              deploymentData.metrics = metricsResponse.data.metrics[deploymentData.package.label] || {
                active: 0,
                downloaded: 0,
                failed: 0,
                installed: 0,
              };
            }
          } catch (metricsError: any) {
            console.warn('Failed to fetch metrics:', metricsError);
            // Don't fail the whole request if metrics fail
            deploymentData.metrics = {
              active: 0,
              downloaded: 0,
              failed: 0,
              installed: 0,
            };
          }
        }
        
        setDeployment(deploymentData);

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
        console.error('Error fetching deployment:', error);
        console.error('Error response:', error.response);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch deployment details';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDeployment();
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

  const handleRollbackClick = () => {
    setRollbackDialogOpen(true);
  };

  const handleRollbackConfirm = async () => {
    if (!appName || !deploymentName) return;

    try {
      await rollbackDeployment(appName, deploymentName);
      toast.success('Successfully rolled back to previous version');
      setRollbackDialogOpen(false);
      // Refresh the deployment details
      window.location.reload();
    } catch (error: any) {
      const errorMessage = error.response?.status === 409
        ? (error.response?.data?.message || 'Cannot rollback: The previous version is not compatible with the current deployment.')
        : (error.response?.data?.message || error.message || 'Failed to rollback deployment');
      
      // Show specific error messages for known conflict cases
      if (error.response?.status === 409) {
        if (errorMessage.includes('already the latest')) {
          toast.error('Cannot rollback: No previous version available');
        } else if (errorMessage.includes('different app version')) {
          toast.error('Cannot rollback: Previous version has a different app version');
        } else if (errorMessage.includes('older app store version')) {
          toast.error('Cannot rollback: Cannot rollback to an older app store version');
        } else {
          toast.error(errorMessage);
        }
        // Close the dialog since there's nothing else to try in quick rollback
        setRollbackDialogOpen(false);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handlePromoteClick = () => {
    if (!deployment?.package) return;
    
    // Pre-fill form with current package data
    setPromoteForm({
      targetDeployment: '',
      description: deployment.package.description || '',
      mandatory: deployment.package.isMandatory,
      disabled: deployment.package.isDisabled,
      rollout: deployment.package.rollout || 100,
    });
    setPromoteDialogOpen(true);
  };

  const handlePromoteConfirm = async () => {
    if (!appName || !deploymentName || !promoteForm.targetDeployment) return;

    try {
      const packageInfo: any = {};
      
      // Only include changed properties
      if (promoteForm.description !== deployment?.package?.description) {
        packageInfo.description = promoteForm.description;
      }
      if (promoteForm.mandatory !== deployment?.package?.isMandatory) {
        packageInfo.isMandatory = promoteForm.mandatory;
      }
      if (promoteForm.disabled !== deployment?.package?.isDisabled) {
        packageInfo.isDisabled = promoteForm.disabled;
      }
      if (promoteForm.rollout !== (deployment?.package?.rollout || 100)) {
        packageInfo.rollout = promoteForm.rollout;
      }

      await api.post(
        `/apps/${appName}/deployments/${deploymentName}/promote/${promoteForm.targetDeployment}`,
        packageInfo
      );

      toast.success(`Successfully promoted to ${promoteForm.targetDeployment}`);
      setPromoteDialogOpen(false);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to promote deployment';
      toast.error(errorMessage);
    }
  };

  const handleDeleteClick = () => {
    setDeleteConfirmationText('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!appName || !deploymentName) return;

    try {
      await api.delete(`/apps/${appName}/deployments/${deploymentName}`);
      toast.success(`Successfully deleted deployment "${deploymentName}"`);
      setDeleteDialogOpen(false);
      // Navigate back to the deployments list for this app
      navigate(`/code-push/apps/${appName}/deployments`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete deployment';
      toast.error(errorMessage);
      console.error('Delete deployment error:', error);
    }
  };

  if (!appName || !deploymentName) {
    return (
      <Box p={3}>
        <Alert severity="error">Invalid URL parameters</Alert>
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
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={() => navigate(`/code-push/apps/${appName}/deployments/${deploymentName}/push`)}
        >
          Push First Bundle
        </Button>
      </Box>
    );
  }

  if (!deployment) {
    return (
      <Box p={3}>
        <Alert severity="info" sx={{ mb: 2 }}>
          No deployment found. You can create one by pushing a bundle.
        </Alert>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={() => navigate(`/code-push/apps/${appName}/deployments/${deploymentName}/push`)}
        >
          Push First Bundle
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          {deploymentName} - {appName}
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<PromoteIcon />}
            onClick={handlePromoteClick}
            disabled={!deployment?.package}
          >
            Promote
          </Button>
          <Button
            variant="outlined"
            startIcon={<RollbackIcon />}
            onClick={handleRollbackClick}
            disabled={!deployment?.package}
          >
            Quick Rollback
          </Button>
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            component={RouterLink}
            to={`/code-push/apps/${appName}/deployments/${deploymentName}/history`}
          >
            View History
          </Button>
          {/* <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteClick}
          >
            Delete Deployment
          </Button> */}
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => navigate(`/code-push/apps/${appName}/deployments/${deploymentName}/push`)}
          >
            Push New Bundle
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Current Release
            </Typography>
            {deployment.package ? (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    App Version
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {deployment.package.appVersion}
                  </Typography>

                  <Typography variant="subtitle2" color="text.secondary">
                    Label
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {deployment.package.label}
                  </Typography>

                  <Typography variant="subtitle2" color="text.secondary">
                    Release Time
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formatDate(deployment.package.uploadTime)}
                  </Typography>

                  <Typography variant="subtitle2" color="text.secondary">
                    Size
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formatBytes(deployment.package.size)}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {deployment.package.description || 'No description'}
                  </Typography>

                  <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                    {deployment.package.isMandatory && (
                      <Chip label="Mandatory" color="primary" />
                    )}
                    {deployment.package.isDisabled && (
                      <Chip label="Disabled" color="error" />
                    )}
                    {deployment.package.rollout !== null && deployment.package.rollout < 100 && (
                      <Chip label={`${deployment.package.rollout}% Rollout`} color="warning" />
                    )}
                  </Box>
                </Grid>

                {deployment.metrics && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Metrics
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h4">{deployment.metrics.active}</Typography>
                          <Typography color="text.secondary">Active</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h4">{deployment.metrics.downloaded}</Typography>
                          <Typography color="text.secondary">Downloads</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h4">{deployment.metrics.installed}</Typography>
                          <Typography color="text.secondary">Installed</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h4" color="error.main">
                            {deployment.metrics.failed}
                          </Typography>
                          <Typography color="text.secondary">Failed</Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Grid>
                )}
              </Grid>
            ) : (
              <Alert severity="info" sx={{ mb: 2 }}>
                No release has been made to this deployment yet. Push your first bundle to get started.
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Rollback Confirmation Dialog */}
      <Dialog open={rollbackDialogOpen} onClose={() => setRollbackDialogOpen(false)}>
        <DialogTitle>Confirm Quick Rollback</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to rollback to the previous version?
            This will create a new release with the exact same code and metadata as the previous version.
          </Typography>
          <Box mt={2}>
            <Typography variant="subtitle2" color="warning.main">
              Note: This action cannot be undone. For more control over which version to roll back to, use the deployment history page.
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
        <DialogTitle>Promote to Another Environment</DialogTitle>
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
              helperText="Leave empty to use the current description"
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
            Are you sure you want to permanently delete the deployment <strong>"{deploymentName}"</strong>?
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
            Please type the deployment name <strong>"{deploymentName}"</strong> to confirm:
          </Typography>
          <TextField
            fullWidth
            margin="normal"
            placeholder={deploymentName}
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
            disabled={deleteConfirmationText !== deploymentName}
          >
            Delete Deployment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 