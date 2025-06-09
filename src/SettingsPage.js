import React, { useState, useEffect } from 'react';
import { Save, Bell, Shield, Globe, Zap, RefreshCw } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { fetchUserAttributes, getCurrentUser, updateUserAttributes } from 'aws-amplify/auth';
import { syncWordPressStore } from './api';
import LoadingScreen from './LoadingScreen';

const SettingsPage = () => {
  const { getAuthToken } = useAuth();
  const { darkMode: currentTheme, setDarkMode } = useTheme();
  
  // Local settings state (not applied until saved)
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

  // Load settings from Cognito on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const attributes = await fetchUserAttributes();
        
        // Parse dark mode from Cognito (stored as string)
        const darkModeValue = attributes['custom:dark_mode'];
        const isDarkMode = darkModeValue === 'true' || darkModeValue === true;
        
        setSettings(prev => ({
          ...prev,
          darkMode: isDarkMode
        }));
        
        console.log('Loaded dark mode setting from Cognito:', isDarkMode);
        
      } catch (error) {
        console.error('Failed to load settings:', error);
        // Fallback to current theme if can't load from Cognito
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
      // Use the Amplify v6 method
      await updateUserAttributes({
        userAttributes: {
          'custom:dark_mode': settings.darkMode.toString()
        }
      });
      
      // Apply the theme change immediately after successful save
      setDarkMode(settings.darkMode);
      
      setSaveStatus('Settings saved successfully!');
      console.log('Dark mode preference saved to Cognito:', settings.darkMode);
      
      // Clear status after 3 seconds
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
    setSyncing(true);
    setSyncStatus('Loading stored credentials...');
    
    try {
      const authToken = await getAuthToken();
      
      // First get stored credentials from S3 via our API
      const checkResponse = await fetch(`${process.env.REACT_APP_API_ENDPOINT}?action=check-data`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (!checkResponse.ok) {
        throw new Error('Failed to load credentials');
      }
      
      const userData = await checkResponse.json();
      
      if (!userData.credentials) {
        throw new Error('No stored credentials found');
      }
      
      setSyncStatus('Syncing with WordPress...');
      
      // Use stored credentials to re-sync
      const result = await syncWordPressStore(userData.credentials, authToken);
      
      if (result.success) {
        setSyncStatus('Sync completed successfully!');
        setTimeout(() => setSyncStatus(''), 3000);
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (err) {
      setSyncStatus(`Error: ${err.message}`);
      setTimeout(() => setSyncStatus(''), 5000);
    }
    
    setSyncing(false);
  };

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

  // Check if there are unsaved changes
  const hasUnsavedChanges = settings.darkMode !== currentTheme;

  return (
    <div className="p-6 max-w-4xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-73px)]">
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
                <p className="text-sm text-gray-500 dark:text-gray-400">Update Karoosync with latest WordPress changes</p>
              </div>
              <button
                onClick={handleReSync}
                disabled={syncing}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Re-sync Now'}
              </button>
            </div>
            
            {syncStatus && (
              <div className={`p-3 rounded-lg text-sm ${
                syncStatus.includes('Error') 
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800' 
                  : syncStatus.includes('successfully')
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                  : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
              }`}>
                {syncStatus}
              </div>
            )}
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Globe className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Dark Mode</label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Switch to dark theme {hasUnsavedChanges && '(requires save to apply)'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {hasUnsavedChanges && (
                  <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 rounded-full">
                    Unsaved
                  </span>
                )}
                <input
                  type="checkbox"
                  checked={settings.darkMode}
                  onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                  className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
              </div>
            </div>
            
            {/* Current Theme Status */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Current theme:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {currentTheme ? 'Dark' : 'Light'}
                </span>
              </div>
              {hasUnsavedChanges && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600 dark:text-gray-400">Will change to:</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {settings.darkMode ? 'Dark' : 'Light'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Bell className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Email Notifications</label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receive updates about sync status (Coming soon)</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                disabled
                title="Feature not yet implemented"
              />
            </div>
          </div>
        </div>

        {/* Security & Backup */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Security & Backup</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Automatic Backups</label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Create backups before major changes (Coming soon)</p>
              </div>
              <input
                type="checkbox"
                checked={settings.backupEnabled}
                onChange={(e) => handleSettingChange('backupEnabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                disabled
                title="Feature not yet implemented"
              />
            </div>
          </div>
        </div>

        {/* Save Status */}
        {saveStatus && (
          <div className={`p-4 rounded-lg text-sm ${
            saveStatus.includes('Error') 
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800' 
              : saveStatus.includes('Saving')
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
              : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
          }`}>
            {saveStatus}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={saving || !hasUnsavedChanges}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors ${
              hasUnsavedChanges 
                ? 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600' 
                : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
            } ${saving ? 'opacity-50' : ''}`}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : hasUnsavedChanges ? 'Save Settings' : 'No Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;