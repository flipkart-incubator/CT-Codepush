import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  CircularProgress,
  Alert,
  FormControlLabel,
  Checkbox,
  Grid,
  SelectChangeEvent,
  ToggleButtonGroup,
  ToggleButton,
  styled,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Link as LinkIcon,
  Upload as UploadIcon,
  FileUpload as FileUploadIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '@/utils/api';

interface BundlePushForm {
  appVersion: string;
  description: string;
  environment: string;
  isMandatory: boolean;
  rollout: number;
  bundleFile: File | null;
  bundleUrl: string;
  uploadMethod: 'file' | 'url';
}

const DropZone = styled(Box)<{ isDragActive: boolean; hasFile: boolean }>(({ theme, isDragActive, hasFile }) => ({
  border: `2px dashed ${
    isDragActive 
      ? theme.palette.primary.main 
      : hasFile 
        ? theme.palette.success.main 
        : theme.palette.grey[300]
  }`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(4),
  textAlign: 'center',
  backgroundColor: isDragActive 
    ? theme.palette.primary.main + '08' 
    : hasFile 
      ? theme.palette.success.main + '08' 
      : theme.palette.grey[50],
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: isDragActive 
      ? theme.palette.primary.main + '12' 
      : hasFile 
        ? theme.palette.success.main + '12' 
        : theme.palette.grey[100],
    borderColor: isDragActive 
      ? theme.palette.primary.main 
      : hasFile 
        ? theme.palette.success.main 
        : theme.palette.grey[400],
  },
}));

