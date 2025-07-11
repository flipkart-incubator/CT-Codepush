# Visual Studio App Center CodePush Standalone Version

[CodePush](https://learn.microsoft.com/en-us/appcenter/distribution/codepush/) is an App Center feature that enables React Native developers to deploy mobile app updates directly to their users' devices. It consists of two parts: CodePush Server where developers can publish app updates to (e.g. JS, HTML, CSS or image changes), and [CodePush React Native Client SDK](https://github.com/Microsoft/react-native-code-push) that enables querying for updates from within an app.

We announced that Visual Studio App Center will be retired on March 31, 2025. You can learn more about the support timeline and alternatives on https://aka.ms/appcenter/retire. In order to let developers keep using CodePush functionality after App Center is fully retired, we created a standalone version of CodePush Server that can be deployed and used independently from App Center itself. Code of this standalone version can be found in this repository. It is fully compatible with [CodePush React Native Client SDK](https://github.com/Microsoft/react-native-code-push).


## Getting Started

### CodePush Server

The CodePush server, located in the `api` subdirectory, allows developers to build, deploy and manage CodePush updates themselves.
For detailed information about the CodePush server, including installation instructions and usage details, please refer to the [CodePush Server README](./api/README.md).


### CodePush CLI

The CodePush CLI, located in `cli` subdirectory, is a command-line tool that allows developers to interact with the CodePush server. For detailed information about the CodePush CLI, including installation instructions and usage details, please refer to the [CodePush CLI README](./cli/README.md).


## Contributing

While we cannot accept contributions or issues in this repository; however, as a permissively licensed open-source project, it is ready for community development and forks independently.


## Support

This code is provided "as is", because of that Microsoft will not provide support services for it.


## Legal Notice

Microsoft grants you access to the code in this repository under the MIT License, see the [LICENSE](./LICENSE) to learn more.

Microsoft, Windows, Microsoft Azure and/or other Microsoft products and services referenced in the documentation may be either trademarks or registered trademarks of Microsoft in the United States and/or other countries. The license for this code does not grant you rights to use any Microsoft names, logos, or trademarks. Go to [Microsoft Trademark and Brand Guidelines](http://go.microsoft.com/fwlink/?LinkID=254653) for more information.

Privacy information can be found at https://privacy.microsoft.com/.

# CodePush Web UI

A modern web interface for managing CodePush applications, deployments, access keys, and collaborators.

## Features

- Google OAuth authentication
- Dashboard with key metrics
- App management
- Deployment tracking and creation
- Access key management
- Collaborator management
- Modern, responsive UI built with Material-UI
- TypeScript for type safety

## Prerequisites

- Node.js 16 or later
- npm or yarn
- Access to ${domain} API server

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd codepush-web-ui
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
VITE_API_URL=https://${domain}
```

4. Start the development server:
```bash
npm run dev
```

The application will start on port 3000 and will proxy API requests to ${domain}.

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
  ├── components/     # Reusable UI components
  ├── contexts/      # React contexts (auth, etc.)
  ├── pages/         # Page components
  ├── App.tsx        # Main app component
  └── main.tsx       # Entry point
```

## Authentication

The application uses Google OAuth for authentication. The authentication is handled by the ${domain} server.

## API Integration

The application uses the following API endpoints from ${domain}:

- `/auth/login/google` - Google OAuth login
- `/auth/logout` - Logout
- `/api/user/profile` - Get current user profile
- `/api/apps` - App management
- `/api/deployments` - Deployment management
- `/api/access-keys` - Access key management
- `/api/collaborators` - Collaborator management

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

# CodePush Dashboard

A modern, feature-rich web dashboard for Microsoft CodePush, built with React, TypeScript, and Material-UI. This dashboard provides a comprehensive interface for managing mobile app deployments, collaborators, and releases.

## 🚀 Features

### Authentication & Security
- **Google OAuth Integration**: Secure login and registration using Google accounts
- **Access Key Authentication**: Support for CodePush access keys
- **Protected Routes**: Authenticated access control for all dashboard features
- **Automatic Session Management**: Seamless token handling and renewal

### App Management
- **Create & Configure Apps**: Add new mobile applications to CodePush
- **App Overview Dashboard**: View app statistics, deployments, and collaborators
- **App Transfer**: Transfer ownership of applications between accounts
- **App Deletion**: Remove applications with confirmation dialogs

### Deployment Management
- **Multiple Deployment Environments**: Support for staging, production, and custom deployments
- **Create Deployments**: Set up new deployment environments for your apps
- **Deployment Statistics**: View active installations, downloads, and metrics
- **Deployment Keys**: Manage and copy deployment keys for client integration
- **Delete Deployments**: Remove deployments with confirmation safeguards

### Release & Bundle Management
- **Bundle Upload**: Upload app bundles via file upload or URL
- **Drag & Drop Interface**: Modern file upload with drag-and-drop support
- **Release Configuration**: Set app versions, descriptions, and release notes
- **Mandatory Updates**: Mark releases as mandatory for forced updates
- **Rollout Percentage**: Gradual rollout with percentage-based deployment
- **Release History**: Complete history of all deployments and releases

### Advanced Deployment Features
- **Promote Releases**: Promote releases between environments (staging → production)
- **Rollback Capability**: Quick rollback to previous stable releases
- **Release Metrics**: Track download success, failures, and active installations
- **Conditional Releases**: Target specific app versions and user segments

### Collaboration & Team Management
- **Add Collaborators**: Invite team members to manage apps
- **Permission Management**: Owner and Collaborator role-based access
- **Global Collaborator View**: Overview of all collaborators across apps
- **Collaborator Removal**: Remove team members from applications

### User Interface & Experience
- **Dark Theme**: Modern dark theme with customizable colors
- **Responsive Design**: Mobile-friendly interface that works on all devices
- **Interactive Dashboard**: Quick navigation with statistics cards
- **Real-time Notifications**: Toast notifications for all actions
- **Loading States**: Smooth loading indicators for better UX
- **Error Handling**: Comprehensive error messages and recovery options

### Data Visualization & Reporting
- **Statistics Dashboard**: Overview of apps, deployments, and collaborators
- **Deployment History**: Detailed timeline of all releases
- **Metrics Tracking**: Monitor download rates, success rates, and user adoption
- **Filter & Search**: Find specific deployments and releases quickly

### Developer Tools & Integration
- **API Integration**: Full integration with CodePush REST API
- **Export Capabilities**: Copy deployment keys and configuration
- **Debug Information**: Detailed logging for troubleshooting
- **Development Guide**: Built-in guide for using all features

## 🛠️ Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) v5
- **Routing**: React Router v6
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Notifications**: React Toastify
- **Authentication**: Google OAuth 2.0
- **Build Tool**: Vite
- **Styling**: Emotion CSS-in-JS

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ct-code-push
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Configure the following variables in `.env`:
```env
VITE_API_URL=https://your-codepush-server.com/api
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open your browser and navigate to `http://localhost:5173`

## 🔧 Configuration

### Environment Variables
- `VITE_API_URL`: URL of your CodePush server API endpoint

### Authentication Setup
The application requires a CodePush server with Google OAuth configured. Ensure your server supports:
- `/auth/login/google` - Google OAuth login endpoint
- `/auth/register/google` - Google OAuth registration endpoint
- `/auth/accesskey` - Access key retrieval endpoint
- `/account` - User profile endpoint

## 📱 Usage

### Getting Started
1. Navigate to the dashboard and sign in with Google
2. Create your first app using the "Add App" button
3. Set up deployment environments (staging, production)
4. Upload your first bundle or promote between environments

### Managing Deployments
1. Select an app from the Apps page
2. Create deployments for different environments
3. Upload bundles with version information and release notes
4. Monitor deployment metrics and user adoption
5. Promote successful staging releases to production

### Team Collaboration
1. Navigate to the Collaborators section
2. Add team members by email address
3. Manage permissions and access levels
4. View all collaborators across your applications

### Advanced Features
- **Rollback**: Quickly revert to previous stable releases
- **Gradual Rollout**: Release to a percentage of users first
- **Mandatory Updates**: Force users to update for critical fixes
- **Cross-Environment Promotion**: Move releases between staging and production

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.tsx      # Main application layout
│   └── ProtectedRoute.tsx # Authentication wrapper
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication state management
├── pages/              # Page components
│   ├── Dashboard.tsx   # Main dashboard
│   ├── Apps.tsx        # Application management
│   ├── Deployments.tsx # Deployment management
│   ├── DeploymentHistory.tsx # Release history
│   ├── DeploymentDetails.tsx # Individual deployment view
│   ├── BundlePush.tsx  # Bundle upload interface
│   ├── Collaborators.tsx # Team management
│   ├── AppTransfer.tsx # App ownership transfer
│   ├── Login.tsx       # Authentication page
│   ├── OAuthCallback.tsx # OAuth callback handler
│   └── Guide.tsx       # User guide and documentation
├── theme/              # Material-UI theme configuration
│   └── index.ts        # Custom theme definition
├── utils/              # Utility functions
│   └── api.ts          # API client configuration
├── App.tsx             # Root component with routing
└── main.tsx            # Application entry point
```

## 🔐 Security Features

- **Protected Routes**: All dashboard routes require authentication
- **CSRF Protection**: Cross-site request forgery protection
- **Secure Token Storage**: Automatic token management and renewal
- **Permission-Based Access**: Role-based access control for team features
- **Input Validation**: Client-side validation for all forms
- **Error Boundary**: Graceful error handling and recovery

## 🚦 API Integration

The dashboard integrates with the following CodePush API endpoints:

### Authentication
- `GET /account` - Get user profile
- `POST /auth/login/google` - Google OAuth login
- `POST /auth/register/google` - Google OAuth registration
- `GET /auth/accesskey` - Retrieve access keys

### App Management
- `GET /apps` - List all applications
- `POST /apps` - Create new application
- `PATCH /apps/:name` - Update application
- `DELETE /apps/:name` - Delete application

### Deployment Management
- `GET /apps/:name/deployments` - List deployments
- `POST /apps/:name/deployments` - Create deployment
- `DELETE /apps/:name/deployments/:deployment` - Delete deployment
- `GET /apps/:name/deployments/:deployment` - Get deployment details
- `POST /apps/:name/deployments/:deployment/rollback` - Rollback deployment

### Release Management
- `POST /apps/:name/deployments/:deployment/release` - Upload release
- `PATCH /apps/:name/deployments/:deployment/promote` - Promote release
- `GET /apps/:name/deployments/:deployment/history` - Get release history
- `GET /apps/:name/deployments/:deployment/metrics` - Get deployment metrics

### Collaboration
- `GET /apps/:name/collaborators` - List collaborators
- `POST /apps/:name/collaborators/:email` - Add collaborator
- `DELETE /apps/:name/collaborators/:email` - Remove collaborator

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use Material-UI components consistently
- Write comprehensive error handling
- Add loading states for all async operations
- Test authentication flows thoroughly

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.txt) file for details.

## 🆘 Support

For support and questions:
- Check the built-in Guide page in the dashboard
- Review the API documentation
- Create an issue in the repository
- Contact your CodePush server administrator

## 🔄 Version History

See the [deployment history](src/pages/DeploymentHistory.tsx) page within the application for tracking releases and updates.

## Contributors:

<table>
  <tbody display="flex" flex-direction="row">
    <tr>
      <th align="center" valign="top" width="max-content">
        <a href="https://github.com/omiprakash">
          <img src="https://avatars.githubusercontent.com/u/31288647?s=400&u=a0eb643b81f4957d3d5f6b8bb287c142b4aa0645&v=4" width="100px;" alt="Om Prakash Tiwari"/>
          <br />
            <sub><b>Om Prakash Tiwari</b></sub>
        </a>
        <br /> 
        <sub>
        <a href="https://www.linkedin.com/in/om-prakash-tiwari-3ba8727b" title="Twitter"  font-size="8px">LinkedIn
        </a>  
        </sub>
      </th>
      <th align="center" valign="top" width="max-content">
        <a href="https://gkanishk.github.io/">
          <img src="https://avatars.githubusercontent.com/u/33570551?v=4" width="100px;" alt="Kanishk Gupta"/>
          <br />
            <sub><b>Kanishk Gupta</b></sub>
        </a>
        <br /> 
        <sub>
        <a href="https://x.com/gkanishk_" title="Twitter" font-size="8px">Twitter</a> |
        <a href="https://www.linkedin.com/in/gkanishk" title="Twitter"  font-size="8px">LinkedIn
        </a>  
        </sub>
      </th>
    </tr>
  </tbody>
</table>
