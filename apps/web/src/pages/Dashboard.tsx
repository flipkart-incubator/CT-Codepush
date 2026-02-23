import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  useTheme,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Apps as AppsIcon,
  CloudUpload as CloudUploadIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '@/utils/api';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  onClick: () => void;
  isLoading: boolean;
}

interface DashboardStats {
  totalApps: number;
  totalDeployments: number;
  totalCollaborators: number;
}

interface AppStats {
  deployments: number;
  collaborators: number;
  activeDeployments: number;
  totalDownloads: number;
}

interface Deployment {
  package?: {
    isDisabled: boolean;
  };
  metrics?: {
    downloaded: number;
  };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, onClick, isLoading }) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        cursor: 'pointer',
        backgroundColor: theme.palette.background.paper,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        '&:hover': {
          backgroundColor: '#1F2937',
          transform: 'translateY(-4px)',
        },
        transition: 'all 0.3s ease',
        height: '100%',
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" color="text.secondary">
            {title}
          </Typography>
          {React.cloneElement(icon as React.ReactElement, {
            sx: { fontSize: 32, color: theme.palette.primary.main },
          })}
        </Box>
        {isLoading ? (
          <CircularProgress size={24} />
        ) : (
          <Typography variant="h4" component="div" fontWeight="bold">
            {value}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<string>('');
  const [apps, setApps] = useState<Array<{ name: string }>>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalApps: 0,
    totalDeployments: 0,
    totalCollaborators: 0,
  });
  const [appStats, setAppStats] = useState<AppStats>({
    deployments: 0,
    collaborators: 0,
    activeDeployments: 0,
    totalDownloads: 0,
  });
  const [appLoading, setAppLoading] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch apps
      const appsResponse = await api.get<{ apps: Array<{ name: string; deployments: string[]; collaborators: Record<string, any> }> }>('/apps');
      const appsData = appsResponse.data.apps;
      setApps(appsData);
      
      // Calculate total deployments and collaborators from apps
      const totalDeployments = appsData.reduce((sum, app) => sum + (app.deployments?.length || 0), 0);
      const totalCollaborators = appsData.reduce((sum, app) => sum + Object.keys(app.collaborators || {}).length, 0);
      
      setStats({
        totalApps: appsData.length,
        totalDeployments,
        totalCollaborators,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch dashboard statistics';
      console.error('Error fetching dashboard stats:', error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppStats = async (appName: string) => {
    if (!appName) return;

    try {
      setAppLoading(true);
      
      // Fetch app details
      const appResponse = await api.get(`/apps/${appName}`);
      const app = appResponse.data.app;
      
      // Fetch deployments
      const deploymentsResponse = await api.get<{ deployments: Deployment[] }>(`/apps/${appName}/deployments`);
      const deployments = deploymentsResponse.data.deployments;
      
      // Calculate active deployments and total downloads
      const activeDeployments = deployments.filter((d: Deployment) => d.package && !d.package.isDisabled).length;
      const totalDownloads = deployments.reduce((sum: number, d: Deployment) => {
        if (d.metrics) {
          return sum + (d.metrics.downloaded || 0);
        }
        return sum;
      }, 0);

      setAppStats({
        deployments: deployments.length,
        collaborators: Object.keys(app.collaborators || {}).length,
        activeDeployments,
        totalDownloads,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch app statistics';
      console.error('Error fetching app stats:', error);
      toast.error(errorMessage);
    } finally {
      setAppLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (selectedApp) {
      fetchAppStats(selectedApp);
    } else {
      setAppStats({
        deployments: 0,
        collaborators: 0,
        activeDeployments: 0,
        totalDownloads: 0,
      });
    }
  }, [selectedApp]);

  const theme = useTheme();

  const getStatCards = () => {
    if (!selectedApp) {
      return [
        {
          title: 'Total Apps',
          value: stats.totalApps,
          icon: <AppsIcon />,
          path: '/code-push/apps',
        },
        {
          title: 'Total Deployments',
          value: stats.totalDeployments,
          icon: <CloudUploadIcon />,
          path: '/code-push/deployments',
        },
        {
          title: 'Total Collaborators',
          value: stats.totalCollaborators,
          icon: <GroupIcon />,
          path: '/code-push/apps',
        },
      ];
    }

    return [
      {
        title: 'Deployments',
        value: appStats.deployments,
        icon: <CloudUploadIcon />,
        path: `/code-push/apps/${selectedApp}/deployments`,
      },
      {
        title: 'Active Deployments',
        value: appStats.activeDeployments,
        icon: <CloudUploadIcon />,
        path: `/code-push/apps/${selectedApp}/deployments`,
      },
      {
        title: 'Total Downloads',
        value: appStats.totalDownloads,
        icon: <CloudUploadIcon />,
        path: `/code-push/apps/${selectedApp}/deployments`,
      },
      {
        title: 'Collaborators',
        value: appStats.collaborators,
        icon: <GroupIcon />,
        path: `/code-push/apps/${selectedApp}/collaborators`,
      },
    ];
  };

  return (
    <Box sx={{ py: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" sx={{ color: 'text.primary' }}>
          {selectedApp ? `${selectedApp} Dashboard` : 'CodePush Dashboard'}
        </Typography>
        <Box sx={{ minWidth: 200 }}>
          <FormControl fullWidth>
            <InputLabel id="app-select-label">Select App</InputLabel>
            <Select
              labelId="app-select-label"
              value={selectedApp}
              label="Select App"
              onChange={(e) => setSelectedApp(e.target.value)}
              sx={{
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.palette.primary.main,
                },
                '& .MuiSelect-icon': {
                  color: theme.palette.text.secondary,
                },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: theme.palette.background.paper,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  },
                },
              }}
            >
              <MenuItem value="">
                <em>All Apps</em>
              </MenuItem>
              {apps.map((app) => (
                <MenuItem key={app.name} value={app.name}>
                  {app.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {getStatCards().map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.title}>
            <StatCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              onClick={() => navigate(stat.path)}
              isLoading={selectedApp ? appLoading : loading}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}; 