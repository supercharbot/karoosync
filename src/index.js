import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';
import MarketingApp from './MarketingApp';

const root = ReactDOM.createRoot(document.getElementById('root'));

if (window.location.pathname.startsWith('/app')) {
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
  // Remove the redirect, just render marketing site
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <MarketingApp />
      </BrowserRouter>
    </React.StrictMode>
  );
}