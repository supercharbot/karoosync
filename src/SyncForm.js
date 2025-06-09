import React, { useState } from 'react';
import { Store, LogOut, ExternalLink } from 'lucide-react';
import { useAuth } from './AuthContext';
import { initializeWordPressAuth, syncWordPressStore } from './api';
import LoadingScreen from './LoadingScreen';

const SyncForm = ({ onSyncComplete, error, setError }) => {
  const { user, logout, getAuthToken } = useAuth();
  const [storeUrl, setStoreUrl] = useState('');
  const [authUrl, setAuthUrl] = useState('');
  const [showAuthFlow, setShowAuthFlow] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!storeUrl) {
      setError('Store URL is required');
      return;
    }

    setIsConnecting(true);
    
    try {
      // Store URL in sessionStorage for OAuth return
      sessionStorage.setItem('karoosync_store_url', storeUrl);
      
      const authToken = await getAuthToken();
      const result = await initializeWordPressAuth(storeUrl, authToken);
      
      if (result.success) {
        setAuthUrl(result.authUrl);
        setShowAuthFlow(true);
      } else {
        setError(result.error || 'Failed to initialize WordPress auth');
      }
    } catch (err) {
      setError(err.message);
    }
    
    setIsConnecting(false);
  };

  const handleManualCredentials = async (credentials) => {
    setIsConnecting(true);
    
    try {
      const authToken = await getAuthToken();
      const result = await syncWordPressStore(credentials, authToken);
      
      if (result.success) {
        onSyncComplete(result);
      } else {
        setError(result.error || 'Sync failed');
      }
    } catch (err) {
      setError(err.message);
    }
    
    setIsConnecting(false);
  };

  if (isConnecting) {
    return <LoadingScreen message="Connecting to your WordPress store..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Connect Your Store</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Connect your WooCommerce store using WordPress authentication</p>
            
            <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              <span>Logged in as {user?.username}</span>
              <button
                onClick={logout}
                className="ml-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 flex items-center"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Sign Out
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border dark:border-gray-700">
            {!showAuthFlow ? (
              <form onSubmit={handleInitialSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Store URL
                  </label>
                  <input
                    type="text"
                    value={storeUrl}
                    onChange={(e) => setStoreUrl(e.target.value)}
                    placeholder="yourstore.com"
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">We'll automatically add https:// if needed</p>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition duration-200 shadow-lg hover:shadow-xl"
                >
                  Continue with WordPress
                </button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <p className="text-green-800 dark:text-green-400 text-sm mb-3">
                    WordPress authorization URL generated. Click to complete authentication:
                  </p>
                  <a
                    href={authUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full bg-green-600 dark:bg-green-500 text-white font-semibold py-3 px-6 rounded-xl hover:bg-green-700 dark:hover:bg-green-600 transition duration-200"
                  >
                    <ExternalLink className="w-5 h-5 mr-2" />
                    Complete WordPress Authentication
                  </a>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    After authorization, you'll be redirected back with credentials
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">or</p>
                  <ManualCredentialsForm 
                    storeUrl={storeUrl}
                    onSubmit={handleManualCredentials}
                    error={error}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ManualCredentialsForm = ({ storeUrl, onSubmit, error }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    appPassword: ''
  });
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!credentials.username || !credentials.appPassword) {
      return;
    }
    onSubmit({
      url: storeUrl,
      username: credentials.username,
      appPassword: credentials.appPassword
    });
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm underline"
      >
        Enter credentials manually
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          WordPress Username
        </label>
        <input
          type="text"
          value={credentials.username}
          onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
          placeholder="your-username"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Application Password
        </label>
        <input
          type="password"
          value={credentials.appPassword}
          onChange={(e) => setCredentials(prev => ({ ...prev, appPassword: e.target.value }))}
          placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          required
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 dark:bg-blue-500 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition duration-200 text-sm"
      >
        Connect with Credentials
      </button>
    </form>
  );
};

export default SyncForm;