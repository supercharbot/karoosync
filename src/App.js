import React, { useState, useEffect } from 'react';
import { Loader2, Store, AlertTriangle, CheckCircle, Info, ExternalLink, LogOut } from 'lucide-react';
import ProductEditor from './ProductEditor';
import { syncStore, updateProduct, initializeAppPasswordAuth, checkUserData } from './api';
import { useAuth } from './AuthContext';
import ConnectionDiagnostic from './ConnectionDiagnostic';

const App = () => {
  const { getAuthToken, user, logout } = useAuth();
  const [currentView, setCurrentView] = useState('checking-data');
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
  const [hasExistingData, setHasExistingData] = useState(false);
  const [dataCheckComplete, setDataCheckComplete] = useState(false);

  // Handle OAuth return from WordPress
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const password = urlParams.get('password');
    const userLogin = urlParams.get('user_login');
    const error = urlParams.get('error');

    if (error) {
      setError(`WordPress authorization error: ${error}`);
      setCurrentView('form');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (password && userLogin) {
      handleOAuthReturn(password, userLogin);
    }
  }, []);

  // Check for existing data when user is available
  useEffect(() => {
    const checkForExistingData = async () => {
      if (user && !dataCheckComplete) {
        console.log('=== STARTING DATA CHECK FOR USER ===');
        console.log('User:', user.username);
        
        try {
          const authToken = await getAuthToken();
          console.log('Got auth token, calling checkUserData...');
          
          const result = await checkUserData(authToken);
          console.log('Data check result:', result);
          
          if (result.success && result.hasData) {
            console.log('User has existing data, loading editor...');
            
            // Set credentials if available
            if (result.credentials) {
              setCredentials(result.credentials);
              setFormData({
                url: result.credentials.url || '',
                consumerKey: result.credentials.consumerKey || '',
                consumerSecret: result.credentials.consumerSecret || '',
                username: result.credentials.username || '',
                appPassword: result.credentials.appPassword || ''
              });
              setAuthMethod(result.credentials.authMethod || 'woocommerce');
            }
            
            // Handle different data structures
            if (result.structure === 'categorized') {
              setSyncData({
                structure: 'categorized',
                categories: result.metadata.categories,
                attributes: result.metadata.attributes,
                systemStatus: result.metadata.systemStatus,
                totalProducts: result.totalProducts,
                products: [],
                availableCategories: result.availableCategories
              });
            } else if (result.structure === 'legacy') {
              setSyncData(result.data);
            } else {
              setSyncData(result.data || result);
            }
            
            setHasExistingData(true);
            setCurrentView('editor');
          } else if (result.success && !result.hasData) {
            console.log('User has no existing data, showing sync form...');
            setHasExistingData(false);
            setCurrentView('form');
          } else {
            console.log('Data check failed, showing sync form...');
            setError(result.error || 'Could not check for existing data');
            setHasExistingData(false);
            setCurrentView('form');
          }
        } catch (error) {
          console.error('Error in data check:', error);
          setError('Could not check for existing data: ' + error.message);
          setHasExistingData(false);
          setCurrentView('form');
        } finally {
          setDataCheckComplete(true);
          console.log('=== DATA CHECK COMPLETE ===');
        }
      }
    };

    checkForExistingData();
  }, [user, getAuthToken, dataCheckComplete]);

  const handleOAuthReturn = async (password, userLogin) => {
    console.log('=== OAUTH RETURN HANDLER ===');
    console.log('User login:', userLogin);
    console.log('Stored form URL:', formData.url);
    
    // Get URL from localStorage if form data was lost
    let storeUrl = formData.url;
    if (!storeUrl) {
      storeUrl = localStorage.getItem('karoosync_temp_url');
      console.log('Retrieved URL from localStorage:', storeUrl);
    }
    
    if (!storeUrl) {
      setError('Store URL was lost during WordPress authentication. Please enter your store URL and try again.');
      setCurrentView('form');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    
    setCurrentView('syncing');
    setSyncStatus('syncing');
    setSyncProgress(20);
    setSyncDetails('Processing WordPress authorization...');

    try {
      // Ensure URL has protocol
      let processedUrl = storeUrl.trim();
      if (!processedUrl.startsWith('http')) {
        processedUrl = `https://${processedUrl}`;
      }
      
      const authCredentials = {
        url: processedUrl,
        authMethod: 'application',
        username: userLogin,
        appPassword: password
      };

      console.log('OAuth credentials:', {
        url: authCredentials.url,
        username: authCredentials.username,
        hasPassword: !!authCredentials.appPassword
      });

      setCredentials(authCredentials);
      setSyncDetails('Authorization complete! Connecting to store...');
      setSyncProgress(50);
      
      const authToken = await getAuthToken();
      const result = await syncStore(authCredentials, authToken);
      
      if (result.success) {
        setSyncDetails('Data received! Processing products...');
        setSyncProgress(80);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setSyncData(result.data);
        setSyncProgress(100);
        setSyncDetails('Sync complete!');
        setSyncStatus('complete');
        
        // Clear temporary URL
        localStorage.removeItem('karoosync_temp_url');
        
        await new Promise(resolve => setTimeout(resolve, 800));
        setCurrentView('editor');
      } else {
        throw new Error(result.error || 'Store sync failed');
      }
    } catch (err) {
      console.error('OAuth return error:', err);
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
    console.log('=== INITIALIZING WORDPRESS AUTH ===');
    console.log('Form URL:', formData.url);
    
    if (!formData.url || formData.url.trim() === '') {
      setError('Store URL is required for WordPress authentication');
      return;
    }

    setError('');
    
    // Store URL temporarily in case form data gets lost during redirect
    localStorage.setItem('karoosync_temp_url', formData.url);
    
    try {
      const result = await initializeAppPasswordAuth(formData.url);
      
      if (result.success) {
        setAuthUrl(result.authUrl);
        setShowAuthFlow(true);
        console.log('✅ WordPress auth URL generated');
      } else {
        setError(result.error);
        localStorage.removeItem('karoosync_temp_url');
      }
    } catch (err) {
      setError('Failed to initialize WordPress authorization: ' + err.message);
      localStorage.removeItem('karoosync_temp_url');
    }
  };

  const handleAuthMethodChange = (method) => {
    setAuthMethod(method);
    setShowAuthFlow(false);
    setAuthUrl('');
    setError('');
    
    // Clear temporary URL if switching away from WordPress auth
    if (method !== 'application') {
      localStorage.removeItem('karoosync_temp_url');
    }
  };

  const handleSubmit = async () => {
    setError('');
    
    console.log('=== HANDLE SUBMIT START ===');
    console.log('Auth method:', authMethod);
    console.log('Show auth flow:', showAuthFlow);
    console.log('Form data URL:', formData.url);
    console.log('Form data username:', formData.username);
    console.log('Form data consumer key:', formData.consumerKey?.substring(0, 10) + '...');

    // For WordPress auth, handle the flow
    if (authMethod === 'application' && !showAuthFlow) {
      return initializeWordPressAuth();
    }

    // Validation
    if (!formData.url || formData.url.trim() === '') {
      setError('Store URL is required');
      return;
    }
    
    if (authMethod === 'woocommerce' && (!formData.consumerKey || !formData.consumerSecret)) {
      setError('Consumer Key and Secret are required for WooCommerce API authentication');
      return;
    }
    
    if (authMethod === 'application' && (!formData.username || !formData.appPassword)) {
      setError('Username and Application Password are required for WordPress authentication');
      return;
    }

    setSyncStatus('syncing');
    setCurrentView('syncing');
    setSyncProgress(0);
    setSyncDetails('Initializing connection...');

    try {
      // Process URL
      let url = formData.url.trim();
      if (!url.startsWith('http')) {
        url = `https://${url}`;
        console.log('Added https:// to URL:', url);
      }
      
      setSyncDetails('Connecting to store...');
      setSyncProgress(10);
      
      const creds = {
        url: url,
        authMethod: authMethod,
        consumerKey: authMethod === 'woocommerce' ? formData.consumerKey.trim() : undefined,
        consumerSecret: authMethod === 'woocommerce' ? formData.consumerSecret.trim() : undefined,
        username: authMethod === 'application' ? formData.username.trim() : undefined,
        appPassword: authMethod === 'application' ? formData.appPassword.trim() : undefined
      };
      
      console.log('=== FINAL CREDENTIALS FOR SYNC ===');
      console.log('URL:', creds.url);
      console.log('Auth method:', creds.authMethod);
      console.log('Has consumer key:', !!creds.consumerKey);
      console.log('Has consumer secret:', !!creds.consumerSecret);
      console.log('Has username:', !!creds.username);
      console.log('Has app password:', !!creds.appPassword);
      
      setCredentials(creds);
      
      setSyncDetails('Syncing data from WooCommerce...');
      setSyncProgress(30);
      
      const authToken = await getAuthToken();
      if (!authToken) {
        throw new Error('Failed to get authentication token');
      }
      
      const syncStartTime = Date.now();
      const result = await syncStore(creds, authToken);
      
      const timeTaken = Date.now() - syncStartTime;
      if (timeTaken < 1500) {
        await new Promise(resolve => setTimeout(resolve, 1500 - timeTaken));
      }
      
      if (result.success) {
        setSyncDetails('Data synced and saved!');
        setSyncProgress(100);
        setSyncStatus('complete');
        
        setSyncData(result.data);
        setHasExistingData(true);
        
        // Clear temporary URL
        localStorage.removeItem('karoosync_temp_url');
        
        await new Promise(resolve => setTimeout(resolve, 800));
        setCurrentView('editor');
      } else {
        setSyncStatus('error');
        throw new Error(result.error || 'Sync failed');
      }
    } catch (err) {
      console.error('=== SUBMIT ERROR ===', err);
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

  const handleResync = async () => {
    if (!credentials) {
      setError('No store credentials found');
      return;
    }

    setSyncStatus('syncing');
    setCurrentView('syncing');
    setSyncProgress(0);
    setSyncDetails('Re-syncing your store data...');

    try {
      const authToken = await getAuthToken();
      const result = await syncStore(credentials, authToken);
      
      if (result.success) {
        setSyncDetails('Store data refreshed!');
        setSyncProgress(100);
        setSyncStatus('complete');
        
        setSyncData(result.data);
        
        await new Promise(resolve => setTimeout(resolve, 800));
        setCurrentView('editor');
      } else {
        throw new Error(result.error || 'Re-sync failed');
      }
    } catch (err) {
      setSyncStatus('error');
      setError(err.message);
      setSyncProgress(0);
      await new Promise(resolve => setTimeout(resolve, 800));
      setCurrentView('editor');
    }
  };

  const handleProductUpdate = async (productId, updatedData) => {
    try {
      const authToken = await getAuthToken();
      
      const updateCredentials = credentials || {
        url: formData.url,
        authMethod: authMethod,
        consumerKey: formData.consumerKey,
        consumerSecret: formData.consumerSecret,
        username: formData.username,
        appPassword: formData.appPassword
      };
      
      const result = await updateProduct(updateCredentials, productId, updatedData, authToken);
      
      if (result.success) {
        if (syncData && syncData.products) {
          setSyncData(prev => ({
            ...prev,
            products: prev.products.map(p => 
              p.id === productId ? result.data : p
            )
          }));
        }
        
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
    setCurrentView('checking-data');
    setSyncData(null);
    setCredentials(null);
    setError('');
    setSyncStatus('idle');
    setSyncProgress(0);
    setShowAuthFlow(false);
    setAuthUrl('');
    setHasExistingData(false);
    setDataCheckComplete(false);
    
    // Clear any temporary data
    localStorage.removeItem('karoosync_temp_url');
  };

  if (currentView === 'checking-data') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md w-full p-6">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Checking Your Data
          </h2>
          
          <p className="text-gray-600 mb-6">
            Looking for your store data...
          </p>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full animate-pulse w-3/4"></div>
          </div>
          
          <p className="text-xs text-gray-500 mt-4">
            This should only take a few seconds
          </p>
        </div>
      </div>
    );
  }

  if (currentView === 'form') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
                <Store className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {hasExistingData ? 'Update Store Connection' : 'Connect Your Store'}
              </h1>
              <p className="text-gray-600 mb-2">
                {hasExistingData ? 'Update your store credentials or sync fresh data' : 'Connect your WooCommerce store to get started'}
              </p>
              <p className="text-gray-600">WooCommerce Product Editor</p>
              
              <div className="flex items-center justify-center mt-4 text-sm text-gray-500">
                <span>Logged in as {user?.username}</span>
                <button
                  onClick={logout}
                  className="ml-2 text-red-600 hover:text-red-800 flex items-center"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Sign Out
                </button>
              </div>
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
                    Store URL *
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

                {authMethod === 'application' && !showAuthFlow && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-blue-800 text-sm mb-3">
                      Enter your store URL above, then click "Authorize with WordPress" to connect securely.
                    </p>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!formData.url}
                      className={`w-full font-semibold py-3 px-6 rounded-xl transition duration-200 ${
                        formData.url
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Authorize with WordPress
                    </button>
                  </div>
                )}

                {authMethod === 'application' && showAuthFlow && (
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
                      After authorization, you'll be redirected back automatically
                    </p>
                  </div>
                )}

                {authMethod === 'woocommerce' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Consumer Key *
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
                        Consumer Secret *
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
                          Generate them in WooCommerce → Settings → Advanced → REST API.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleSubmit}
                      disabled={!formData.url || !formData.consumerKey || !formData.consumerSecret}
                      className={`w-full font-semibold py-3 px-6 rounded-xl transition duration-200 shadow-lg ${
                        formData.url && formData.consumerKey && formData.consumerSecret
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 hover:shadow-xl'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {hasExistingData ? 'Update & Sync Store' : 'Connect to Store'}
                    </button>
                  </>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start">
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  </div>
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
      onResync={handleResync}
    />;
  }

  return null;
};

export default App;