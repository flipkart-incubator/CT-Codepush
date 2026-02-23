import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';

export const OAuthCallback = () => {
  const [isProcessing, setIsProcessing] = useState(true);
  const { getAccessKeyAfterOAuth, checkAuthStatus } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get the access key and redirect URL from the server
        const { redirectUrl } = await getAccessKeyAfterOAuth();
        
        // Verify the access key works
        await checkAuthStatus();
        
        toast.success('Successfully logged in');
        // Use the redirect URL from the response
        navigate(redirectUrl, { replace: true });
      } catch (error) {
        console.error('OAuth callback failed:', error);
        toast.error('Failed to complete login. Please try again.');
        navigate('/code-push/login', { replace: true });
      } finally {
        setIsProcessing(false);
      }
    };

    handleOAuthCallback();
  }, [getAccessKeyAfterOAuth, checkAuthStatus, navigate]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="h6">
        {isProcessing ? 'Completing login...' : 'Redirecting...'}
      </Typography>
    </Box>
  );
}; 