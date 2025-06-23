import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { ThemeProvider } from './ThemeContext'; // Import here instead
import { checkUserData, startAsyncSync, getSyncStatus } from './api';
import LoadingScreen from './LoadingScreen';
import SyncForm from './SyncForm';
import MainLayout from './MainLayout';
import SyncProgress from './SyncProgress';

const App = () => {
  const { user, getAuthToken } = useAuth();
  const [currentView, setCurrentView] = useState('checking');
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState('');
  const [syncId, setSyncId] = useState(null);

  useEffect(() => {
    if (!user) return;

    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const password = urlParams.get('password');
    const userLogin = urlParams.get('user_login');
    const errorParam = urlParams.get('error');

    if (errorParam) {
      setError(`Authorization error: ${errorParam}`);
      window.history.replaceState({}, document.title, window.location.pathname);
      setCurrentView('sync');
      return;
    }

    if (password && userLogin) {
      handleOAuthReturn(password, userLogin);
      return;
    }

    // Normal data check flow
    checkExistingData();
  }, [user]);

  const handleOAuthReturn = async (password, userLogin) => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const storeUrl = urlParams.get('store_url') || 
                       sessionStorage.getItem('karoosync_store_url');

      console.log('OAuth return - Store URL:', storeUrl);
      console.log('OAuth return - User Login:', userLogin);

      if (!storeUrl) {
        throw new Error('Store URL not found. Please start the connection process again.');
      }

      const credentials = {
        url: storeUrl.startsWith('http') ? storeUrl : `https://${storeUrl}`,
        username: userLogin,
        appPassword: password
      };

      console.log('Starting async sync with OAuth credentials...');

      const authToken = await getAuthToken();
      const result = await startAsyncSync(credentials, authToken);
      
      if (result.success) {
        setSyncId(result.syncId);
        setCurrentView('syncing');
        sessionStorage.removeItem('karoosync_store_url');
      } else {
        throw new Error(result.error || 'Store sync failed');
      }
    } catch (err) {
      console.error('OAuth return error:', err);
      setError(err.message);
      setCurrentView('sync');
    } finally {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const checkExistingData = async () => {
    try {
      const authToken = await getAuthToken();
      const result = await checkUserData(authToken);
      
      if (result.success && result.hasData) {
        setUserData(result);
        setCurrentView('main');
      } else {
        setCurrentView('sync');
      }
    } catch (err) {
      setError(err.message);
      setCurrentView('sync');
    }
  };

  const handleSyncComplete = (syncResult) => {
    setUserData(syncResult);
    setSyncId(null);
    setCurrentView('main');
  };

  const handleSyncError = (errorMessage) => {
    setError(errorMessage);
    setSyncId(null);
    setCurrentView('sync');
  };

  const handleReset = () => {
    setUserData(null);
    setCurrentView('sync');
    setError('');
  };

  // Wrap everything in ThemeProvider AFTER user is authenticated
  if (currentView === 'checking') {
    return <LoadingScreen message="Checking your data..." />;
  }

  if (currentView === 'syncing') {
    if (syncId) {
      return (
        <ThemeProvider>
          <SyncProgress 
            syncId={syncId}
            onComplete={handleSyncComplete}
            onError={handleSyncError}
          />
        </ThemeProvider>
      );
    }
    return <LoadingScreen message="Processing WordPress authorization..." />;
  }

  // Now that user is authenticated, wrap in ThemeProvider
  return (
    <ThemeProvider>
      {currentView === 'sync' && (
        <SyncForm 
          onSyncComplete={handleSyncComplete}
          error={error}
          setError={setError}
        />
      )}

      {currentView === 'main' && userData && (
        <MainLayout 
          userData={userData}
          onReset={handleReset}
        />
      )}

      {!['sync', 'main'].includes(currentView) && (
        <LoadingScreen message="Loading..." />
      )}
    </ThemeProvider>
  );
};

export default App;