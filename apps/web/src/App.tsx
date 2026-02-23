import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Login } from '@/pages/Login';
import { OAuthCallback } from '@/pages/OAuthCallback';
import { Dashboard } from '@/pages/Dashboard';
import { Apps } from '@/pages/Apps';
import { Deployments } from '@/pages/Deployments';
import { Collaborators } from '@/pages/Collaborators';
import { DeploymentHistory } from '@/pages/DeploymentHistory';
import { DeploymentDetails } from '@/pages/DeploymentDetails';
import { AppTransfer } from '@/pages/AppTransfer';
import { BundlePush } from '@/pages/BundlePush';
import { Guide } from '@/pages/Guide';
import { theme } from '@/theme';

export const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/code-push/login" element={<Login />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route
          path="/code-push"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/code-push/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="apps" element={<Apps />} />
          <Route path="apps/:appName/deployments/:deploymentName/history" element={<DeploymentHistory />} />
          <Route path="apps/:appName/deployments/:deploymentName/push" element={<BundlePush />} />
          <Route path="apps/:appName/deployments/:deploymentName" element={<DeploymentDetails />} />
          <Route path="apps/:appName/collaborators/:email" element={<Collaborators />} />
          <Route path="apps/:appName/collaborators" element={<Collaborators />} />
          <Route path="apps/:appName/transfer" element={<AppTransfer />} />
          <Route path="apps/:appName/push" element={<BundlePush />} />
          <Route path="apps/:appName/deployments" element={<Deployments />} />
          <Route path="deployments" element={<Deployments />} />
          <Route path="collaborators" element={<Collaborators />} />
          <Route path="guide" element={<Guide />} />
        </Route>
        <Route path="/" element={<Navigate to="/code-push/dashboard" replace />} />
      </Routes>
    </ThemeProvider>
  );
}; 