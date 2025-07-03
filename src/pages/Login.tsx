import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Stack,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '@/contexts/AuthContext';

export const Login = () => {
  const [isLoading] = useState(false);
  const { login, register } = useAuth();

  // Set cookie to indicate this is a web request
  useEffect(() => {
    document.cookie = 'isWebRequest=true; path=/; max-age=3600'; // 1 hour expiry
  }, []);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            Welcome to CodePush
          </Typography>

          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={<GoogleIcon />}
              onClick={login}
              disabled={isLoading}
            >
              Sign in with Google
            </Button>

            <Button
              variant="outlined"
              size="large"
              startIcon={<GoogleIcon />}
              onClick={register}
              disabled={isLoading}
            >
              Register with Google
            </Button>

            {/* <Divider>Or</Divider> */}

            {/* <form onSubmit={handleAccessKeyLogin}>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Access Key"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  disabled={isLoading}
                  placeholder="Enter your access key"
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  startIcon={<KeyIcon />}
                  disabled={isLoading}
                >
                  Sign in with Access Key
                </Button>
              </Stack>
            </form> */}
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}; 