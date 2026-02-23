import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '@/utils/api';



export const AppTransfer: React.FC = () => {
  const { appName } = useParams<{ appName: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [transferEmail, setTransferEmail] = useState('');

  const handleTransfer = async () => {
    if (!appName || !transferEmail) {
      setError('Please provide an email address');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.post(`/apps/${appName}/transfer/${transferEmail}`);

      toast.success(`App "${appName}" transferred successfully to ${transferEmail}`);
      navigate('/code-push/apps');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to transfer app';
      console.error('Error transferring app:', error);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  const handleConfirmOpen = () => {
    if (!transferEmail) {
      setError('Please provide an email address');
      return;
    }
    setError(null);
    setConfirmOpen(true);
  };

  const handleConfirmClose = () => {
    setConfirmOpen(false);
  };

  if (!appName) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Invalid URL. Please select an app to transfer.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Transfer App: {appName}
      </Typography>

      <Paper sx={{ p: 3, mt: 3, maxWidth: 600 }}>
        <Typography variant="body1" color="text.secondary" paragraph>
          Transfer this app to another account. The new owner will have full control over the app and its deployments.
          This action cannot be undone.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <FormControl fullWidth sx={{ mb: 3 }}>
          <TextField
            label="Recipient Email"
            value={transferEmail}
            onChange={(e) => setTransferEmail(e.target.value)}
            placeholder="Enter the email address of the new owner"
            disabled={loading}
            error={!!error}
          />
        </FormControl>

        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmOpen}
            disabled={loading || !transferEmail}
          >
            {loading ? <CircularProgress size={24} /> : 'Transfer App'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate(`/code-push/apps`)}
          >
            Cancel
          </Button>
        </Box>
      </Paper>

      <Dialog open={confirmOpen} onClose={handleConfirmClose}>
        <DialogTitle>Confirm App Transfer</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to transfer "{appName}" to {transferEmail}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmClose}>Cancel</Button>
          <Button onClick={handleTransfer} color="error" variant="contained">
            Transfer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 