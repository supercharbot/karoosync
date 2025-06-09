import React, { useState } from 'react';
import { Save, Bell, Shield, Globe, Zap, RefreshCw } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { syncWordPressStore } from './api';
import LoadingScreen from './LoadingScreen';

const SettingsPage = () => {
  const { getAuthToken } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [settings, setSettings] = useState({
    notifications: true,
    backupEnabled: true
  });
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
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

  const handleSave = () => {
    console.log('Saving settings:', settings);
    // Note: These settings don't have backend infrastructure yet
  };

  if (syncing) {
    return <LoadingScreen message={syncStatus} />;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your application preferences</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Zap className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Sync Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Manual Re-sync</label>
                <p className="text-sm text-gray-500">Update Karoosync with latest WordPress changes</p>
              </div>
              <button
                onClick={handleReSync}
                disabled={syncing}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Re-sync Now'}
              </button>
            </div>
            
            {syncStatus && (
              <div className={`p-3 rounded-lg text-sm ${
                syncStatus.includes('Error') 
                  ? 'bg-red-50 text-red-700 border border-red-200' 
                  : syncStatus.includes('successfully')
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {syncStatus}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Bell className="h-5 w-5 text-green-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Email Notifications</label>
                <p className="text-sm text-gray-500">Receive updates about sync status (Coming soon)</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled
                title="Feature not yet implemented"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Shield className="h-5 w-5 text-purple-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Security & Backup</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Automatic Backups</label>
                <p className="text-sm text-gray-500">Create backups before major changes (Coming soon)</p>
              </div>
              <input
                type="checkbox"
                checked={settings.backupEnabled}
                onChange={(e) => handleSettingChange('backupEnabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled
                title="Feature not yet implemented"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Globe className="h-5 w-5 text-orange-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Appearance</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Dark Mode</label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Switch to dark theme</p>
              </div>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={toggleDarkMode}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;