export const BundlePush: React.FC = () => {
  const { appName, deploymentName } = useParams<{ appName: string; deploymentName: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [environments, setEnvironments] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState<BundlePushForm>({
    appVersion: '',
    description: '',
    environment: deploymentName || '',
    isMandatory: false,
    rollout: 100,
    bundleFile: null,
    bundleUrl: '',
    uploadMethod: 'file',
  });

  useEffect(() => {
    const fetchEnvironments = async () => {
      if (!appName) return;

      try {
        const response = await api.get(`/apps/${appName}/deployments`);
        const deployments = response.data.deployments;
        const envs = deployments.map((dep: any) => dep.name);
        setEnvironments(envs);
        
        // Only set the environment if it's not already set by the URL parameter
        if (!deploymentName && envs.length > 0) {
          setForm(prev => ({ ...prev, environment: envs[0] }));
        }
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch environments';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    };

    fetchEnvironments();
  }, [appName, deploymentName]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (validateFileType(file)) {
        setForm(prev => ({ ...prev, bundleFile: file }));
      } else {
        toast.error('Please select a valid bundle file (.zip, .bundle, or .jsbundle)');
        // Clear the input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const validateFileType = (file: File): boolean => {
    const validTypes = ['.zip', '.bundle', '.jsbundle'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    return validTypes.includes(fileExtension) || file.type === 'application/zip';
  };

  const handleFileDrop = (files: FileList) => {
    if (files.length > 0) {
      const file = files[0];
      if (validateFileType(file)) {
        setForm(prev => ({ ...prev, bundleFile: file }));
      } else {
        toast.error('Please select a valid bundle file (.zip, .bundle, or .jsbundle)');
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);
    if (dragCounter === 1) {
      setIsDragActive(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setDragCounter(0);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileDrop(e.dataTransfer.files);
    }
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleEnvironmentChange = (event: SelectChangeEvent) => {
    const newEnvironment = event.target.value;
    setForm(prev => ({ ...prev, environment: newEnvironment }));
    
    // Update URL to match selected environment
    if (appName) {
      navigate(`/code-push/apps/${appName}/deployments/${newEnvironment}/push`);
    }
  };

  const handleUploadMethodChange = (
    event: React.MouseEvent<HTMLElement>,
    newMethod: 'file' | 'url',
  ) => {
    if (newMethod !== null) {
      setForm(prev => ({
        ...prev,
        uploadMethod: newMethod,
        // Clear the other method's value
        bundleFile: newMethod === 'url' ? null : prev.bundleFile,
        bundleUrl: newMethod === 'file' ? '' : prev.bundleUrl,
      }));
    }
  };

  const downloadFileFromUrl = async (url: string): Promise<File> => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to download file');
      
      const blob = await response.blob();
      const filename = url.split('/').pop() || 'bundle.zip';
      return new File([blob], filename, { type: blob.type });
    } catch (error: any) {
      throw new Error(`Failed to download file from URL: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validate based on upload method
    if (form.uploadMethod === 'file' && !form.bundleFile) {
      toast.error('Please select a bundle file');
      return;
    }
    if (form.uploadMethod === 'url' && !form.bundleUrl) {
      toast.error('Please enter a bundle URL');
      return;
    }

    // Validate appVersion format (semver)
    const semverRegex = /^\d+\.\d+\.\d+$/;
    if (!semverRegex.test(form.appVersion)) {
      toast.error('App version must be in semver format (e.g., 1.0.0)');
      return;
    }

    // Validate rollout value
    if (form.rollout < 1 || form.rollout > 100) {
      toast.error('Rollout percentage must be between 1 and 100');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let fileToUpload: File | null = null;

      // Get the file either from direct upload or URL
      if (form.uploadMethod === 'file') {
        fileToUpload = form.bundleFile;
      } else {
        try {
          fileToUpload = await downloadFileFromUrl(form.bundleUrl);
        } catch (error: any) {
          toast.error(error?.message || 'Failed to download file');
          setLoading(false);
          return;
        }
      }

      if (!fileToUpload) {
        toast.error('No file to upload');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('package', fileToUpload);

      // Ensure numeric values are sent as numbers
      formData.append('packageInfo', JSON.stringify({
        appVersion: form.appVersion,
        description: form.description || '',
        isMandatory: form.isMandatory,
        rollout: parseInt(form.rollout.toString(), 10)
      }));

      const response = await api.post(
        `/apps/${appName}/deployments/${form.environment}/release`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.status === 201) {
        toast.success('Bundle pushed successfully');
        navigate(`/code-push/apps/${appName}/deployments/${form.environment}`);
      } else {
        throw new Error('Unexpected response status: ' + response.status);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to push bundle';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Bundle push error:', error.response?.data || error);
    } finally {
      setLoading(false);
    }
  };

  if (!appName) {
    return (
      <Box p={3}>
        <Alert severity="error">No app selected</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Push Bundle - {appName}
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <ToggleButtonGroup
                value={form.uploadMethod}
                exclusive
                onChange={handleUploadMethodChange}
                aria-label="bundle upload method"
                fullWidth
              >
                <ToggleButton value="file" aria-label="upload file">
                  <UploadIcon sx={{ mr: 1 }} />
                  Upload File
                </ToggleButton>
                <ToggleButton value="url" aria-label="use url">
                  <LinkIcon sx={{ mr: 1 }} />
                  Use URL
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Environment</InputLabel>
                <Select
                  value={form.environment}
                  onChange={handleEnvironmentChange}
                  label="Environment"
                  required
                  disabled={!!deploymentName}
                >
                  {environments.map((env) => (
                    <MenuItem key={env} value={env}>
                      {env}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="App Version"
                name="appVersion"
                value={form.appVersion}
                onChange={handleInputChange}
                required
                placeholder="1.0.0"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={form.description}
                onChange={handleInputChange}
                multiline
                rows={3}
                required
                placeholder="What's new in this release?"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Rollout Percentage"
                name="rollout"
                type="number"
                value={form.rollout}
                onChange={handleInputChange}
                inputProps={{ min: 1, max: 100 }}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.isMandatory}
                    onChange={handleInputChange}
                    name="isMandatory"
                  />
                }
                label="Mandatory Update"
              />
            </Grid>

            <Grid item xs={12}>
              {form.uploadMethod === 'file' ? (
                <>
                  <DropZone
                    isDragActive={isDragActive}
                    hasFile={!!form.bundleFile}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={handleDropZoneClick}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".zip,.bundle,.jsbundle"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                    
                    {isDragActive ? (
                      <>
                        <FileUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                        <Typography variant="h6" color="primary.main" gutterBottom>
                          Drop your bundle file here
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Release the file to upload
                        </Typography>
                      </>
                    ) : form.bundleFile ? (
                      <>
                        <CloudUploadIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                        <Typography variant="h6" color="success.main" gutterBottom>
                          File Selected
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>
                          {form.bundleFile.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {(form.bundleFile.size / 1024 / 1024).toFixed(2)} MB
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Click to select a different file or drag and drop to replace
                        </Typography>
                      </>
                    ) : (
                      <>
                        <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                          Drag and drop your bundle file here
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                          or click to browse files
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Supports .zip, .bundle, and .jsbundle files
                        </Typography>
                      </>
                    )}
                  </DropZone>
                </>
              ) : (
                <TextField
                  fullWidth
                  label="Bundle URL"
                  name="bundleUrl"
                  value={form.bundleUrl}
                  onChange={handleInputChange}
                  placeholder="https://example.com/path/to/bundle.zip"
                  required
                />
              )}
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
              >
                {loading ? 'Pushing Bundle...' : 'Push Bundle'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
}; 