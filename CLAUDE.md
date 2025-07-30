# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Karoosync is a React-based WordPress/WooCommerce sync application that enables users to synchronize and manage their WooCommerce store data through a centralized dashboard. The application uses AWS Amplify for authentication, Lambda functions for backend processing, and provides real-time sync capabilities.

## Development Commands

- `npm start` - Start development server on localhost:3000
- `npm test` - Run test suite in interactive watch mode  
- `npm run build` - Build production bundle to build/ folder
- `npm run eject` - Eject from Create React App (one-way operation)

## Architecture Overview

### Frontend Structure
- **App.js**: Main application component handling routing between sync, syncing, and main views
- **AuthContext.js**: AWS Cognito authentication provider with JWT token management
- **ThemeContext.js**: Theme switching context for dark/light mode
- **api.js**: Comprehensive API client with all backend communication functions

### Backend Architecture (Lambda Functions)
- **index.mjs**: Main Lambda handler with route dispatching based on actions
- **handlers/syncHandler.mjs**: WordPress sync operations (OAuth, async sync, status polling)
- **handlers/productHandler.mjs**: Product CRUD operations and category management
- **handlers/dataHandler.mjs**: Data retrieval and search functionality
- **handlers/accountHandler.mjs**: Account management, backups, and exports
- **handlers/stripeHandler.mjs**: Subscription and payment processing

### Key Components
- **SyncForm**: WordPress store connection and authentication
- **SyncProgress**: Real-time sync progress tracking with polling
- **MainLayout**: Dashboard with product management interface
- **ProductView/CategoryView**: Product and category management interfaces
- **SettingsPage**: Account settings, backups, and sync controls

### State Management
The app uses React Context for:
- Authentication state (AuthContext)
- Theme preferences (ThemeContext)
- Local component state for data management

### API Communication
- REST API through AWS Lambda with JWT authentication
- Async sync operations with progress polling
- Error handling with retry logic for timeouts
- WordPress OAuth flow for store connections

## Key Development Patterns

### Sync Flow
1. User enters WordPress store URL in SyncForm
2. OAuth redirect to WordPress for app password generation
3. Async sync initiated in Lambda with progress tracking
4. SyncProgress component polls status until completion
5. Redirect to MainLayout dashboard on success

### Authentication Flow
- AWS Cognito handles user authentication
- JWT tokens passed in Authorization headers
- extractUserId() function in Lambda extracts user from token
- Webhook endpoints bypass authentication for Stripe callbacks

### Error Handling
- API client includes comprehensive error handling with timeouts
- Retry logic for product creation and attribute loading
- User-friendly error messages throughout the UI
- Graceful fallbacks for network issues

## Environment Variables
- `REACT_APP_COGNITO_USER_POOL_ID`: AWS Cognito User Pool ID
- `REACT_APP_COGNITO_CLIENT_ID`: AWS Cognito Client ID  
- `REACT_APP_API_ENDPOINT`: Lambda API Gateway endpoint URL

## Testing Approach
- Uses @testing-library/react for component testing
- Test files follow *.test.js convention
- Run tests with `npm test`