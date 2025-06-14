import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';
import MarketingApp from './MarketingApp'; // Your new marketing component

const root = ReactDOM.createRoot(document.getElementById('root'));

// Check if we're on the app path
if (window.location.pathname.startsWith('/app')) {
  // Render the React app with /app basename
  root.render(
    <React.StrictMode>
      <BrowserRouter basename="/app">
        <AuthProvider>
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
} else {
  // Render marketing site for all other paths
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <MarketingApp />
      </BrowserRouter>
    </React.StrictMode>
  );
}