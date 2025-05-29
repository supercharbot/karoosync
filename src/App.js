import React, { useState, useEffect } from 'react';
import { Loader2, Store, AlertTriangle, CheckCircle, Info, ExternalLink } from 'lucide-react';
import ProductEditor from './ProductEditor';
import { syncStore, updateProduct, initializeAppPasswordAuth } from './api';
import ConnectionDiagnostic from './ConnectionDiagnostic';

const App = () => {
  const [currentView, setCurrentView] = useState('form');
  const [authMethod, setAuthMethod] = useState('woocommerce');
  const [formData, setFormData] = useState({
    url: '',
    consumerKey: '',
    consumerSecret: '',
    username: '',
    appPassword: ''
  });
  const [authUrl, setAuthUrl] = useState('');
  const [showAuthFlow, setShowAuthFlow] = useState(false);
  const [syncData, setSyncData] = useState(null);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncDetails, setSyncDetails] = useState('');
  const [lastError, setLastError] = useState(null);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const password = urlParams.get('password');
    const userLogin = urlParams.get('user_login');
    const siteUrl = urlParams.get('site_url');
    const error = urlParams.get('error');

    if (error) {
      setError(`Authorization error: ${error}`);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (password && userLogin && siteUrl) {
      handleOAuthReturn(password, userLogin, siteUrl);
    }
  }, []);

  const handleOAuthReturn = async (password, userLogin, siteUrl) => {
    setCurrentView('syncing');
    setSyncStatus('syncing');
    setSyncProgress(20);
    setSyncDetails('Processing WordPress authorization...');

    try {
      // Use the site_url from callback, not formData.url
      const authCredentials = {
        url: decodeURIComponent(siteUrl), // Decode the URL-encoded site_url
        authMethod: 'application',
        username: userLogin,
        appPassword: password
      };

      setCredentials(authCredentials);
      setSyncDetails('Authorization complete! Connecting to store...');
      setSyncProgress(50);
      
      const result = await syncStore(authCredentials);
      
      if (result.success) {
        setSyncDetails('Data received! Processing products...');
        setSyncProgress(80);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setSyncData(result.data);
        setSyncProgress(100);
        setSyncDetails('Sync complete!');
        setSyncStatus('complete');
        
        await new Promise(resolve => setTimeout(resolve, 800));
        setCurrentView('editor');
      } else {
        throw new Error(result.error || 'Store sync failed');
      }
    } catch (err) {
      setSyncStatus('error');
      setError(err.message);
      setSyncProgress(0);
      await new Promise(resolve => setTimeout(resolve, 800));
      setCurrentView('form');
    } finally {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const initializeWordPressAuth = async () => {
    if (!formData.url) {
      setError('Store URL is required');
      return;
    }

    setError('');
    try {
      const result = await initializeAppPasswordAuth(formData.url);
      
      if (result.success) {
        setAuthUrl(result.authUrl);
        setShowAuthFlow(true);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to initialize WordPress authorization: ' + err.message);
    }
  };

  const handleAuthMethodChange = (method) => {
    setAuthMethod(method);
    setShowAuthFlow(false);
    setAuthUrl('');
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    setLastError(null);

    if (authMethod === 'application' && !showAuthFlow) {
      return initializeWordPressAuth();
    }

    setSyncStatus('syncing');
    setCurrentView('syncing');
    setSyncProgress(0);
    setSyncDetails('Initializing connection...');

    try {
      if (!formData.url) {
        throw new Error('Store URL is required');
      }
      
      if (authMethod === 'woocommerce' && (!formData.consumerKey || !formData.consumerSecret)) {
        throw new Error('Consumer Key and Secret are required for WooCommerce API authentication');
      }
      
      if (authMethod === 'application' && (!formData.username || !formData.appPassword)) {
        throw new Error('Username and Application Password are required');
      }

      let url = formData.url.trim();
      if (!url.startsWith('http')) {
        url = `https://${url}`;
      }
      
      setSyncDetails('Connecting to store...');
      setSyncProgress(10);
      
      const creds = {
        url,
        authMethod: authMethod,
        consumerKey: authMethod === 'woocommerce' ? formData.consumerKey.trim() : undefined,
        consumerSecret: authMethod === 'woocommerce' ? formData.consumerSecret.trim() : undefined,
        username: authMethod === 'application' ? formData.username.trim() : undefined,
        appPassword: authMethod === 'application' ? formData.appPassword.trim() : undefined
      };
      
      setCredentials(creds);
      
      setSyncDetails('Authenticating and fetching store data...');
      setSyncProgress(30);
      
      const syncStartTime = Date.now();
      const result = await syncStore(creds);
      
      const timeTaken = Date.now() - syncStartTime;
      if (timeTaken < 1500) {
        await new Promise(resolve => setTimeout(resolve, 1500 - timeTaken));
      }
      
      if (result.success) {
        setSyncDetails('Data received! Processing products...');
        setSyncProgress(80);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setSyncData(result.data);
        setSyncProgress(100);
        setSyncDetails('Sync complete!');
        setSyncStatus('complete');
        
        await new Promise(resolve => setTimeout(resolve, 800));
        setCurrentView('editor');
      } else {
        setSyncStatus('error');
        setLastError({
          message: result.error,
          details: result
        });
        throw new Error(result.error || 'Sync failed');
      }
    } catch (err) {
      setSyncStatus('error');
      setError(err.message);
      setSyncProgress(0);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (err.message.includes('No products found') || 
          err.message.includes('insufficient permissions') ||
          err.message.includes('Sorry, you cannot list resources')) {
        setCurrentView('diagnostic');
      } else {
        setCurrentView('form');
      }
    }
  };

  const handleProductUpdate = async (productId, updatedData) => {
    try {
      const result = await updateProduct(credentials, productId, updatedData);
      
      if (result.success) {
        setSyncData(prev => ({
          ...prev,
          products: prev.products.map(p => 
            p.id === productId ? result.data : p
          )
        }));
        return { success: true, data: result.data };
      }
      
      return { success: false, error: result.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const resetForm = () => {
    setCurrentView('form');
    setSyncData(null);
    setCredentials(null);
    setError('');
    setSyncStatus('idle');
    setSyncProgress(0);
    setLastError(null);
    setShowAuthFlow(false);
    setAuthUrl('');
  };

  if (currentView === 'form') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
                <Store className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Karoosync</h1>
              <p className="text-gray-600">WooCommerce Product Editor</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Authentication Method
                  </label>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => handleAuthMethodChange('woocommerce')}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        authMethod === 'woocommerce'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      WooCommerce API
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAuthMethodChange('application')}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        authMethod === 'application'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      WordPress Auth
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Store URL
                  </label>
                  <input
                    type="text"
                    name="url"
                    value={formData.url}
                    onChange={handleInputChange}
                    placeholder="yourstore.com"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">We'll automatically add https:// if needed</p>
                </div>

                {authMethod === 'application' && !showAuthFlow ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-blue-800 text-sm mb-3">
                      Click "Authorize with WordPress" to connect securely through your WordPress site.
                    </p>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-blue-700 transition duration-200"
                    >
                      Authorize with WordPress
                    </button>
                  </div>
                ) : authMethod === 'application' && showAuthFlow ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-green-800 text-sm mb-3">
                      WordPress authorization URL generated. Click to complete authentication:
                    </p>
                    <a
                      href={authUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-full bg-green-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-green-700 transition duration-200"
                    >
                      <ExternalLink className="w-5 h-5 mr-2" />
                      Complete WordPress Authentication
                    </a>
                    <p className="text-xs text-green-600 mt-2">
                      After authorization, you'll be redirected back with credentials
                    </p>
                  </div>
                ) : authMethod === 'woocommerce' ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Consumer Key
                      </label>
                      <input
                        type="text"
                        name="consumerKey"
                        value={formData.consumerKey}
                        onChange={handleInputChange}
                        placeholder="ck_your_consumer_key"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Consumer Secret
                      </label>
                      <input
                        type="password"
                        name="consumerSecret"
                        value={formData.consumerSecret}
                        onChange={handleInputChange}
                        placeholder="cs_your_consumer_secret"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex">
                        <Info className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-blue-700 text-sm">
                          WooCommerce API keys must have <strong>Read/Write</strong> permissions. 
                          You can set this in WooCommerce → Settings → Advanced → REST API.
                        </p>
                      </div>
                    </div>
                  </>
                ) : null}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start">
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  </div>
                )}

                {authMethod === 'woocommerce' && (
                  <button
                    onClick={handleSubmit}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition duration-200 shadow-lg hover:shadow-xl"
                  >
                    Connect to Store
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'diagnostic') {
    return (
      <ConnectionDiagnostic
        url={formData.url}
        authMethod={authMethod}
        onRetry={handleSubmit}
        onBack={resetForm}
      />
    );
  }

  if (currentView === 'syncing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md w-full p-6">
          <div className="mb-8">
            {syncStatus === 'error' ? (
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
            ) : syncStatus === 'complete' ? (
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
            )}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {syncStatus === 'error' ? 'Sync Failed' : 
             syncStatus === 'complete' ? 'Sync Complete' : 
             'Syncing Your Store'}
          </h2>
          
          <p className="text-gray-600 mb-6">{syncDetails}</p>
          
          {syncStatus === 'syncing' && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${syncProgress}%` }} 
              />
            </div>
          )}
          
          {syncStatus === 'error' && (
            <button
              onClick={resetForm}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  if (currentView === 'editor' && syncData) {
    return <ProductEditor 
      syncData={syncData} 
      storeUrl={formData.url}
      credentials={credentials}
      onProductUpdate={handleProductUpdate}
      onReset={resetForm}
    />;
  }

  return null;
};

export default App;