import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  useTheme,
  Collapse,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Apps as AppsIcon,
  CloudUpload as DeploymentsIcon,
  Group as GroupIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
  History as HistoryIcon,
  Publish as PromoteIcon,
} from '@mui/icons-material';

interface GuideSection {
  title: string;
  icon: React.ReactNode;
  content: string[];
  subsections?: {
    title: string;
    content: string[];
  }[];
}

const guideContent: GuideSection[] = [
  {
    title: 'Dashboard Overview',
    icon: <DashboardIcon />,
    content: [
      'The dashboard provides a comprehensive view of your CodePush deployment statistics.',
      'View total number of apps, deployments, and collaborators.',
      'Select specific apps to view their detailed statistics.',
      'Monitor active deployments and total downloads across all apps.',
    ],
  },
  {
    title: 'Managing Apps',
    icon: <AppsIcon />,
    content: [
      'Create and manage your CodePush applications.',
      'View app details including description and deployment statistics.',
      'Transfer app ownership to other developers.',
    ],
    subsections: [
      {
        title: 'Creating an App',
        content: [
          'Click "Add App" button in the Apps page.',
          'Enter app name and optional description.',
          'App names must be unique within your account.',
        ],
      },
      {
        title: 'Transferring Ownership',
        content: [
          'Open the app\'s menu and select "Transfer Ownership".',
          'Enter the email of the new owner.',
          'The new owner must have a CodePush account.',
        ],
      },
    ],
  },
  {
    title: 'Deployments',
    icon: <DeploymentsIcon />,
    content: [
      'Manage deployment environments for your apps.',
      'Create multiple deployments (e.g., Staging, Production).',
      'View deployment keys and release history.',
    ],
    subsections: [
      {
        title: 'Creating Deployments',
        content: [
          'Select an app from the deployments page.',
          'Click "New Deployment" button.',
          'Enter deployment name (e.g., Staging, Production).',
        ],
      },
      {
        title: 'Managing Releases',
        content: [
          'Upload new releases to specific deployments.',
          'View release history and metrics.',
          'Roll back to previous versions if needed.',
          'Promote releases between deployments.',
        ],
      },
    ],
  },
  {
    title: 'Collaborators',
    icon: <GroupIcon />,
    content: [
      'Manage access to your apps by adding collaborators.',
      'View all collaborators across your apps.',
      'Control permissions for each collaborator.',
    ],
    subsections: [
      {
        title: 'Adding Collaborators',
        content: [
          'Navigate to app\'s collaborators page.',
          'Click "Add Collaborator" button.',
          'Enter collaborator\'s email address.',
          'Collaborators must have a CodePush account.',
        ],
      },
      {
        title: 'Permissions',
        content: [
          'Collaborators can release updates to deployments.',
          'Collaborators can promote releases between deployments.',
          'Collaborators can roll back to previous versions.',
          'Collaborators can view release history and metrics.',
          'Only owners can add/remove other collaborators.',
        ],
      },
    ],
  },
  {
    title: 'Release Management',
    icon: <HistoryIcon />,
    content: [
      'Track and manage your app releases.',
      'View release history and metrics.',
      'Roll back to previous versions.',
      'Promote releases between environments.',
    ],
    subsections: [
      {
        title: 'Releasing Updates',
        content: [
          'Select a deployment to release to.',
          'Upload your bundle and specify version info.',
          'Add release notes and description.',
          'Control rollout percentage for gradual releases.',
        ],
      },
      {
        title: 'Rollback',
        content: [
          'View deployment history.',
          'Select a previous release.',
          'Confirm rollback action.',
          'Monitor rollback status.',
        ],
      },
    ],
  },
  {
    title: 'Promoting Releases',
    icon: <PromoteIcon />,
    content: [
      'Promote releases from one environment to another (e.g., Staging to Production).',
      'Maintain release integrity while allowing property customization.',
      'Promote current releases or specific versions from history.',
      'Control deployment properties during promotion.',
    ],
    subsections: [
      {
        title: 'Promoting Current Release',
        content: [
          'Navigate to the deployment details page.',
          'Click the "Promote" button next to other action buttons.',
          'Select the target deployment from the dropdown.',
          'Customize description, mandatory flag, disabled state, and rollout percentage.',
          'Click "Promote" to create the release in the target environment.',
        ],
      },
      {
        title: 'Promoting from History',
        content: [
          'Go to the deployment history page.',
          'Find the version you want to promote.',
          'Click the promote icon (📤) next to the version.',
          'Select target deployment and customize properties.',
          'Confirm promotion to deploy the selected version.',
        ],
      },
      {
        title: 'Promotion Options',
        content: [
          'Target Deployment: Choose which environment to promote to.',
          'Description: Override or keep the original release description.',
          'Mandatory Update: Control whether the promoted release is mandatory.',
          'Disabled State: Set whether the promoted release is initially disabled.',
          'Rollout Percentage: Control the percentage of users who receive the update (1-100%).',
        ],
      },
      {
        title: 'Common Use Cases',
        content: [
          'Staging to Production: Test releases in staging before promoting to production.',
          'Hotfix Deployment: Quickly promote critical fixes across environments.',
          'Gradual Rollout: Promote with reduced rollout percentage for safer deployments.',
          'Version Recovery: Promote a previous stable version to recover from issues.',
        ],
      },
    ],
  },
];

export const Guide: React.FC = () => {
  const theme = useTheme();
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  const toggleSection = (title: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        CodePush Dashboard Guide
      </Typography>
      <Typography variant="body1" paragraph color="text.secondary">
        Welcome to the CodePush Dashboard! This guide will help you understand how to use all the features
        available in the dashboard to manage your app deployments effectively.
      </Typography>

      <List component={Paper} sx={{ mt: 3 }}>
        {guideContent.map((section, index) => (
          <React.Fragment key={section.title}>
            {index > 0 && <Divider />}
            <ListItem
              button
              onClick={() => toggleSection(section.title)}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(59, 130, 246, 0.05)',
                },
              }}
            >
              <ListItemIcon sx={{ color: theme.palette.primary.main }}>
                {section.icon}
              </ListItemIcon>
              <ListItemText
                primary={section.title}
                secondary={!expandedSections[section.title] && section.content[0]}
                primaryTypographyProps={{
                  variant: 'h6',
                  sx: { color: theme.palette.text.primary },
                }}
                secondaryTypographyProps={{
                  sx: { color: theme.palette.text.secondary },
                }}
              />
              {expandedSections[section.title] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItem>
            <Collapse in={expandedSections[section.title]}>
              <Box sx={{ pl: 9, pr: 4, pb: 3, pt: 1 }}>
                {section.content.map((text, i) => (
                  <Typography
                    key={i}
                    variant="body1"
                    paragraph={i < section.content.length - 1}
                    color="text.secondary"
                  >
                    {text}
                  </Typography>
                ))}
                {section.subsections && (
                  <List disablePadding>
                    {section.subsections.map((subsection) => (
                      <ListItem key={subsection.title} sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 2 }}>
                        <Typography
                          variant="subtitle1"
                          gutterBottom
                          sx={{ color: theme.palette.text.primary, fontWeight: 500 }}
                        >
                          {subsection.title}
                        </Typography>
                        <List disablePadding sx={{ width: '100%' }}>
                          {subsection.content.map((text, i) => (
                            <ListItem key={i} sx={{ py: 0.5 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <InfoIcon fontSize="small" color="action" />
                              </ListItemIcon>
                              <ListItemText
                                primary={text}
                                primaryTypographyProps={{
                                  variant: 'body2',
                                  sx: { color: theme.palette.text.secondary },
                                }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </Collapse>
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
}; 