import React, { useState, useEffect } from 'react';
import { Save, Bell, Shield, Globe, Zap, RefreshCw, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { fetchUserAttributes, getCurrentUser, updateUserAttributes } from 'aws-amplify/auth';
import { syncWordPressStore } from './api';
import LoadingScreen from './LoadingScreen';

const SettingsPage = () => {
  const { getAuthToken } = useAuth();
  const { darkMode: currentTheme, setDarkMode } = useTheme();
  
  const [settings, setSettings] = useState({
    darkMode: false,
    notifications: true,
    backupEnabled: true
  });
  
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const attributes = await fetchUserAttributes();
        const darkModeValue = attributes['custom:dark_mode'];
        const isDarkMode = darkModeValue === 'true' || darkModeValue === true;
        
        setSettings(prev => ({
          ...prev,
          darkMode: isDarkMode
        }));
        
        console.log('Loaded dark mode setting from Cognito:', isDarkMode);
        
      } catch (error) {
        console.error('Failed to load settings:', error);
        setSettings(prev => ({
          ...prev,
          darkMode: currentTheme
        }));
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [currentTheme]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveStatus('Saving settings...');
    
    try {
      await updateUserAttributes({
        userAttributes: {
          'custom:dark_mode': settings.darkMode.toString()
        }
      });
      
      setDarkMode(settings.darkMode);
      setSaveStatus('Settings saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus(`Error saving settings: ${error.message}`);
      setTimeout(() => setSaveStatus(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleReSync = async () => {
    if (confirmText !== 'confirm') {
      return;
    }

    setShowConfirmDialog(false);
    setConfirmText('');
    setSyncing(true);
    setSyncStatus('Loading stored credentials...');
    
    try {
      const authToken = await getAuthToken();
      
      // Get stored credentials
      const checkResponse = await fetch(`${process.env.REACT_APP_API_ENDPOINT}?action=check-data&include_credentials=true`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (!checkResponse.ok) {
        throw new Error('Failed to load credentials');
      }
      
      const userData = await checkResponse.json();
      
      if (!userData.credentials) {
        throw new Error('No stored credentials found');
      }
      
      setSyncStatus('Deleting old data and syncing...');
      
      // Use stored credentials to re-sync (this will overwrite existing data)
      const result = await syncWordPressStore(userData.credentials, authToken);
      
      if (result.success) {
        setSyncStatus('Sync completed successfully!');
        setTimeout(() => {
          setSyncStatus('');
          window.location.reload(); // Refresh to load new data
        }, 2000);
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (err) {
      console.error('Resync error:', err);
      setSyncStatus(`Error: ${err.message}`);
      setTimeout(() => setSyncStatus(''), 5000);
    }
    
    setSyncing(false);
  };

  const ConfirmDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Confirm Re-sync</h3>
          <button
            onClick={() => {
              setShowConfirmDialog(false);
              setConfirmText('');
            }}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-300 mb-3">
            This will delete all existing data and replace it with fresh data from your WordPress store.
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
            Type <strong>confirm</strong> to proceed:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Type 'confirm'"
          />
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowConfirmDialog(false);
              setConfirmText('');
            }}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleReSync}
            disabled={confirmText !== 'confirm'}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Re-sync Now
          </button>
        </div>
      </div>
    </div>
  );

  if (syncing) {
    return <LoadingScreen message={syncStatus} />;
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-73px)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  const hasUnsavedChanges = settings.darkMode !== currentTheme;

  return (
    <div className="p-6 max-w-4xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-73px)]">
      {showConfirmDialog && <ConfirmDialog />}
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your application preferences</p>
      </div>

      <div className="space-y-6">
        {/* Sync Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sync Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Manual Re-sync</label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Delete all data and refresh from WordPress</p>
              </div>
              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={syncing}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Re-sync Now'}
              </button>
            </div>
            
            {syncStatus && (
              <div className={`p-3 rounded-lg text-sm ${
                syncStatus.includes('Error') 
                  ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' 
                  : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              }`}>
                {syncStatus}
              </div>
            )}
          </div>
        </div>

        {/* Theme Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Globe className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Dark Mode</label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Use dark theme for better visibility in low light</p>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.darkMode}
                  onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                  className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
                {hasUnsavedChanges && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    {settings.darkMode ? 'Dark' : 'Light'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Other settings sections remain the same... */}
        
        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={saving || !hasUnsavedChanges}
            className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {saveStatus && (
          <div className={`p-4 rounded-lg text-sm ${
            saveStatus.includes('Error') 
              ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' 
              : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
          }`}>
            {saveStatus}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;