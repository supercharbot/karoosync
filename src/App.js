import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { checkUserData, startAsyncSync, getSyncStatus } from './api';
import LoadingScreen from './LoadingScreen';
import SyncForm from './SyncForm';
import MainLayout from './MainLayout';
import SyncProgress from './SyncProgress';

const App = () => {
  const { user, getAuthToken } = useAuth();
  
  // Core app state
  const [currentView, setCurrentView] = useState('checking');
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState('');
  
  // Sync state
  const [syncId, setSyncId] = useState(null);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

  useEffect(() => {
    if (!user) {
      console.log('🔍 No user authenticated');
      return;
    }

    console.log('🔍 User authenticated, starting app initialization');
    initializeApp();
  }, [user]);

  // Main initialization logic
  const initializeApp = async () => {
    try {
      // Check for OAuth callback parameters first
      const urlParams = new URLSearchParams(window.location.search);
      const password = urlParams.get('password');
      const userLogin = urlParams.get('user_login');
      const errorParam = urlParams.get('error');

      // Handle OAuth errors
      if (errorParam) {
        console.log('🔍 OAuth error detected:', errorParam);
        setError(`Authorization error: ${errorParam}`);
        cleanupURLParams();
        setCurrentView('sync');
        return;
      }

      // Handle successful OAuth return
      if (password && userLogin) {
        console.log('🔍 OAuth success detected - processing credentials');
        setIsProcessingOAuth(true);
        await handleOAuthReturn(password, userLogin);
        return;
      }

      // No OAuth in progress - check for existing data
      console.log('🔍 No OAuth detected - checking existing user data');
      await checkForExistingData();
      
    } catch (err) {
      console.error('🔍 App initialization error:', err);
      setError(err.message);
      setCurrentView('sync');
    }
  };

  // Handle OAuth credential return
  const handleOAuthReturn = async (password, userLogin) => {
    try {
      console.log('🔍 Processing OAuth return...');
      
      // Get store URL from parameters or session storage
      const urlParams = new URLSearchParams(window.location.search);
      const storeUrl = urlParams.get('store_url') || 
                       sessionStorage.getItem('karoosync_store_url');

      if (!storeUrl) {
        throw new Error('Store URL not found. Please start the connection process again.');
      }

      // Prepare credentials
      const credentials = {
        url: storeUrl.startsWith('http') ? storeUrl : `https://${storeUrl}`,
        username: userLogin,
        appPassword: password
      };

      console.log('🔍 Starting async sync with OAuth credentials');
      console.log('🔍 Store URL:', credentials.url);
      console.log('🔍 Username:', credentials.username);

      // Start async sync
      const authToken = await getAuthToken();
      const result = await startAsyncSync(credentials, authToken);

      if (result.success && result.syncId) {
        console.log('🔍 Async sync started successfully');
        console.log('🔍 Sync ID:', result.syncId);
        
        // Set sync state and show progress
        setSyncId(result.syncId);
        setCurrentView('syncing');
        setIsProcessingOAuth(false);
        
        // Clean up
        cleanupURLParams();
        sessionStorage.removeItem('karoosync_store_url');
        
        console.log('🔍 State updated - should show progress screen');
      } else {
        throw new Error(result.error || 'Failed to start sync');
      }
      
    } catch (err) {
      console.error('🔍 OAuth return error:', err);
      setError(err.message);
      setCurrentView('sync');
      setIsProcessingOAuth(false);
      cleanupURLParams();
    }
  };

  // Check for existing user data and active syncs
  const checkForExistingData = async () => {
    try {
      const authToken = await getAuthToken();
      
      // First, check if there's an active sync in progress
      console.log('🔍 Checking for active sync...');
      try {
        const syncStatus = await getSyncStatus(authToken);
        
        if (syncStatus.status && ['started', 'processing'].includes(syncStatus.status)) {
          console.log('🔍 Found active sync:', syncStatus.syncId);
          setSyncId(syncStatus.syncId);
          setCurrentView('syncing');
          return;
        } else {
          console.log('🔍 No active sync found');
        }
      } catch (syncError) {
        console.log('🔍 No sync status file found');
      }
      
      // Check for existing user data
      console.log('🔍 Checking for existing user data...');
      const result = await checkUserData(authToken);
      
      if (result.success && result.hasData) {
        console.log('🔍 User data found - redirecting to dashboard');
        setUserData(result);
        setCurrentView('main');
      } else {
        console.log('🔍 No user data found - showing sync form');
        setCurrentView('sync');
      }
      
    } catch (err) {
      console.error('🔍 Error checking existing data:', err);
      setError(err.message);
      setCurrentView('sync');
    }
  };

  // Handle sync completion
  const handleSyncComplete = async (syncResult) => {
    console.log('🔍 Sync completed successfully:', syncResult);
    setSyncId(null);
    
    // Fetch fresh data from server instead of using sync result
    try {
      const authToken = await getAuthToken();
      const freshData = await checkUserData(authToken);
      
      if (freshData.success && freshData.hasData) {
        console.log('🔍 Fresh data loaded after sync completion');
        setUserData(freshData);
        setCurrentView('main');
      } else {
        console.log('🔍 No fresh data found after sync');
        setCurrentView('sync');
      }
    } catch (err) {
      console.error('🔍 Error loading fresh data after sync:', err);
      // Fallback to sync result if fresh data fetch fails
      setUserData(syncResult);
      setCurrentView('main');
    }
  };

  // Handle sync errors
  const handleSyncError = (errorMessage) => {
    console.error('🔍 Sync error:', errorMessage);
    setError(errorMessage);
    setSyncId(null);
    setCurrentView('sync');
  };

  // Handle successful sync from SyncForm
  const handleSyncFormComplete = (syncResult) => {
    console.log('🔍 SyncForm completed:', syncResult);
    if (syncResult.syncId) {
      // Async sync started from form
      setSyncId(syncResult.syncId);
      setCurrentView('syncing');
    } else {
      // Direct sync result (shouldn't happen with async, but fallback)
      setUserData(syncResult);
      setCurrentView('main');
    }
  };

  // Reset app state
  const handleReset = () => {
    console.log('🔍 Resetting app state');
    setUserData(null);
    setSyncId(null);
    setCurrentView('sync');
    setError('');
    setIsProcessingOAuth(false);
  };

  // Clean up URL parameters
  const cleanupURLParams = () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  // Debug current state
  console.log('🔍 App State:', {
    currentView,
    syncId,
    hasUserData: !!userData,
    isProcessingOAuth,
    hasError: !!error
  });

  // Show loading while checking initial state
  if (currentView === 'checking') {
    return <LoadingScreen message="Checking your data..." />;
  }

  // Show OAuth processing
  if (isProcessingOAuth) {
    return <LoadingScreen message="Processing WordPress authorization..." />;
  }

  // Wrap everything in ThemeProvider
  return (
    <ThemeProvider>
      {/* Sync Progress Screen */}
      {currentView === 'syncing' && syncId && (
        <SyncProgress 
          syncId={syncId}
          onComplete={handleSyncComplete}
          onError={handleSyncError}
        />
      )}

      {/* Sync Form */}
      {currentView === 'sync' && (
        <SyncForm 
          onSyncComplete={handleSyncFormComplete}
          error={error}
          setError={setError}
        />
      )}

      {/* Main Application */}
      {currentView === 'main' && userData && (
        <MainLayout 
          userData={userData}
          onReset={handleReset}
          onStartResync={(syncId) => {
            console.log('🔄 Resync started from settings, showing progress screen');
            setSyncId(syncId);
            setCurrentView('syncing');
          }}
        />
      )}

      {/* Fallback Loading */}
      {!['syncing', 'sync', 'main'].includes(currentView) && (
        <LoadingScreen message="Loading..." />
      )}
    </ThemeProvider>
  );
};

export default App;