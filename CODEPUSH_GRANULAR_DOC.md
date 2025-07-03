# CodePush Standalone: Granular Documentation

---

## Table of Contents

- [Overview](#overview)
- [CodePush CLI](#codepush-cli)
  - [Structure](#11-structure)
  - [Main Files & Responsibilities](#12-main-files--responsibilities)
  - [Command Categories](#13-command-categories)
  - [Command Example: release-react](#14-command-example-releasereact)
  - [Error Handling](#15-error-handling)
- [CodePush Server](#codepush-server)
  - [Structure](#21-structure)
  - [Main Components](#22-main-components)
  - [API Endpoints (REST)](#23-api-endpoints-rest)
  - [Storage Model](#24-storage-model)
  - [Security](#25-security)
  - [Extensibility](#26-extensibility)
- [Web UI (GUI)](#web-ui-gui)
  - [Structure](#31-structure)
  - [Main Components](#32-main-components)
  - [Routing](#33-routing)
  - [Authentication](#34-authentication)
  - [API Integration](#35-api-integration)
- [Example Flows](#4-example-flows)
- [Security & Extensibility](#5-security--extensibility)
- [Testing](#6-testing)
- [Further Reading](#7-further-reading)

---

## Overview

This repository provides a **standalone, self-hosted version of Visual Studio App Center CodePush**. It enables React Native developers to deploy over-the-air updates to their apps, manage deployments, and collaborate with team members. The solution includes:

- **CodePush Server** (Node.js backend)
- **CodePush CLI** (Node.js command-line tool)
- **Web UI** (React + Material-UI frontend)

---

## 1. CodePush CLI

### 1.1. Structure

```
cli/
  ├── script/           # TypeScript source code
  │   ├── acquisition-sdk.ts
  │   ├── cli.ts
  │   ├── command-executor.ts
  │   ├── command-parser.ts
  │   ├── commands/
  │   │   └── debug.ts
  │   ├── hash-utils.ts
  │   ├── index.ts
  │   ├── management-sdk.ts
  │   └── types/
  │       ├── cli.ts
  │       └── rest-definitions.ts
  ├── bin/              # Compiled JS output
  ├── test/             # Unit tests
  ├── package.json
  └── README.md
```

### 1.2. Main Files & Responsibilities

- **cli.ts**: Entry point, parses CLI arguments, dispatches commands.
- **command-parser.ts**: Parses and validates command-line input.
- **command-executor.ts**: Implements the logic for each command.
- **acquisition-sdk.ts / management-sdk.ts**: Handle API requests to the server.
- **hash-utils.ts**: Utility for hashing files/bundles.
- **types/**: TypeScript interfaces for CLI and REST API data.

### 1.3. Command Categories

#### a. **Account & Authentication**
- `register`, `login`, `logout`, `whoami`, `link`, `session ls`, `session rm`

#### b. **App Management**
- `app add`, `app rename`, `app rm`, `app ls`, `app transfer`

#### c. **Deployment Management**
- `deployment add`, `deployment rm`, `deployment rename`, `deployment ls`, `deployment history`, `deployment clear`

#### d. **Release Management**
- `release`, `release-react`, `promote`, `rollback`

#### e. **Collaborator Management**
- `collaborator add`, `collaborator rm`, `collaborator ls`

#### f. **Access Key Management**
- `access-key add`, `access-key patch`, `access-key rm`, `access-key ls`

### 1.4. Command Example: `release-react`

- **Purpose**: Bundle and release a React Native update in one step.
- **Key Options**:
  - `--deploymentName` (default: Staging)
  - `--description`
  - `--mandatory`
  - `--rollout`
  - `--outputDir`
  - `--sourcemapOutput`
- **Flow**:
  1. Bundles JS and assets using `react-native bundle`.
  2. Zips output.
  3. Uploads to CodePush server via REST API.
  4. Registers release metadata.

### 1.5. Error Handling

- All commands provide clear error messages for missing parameters, authentication failures, and server errors.
- Uses exit codes for CI/CD integration.

---

## 2. CodePush Server

### 2.1. Structure

```
api/
  ├── script/           # TypeScript source code
  │   ├── api.ts        # Main server entry
  │   ├── server.ts     # Express app setup
  │   ├── environment.ts
  │   ├── error.ts
  │   ├── file-upload-manager.ts
  │   ├── redis-manager.ts
  │   ├── routes/       # Express route handlers
  │   │   ├── acquisition.ts
  │   │   ├── app-insights.ts
  │   │   ├── headers.ts
  │   │   ├── input-sanitizer.ts
  │   │   ├── management.ts
  │   │   ├── passport-authentication.ts
  │   │   └── request-timeout.ts
  │   ├── storage/      # Storage backends
  │   │   ├── azure-storage.ts
  │   │   ├── gcsStorage.ts
  │   │   ├── json-storage.ts
  │   │   ├── redis-s3-storage.ts
  │   │   └── storage.ts
  │   ├── types/        # TypeScript interfaces
  │   ├── utils/        # Utility functions
  │   └── views/        # EJS templates for web pages
  ├── bin/              # Compiled JS output
  ├── test/             # Unit tests
  ├── ENVIRONMENT.md    # Environment variable docs
  ├── README.md
  └── codepush-infrastructure.bicep # Azure infra as code
```

### 2.2. Main Components

#### a. **Express Server**
- **api.ts/server.ts**: Sets up Express, loads routes, applies middleware.

#### b. **Routes**
- **acquisition.ts**: Handles update checks and downloads from mobile clients.
- **management.ts**: Handles app, deployment, collaborator, and release management.
- **passport-authentication.ts**: OAuth login (GitHub, Microsoft, Google).
- **input-sanitizer.ts**: Cleans incoming requests.
- **headers.ts**: Sets security and CORS headers.

#### c. **Storage Backends**
- **azure-storage.ts**: Azure Blob/Table storage.
- **json-storage.ts**: In-memory or file-based storage (for local/dev).
- **redis-s3-storage.ts**: Hybrid Redis/S3 storage.
- **gcsStorage.ts**: Google Cloud Storage (if enabled).

#### d. **Utilities**
- **hash-utils.ts**: File/package hashing.
- **package-diffing.ts**: Computes diffs for update optimization.
- **security.ts**: Security helpers (e.g., input validation).

#### e. **Types**
- **rest-definitions.ts**: REST API data contracts.
- **express.ts**: Express middleware types.

#### f. **Views**
- EJS templates for login, error, and message pages.

### 2.3. API Endpoints (REST)

- **/auth/login/google**: Google OAuth login
- **/auth/logout**: Logout
- **/api/user/profile**: Get current user profile
- **/api/apps**: CRUD for apps
- **/api/deployments**: CRUD for deployments
- **/api/access-keys**: CRUD for access keys
- **/api/collaborators**: CRUD for collaborators

### 2.4. Storage Model

- **Account**: User identity, access keys, linked OAuth providers.
- **App**: Logical grouping for deployments (e.g., MyApp-Android).
- **Deployment**: Channel for releases (e.g., Staging, Production).
- **Package**: A single release (JS bundle, assets, metadata).
- **Collaborator**: User with permissions on an app.

### 2.5. Security

- **OAuth**: All management routes require authentication.
- **Role-based permissions**: Owner vs. collaborator.
- **Input validation**: Sanitization and type checks on all endpoints.

### 2.6. Extensibility

- **Storage**: Easily swap between Azure, S3, GCS, or local.
- **Auth**: Add new OAuth providers via Passport.js.
- **Telemetry**: Optional App Insights integration.

---

## 3. Web UI (GUI)

### 3.1. Structure

```
src/
  ├── App.tsx           # Main app, routing
  ├── main.tsx          # Entry point
  ├── components/       # Reusable UI components (Layout, ProtectedRoute, etc.)
  ├── contexts/         # React Contexts (AuthContext, etc.)
  ├── pages/            # Page-level components
  │   ├── Apps.tsx
  │   ├── AppTransfer.tsx
  │   ├── BundlePush.tsx
  │   ├── Collaborators.tsx
  │   ├── Dashboard.tsx
  │   ├── DeploymentDetails.tsx
  │   ├── DeploymentHistory.tsx
  │   ├── Deployments.tsx
  │   ├── Guide.tsx
  │   ├── Login.tsx
  │   ├── OAuthCallback.tsx
  ├── theme/            # MUI theme config
  └── utils/            # API helpers
```

### 3.2. Main Components

#### a. **App.tsx**
- Sets up all routes using React Router.
- Wraps protected routes in `<ProtectedRoute>` (requires authentication).
- Applies Material-UI theme.

#### b. **Pages**
- **Dashboard**: Key metrics, overview of apps and deployments.
- **Apps**: List, create, delete, and manage apps.
- **Deployments**: List and manage deployments for an app.
- **DeploymentHistory**: View release history for a deployment.
- **DeploymentDetails**: Details and actions for a specific deployment.
- **BundlePush**: UI for uploading new bundles/releases.
- **Collaborators**: Manage app collaborators.
- **AppTransfer**: Transfer app ownership.
- **Guide**: Help and documentation.
- **Login**: OAuth login page.
- **OAuthCallback**: Handles OAuth redirect.

#### c. **Components**
- **Layout**: Main app shell (sidebar, header, content).
- **ProtectedRoute**: Redirects unauthenticated users to login.

#### d. **Contexts**
- **AuthContext**: Manages authentication state and user info.

#### e. **Theme**
- **theme/index.ts**: Customizes Material-UI theme.

#### f. **Utils**
- **api.ts**: Axios/fetch wrappers for backend API calls.

### 3.3. Routing

- `/code-push/login` – Login
- `/oauth/callback` – OAuth callback
- `/code-push/dashboard` – Dashboard
- `/code-push/apps` – Apps list
- `/code-push/apps/:appName/deployments/:deploymentName/history` – Deployment history
- `/code-push/apps/:appName/deployments/:deploymentName/push` – Push new bundle
- `/code-push/apps/:appName/deployments/:deploymentName` – Deployment details
- `/code-push/apps/:appName/collaborators/:email` – Collaborator details
- `/code-push/apps/:appName/collaborators` – Collaborator management
- `/code-push/apps/:appName/transfer` – App transfer
- `/code-push/apps/:appName/push` – Push new bundle
- `/code-push/apps/:appName/deployments` – Deployments for app
- `/code-push/deployments` – All deployments
- `/code-push/collaborators` – All collaborators
- `/code-push/guide` – Guide/help

### 3.4. Authentication

- Uses Google OAuth (handled by backend).
- Stores session in context/local storage.
- Redirects to login if not authenticated.

### 3.5. API Integration

- All data is fetched via REST API endpoints (see Server section).
- Uses Axios or fetch for HTTP requests.
- Handles errors and loading states in UI.

---

## 4. Example Flows

### 4.1. Releasing an Update (End-to-End)

1. **Developer**: Bundles new JS/assets for their React Native app.
2. **CLI**: Runs `code-push-standalone release-react MyApp-Android android`.
3. **CLI**: Authenticates, zips, and uploads bundle to server.
4. **Server**: Stores bundle in Azure/S3, updates deployment metadata.
5. **Web UI**: Shows new release in deployment history.
6. **Mobile App**: On next sync, downloads and applies update.

### 4.2. Adding a Collaborator

1. **Owner**: Runs `code-push-standalone collaborator add MyApp-Android user@example.com`.
2. **Server**: Adds user as collaborator.
3. **Web UI**: New collaborator appears in app's collaborator list.

---

## 5. Security & Extensibility

- **OAuth**: All management actions require login.
- **Role-based permissions**: Only owners can delete/transfer apps.
- **Storage**: Pluggable backend (Azure, S3, GCS, local).
- **Telemetry**: Optional App Insights.
- **UI**: Easily extendable with new pages/components.

---

## 6. Testing

- **CLI**: Unit tests in `cli/test/`
- **Server**: Unit and integration tests in `api/test/`
- **Web UI**: (Add tests as needed, e.g., with Jest/React Testing Library)

---

## 7. Further Reading

- [cli/README.md](cli/README.md): Full CLI command reference and examples.
- [api/README.md](api/README.md): Server setup, deployment, and environment details.
- [api/ENVIRONMENT.md](api/ENVIRONMENT.md): All environment variables and their usage.
- [src/](src/): Explore React components and pages for UI customization.

---

**For further details, see the individual `README.md` files in each subdirectory.** 