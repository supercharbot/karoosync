import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Globe, 
  Zap, 
  RefreshCw, 
  X, 
  Download, 
  Trash2, 
  Archive, 
  AlertTriangle,
  Loader2,
  CheckCircle,
  Database,
  User
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { fetchUserAttributes, getCurrentUser, updateUserAttributes } from 'aws-amplify/auth';
import { 
  syncWordPressStore, 
  deleteAccount, 
  createBackup, 
  getBackupStatus, 
  downloadBackup, 
  exportData 
} from './api';
import LoadingScreen from './LoadingScreen';

const SettingsPage = () => {
  const { getAuthToken, logout } = useAuth();
  const { darkMode: currentTheme, setDarkMode } = useTheme();
  
  const [settings, setSettings] = useState({
    darkMode: false
  });
  
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Account Management States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [backupName, setBackupName] = useState('');
  const [downloadFormat, setDownloadFormat] = useState('json');
  const [selectedDataTypes, setSelectedDataTypes] = useState(['products', 'categories']);
  const [operationStatus, setOperationStatus] = useState('');

  // Current backup status
  const [currentBackup, setCurrentBackup] = useState({
    exists: false,
    name: '',
    date: '',
    size: '',
    status: ''
  });

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

    const loadBackupStatus = async () => {
      try {
        const authToken = await getAuthToken();
        const result = await getBackupStatus(authToken);
        if (result.success && result.backup.exists) {
          setCurrentBackup(result.backup);
        }
      } catch (error) {
        console.error('Failed to load backup status:', error);
      }
    };

    loadSettings();
    loadBackupStatus();
  }, [currentTheme, getAuthToken]);

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
      setSaveStatus('Error saving settings. Please try again.');
      setTimeout(() => setSaveStatus(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleReSync = async () => {
    setShowConfirmDialog(false);
    setConfirmText('');
    setSyncing(true);
    setSyncStatus('Initializing sync...');

    try {
      const authToken = await getAuthToken();
      const result = await syncWordPressStore(authToken, (status) => {
        setSyncStatus(status);
      });

      if (result.success) {
        setSyncStatus('Sync completed successfully!');
        setTimeout(() => setSyncStatus(''), 5000);
      } else {
        setSyncStatus(`Sync failed: ${result.error}`);
        setTimeout(() => setSyncStatus(''), 10000);
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus(`Error during sync: ${error.message}`);
      setTimeout(() => setSyncStatus(''), 10000);
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const authToken = await getAuthToken();
      const result = await createBackup(backupName || 'Product Backup', authToken);
      
      if (result.success) {
        setCurrentBackup(result.backup);
        setOperationStatus('Backup created successfully!');
        setShowBackupModal(false);
        setBackupName('');
      } else {
        setOperationStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      setOperationStatus(`Error: ${error.message}`);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const authToken = await getAuthToken();
      const result = await downloadBackup(authToken);
      
      if (result.success) {
        // Create download link
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = `karoosync-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setOperationStatus('Backup download started...');
      } else {
        setOperationStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      setOperationStatus(`Error: ${error.message}`);
    }
  };

  const handleExportData = async () => {
    setIsDownloading(true);
    try {
      const authToken = await getAuthToken();
      const result = await exportData(downloadFormat, selectedDataTypes, authToken);
      
      if (result.success) {
        // Create download link
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setOperationStatus(`Data export started. Downloaded ${result.size}.`);
        setShowDownloadModal(false);
      } else {
        setOperationStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      setOperationStatus(`Error: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const authToken = await getAuthToken();
      const result = await deleteAccount(authToken);
      
      if (result.success) {
        setOperationStatus('Account deleted successfully. Logging out...');
        setTimeout(() => {
          logout();
        }, 2000);
      } else {
        setOperationStatus(`Error: ${result.error || 'Failed to delete account'}`);
      }
    } catch (error) {
      setOperationStatus(`Error: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
  };

  // Delete Account Modal
  const DeleteAccountModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mr-4">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Delete Account
          </h3>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            This action cannot be undone. This will permanently delete your account and remove all associated data including:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1 mb-4">
            <li>All product data and synchronization settings</li>
            <li>Account preferences and configurations</li>
            <li>All backups and stored information</li>
            <li>Access to the KarooSync platform</li>
          </ul>
          <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-4">
            Type <strong>DELETE MY ACCOUNT</strong> to confirm:
          </p>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            autoComplete="off"
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Type 'DELETE MY ACCOUNT'"
          />
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowDeleteConfirm(false);
              setDeleteConfirmText('');
            }}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteAccount}
            disabled={deleteConfirmText !== 'DELETE MY ACCOUNT' || isDeleting}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Account'
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Backup Creation Modal
  const BackupModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Create Product Backup
          </h3>
          <button
            onClick={() => setShowBackupModal(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4 mb-6">
          {currentBackup.exists && (
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> Creating a new backup will replace your existing backup from {currentBackup.date}.
              </p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Backup Name (Optional)
            </label>
            <input
              type="text"
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Product Backup"
            />
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              This backup will include all your products, categories, tags, and current settings. 
              You can download and restore this backup at any time.
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowBackupModal(false)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateBackup}
            disabled={isCreatingBackup}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isCreatingBackup ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              currentBackup.exists ? 'Replace Backup' : 'Create Backup'
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Data Download Modal
  const DownloadModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Download Data Export
          </h3>
          <button
            onClick={() => setShowDownloadModal(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Export Format
            </label>
            <select
              value={downloadFormat}
              onChange={(e) => setDownloadFormat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="json">JSON Format</option>
              <option value="csv">CSV Format</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Data to Export
            </label>
            <div className="space-y-2">
              {[
                { id: 'products', label: 'Products' },
                { id: 'categories', label: 'Categories' }
              ].map((item) => (
                <label key={item.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedDataTypes.includes(item.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDataTypes([...selectedDataTypes, item.id]);
                      } else {
                        setSelectedDataTypes(selectedDataTypes.filter(type => type !== item.id));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Your data export will be prepared and downloaded as a file containing the selected data in your chosen format.
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowDownloadModal(false)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleExportData}
            disabled={selectedDataTypes.length === 0 || isDownloading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Preparing...
              </>
            ) : (
              'Download Data'
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const ConfirmDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Confirm Re-sync
        </h3>
        <div className="mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            This will fetch all products from your WordPress store and update the local database. 
            Any local changes will be overwritten.
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
      {showDeleteConfirm && <DeleteAccountModal />}
      {showBackupModal && <BackupModal />}
      {showDownloadModal && <DownloadModal />}
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your application preferences and account</p>
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
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Force Re-sync</label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Re-download all products from WordPress store</p>
              </div>
              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={syncing}
                className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-600 text-sm font-medium rounded-lg text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 transition-colors"
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

        {/* Account Management Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-6">
            <User className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Account Management</h2>
          </div>
          
          <div className="space-y-6">
            {/* Data Export */}
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Download className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                    <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                      Export Your Data
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Download your product data and categories in JSON or CSV format for backup or migration purposes.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">JSON</span>
                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">CSV</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDownloadModal(true)}
                  className="ml-4 inline-flex items-center px-4 py-2 border border-green-300 dark:border-green-600 text-sm font-medium rounded-lg text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </button>
              </div>
            </div>

            {/* Backup Management */}
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Archive className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                    <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                      Product Backup
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Create a secure backup of all your products that can be restored if needed.
                  </p>
                </div>
                <button
                  onClick={() => setShowBackupModal(true)}
                  className="ml-4 inline-flex items-center px-4 py-2 border border-blue-300 dark:border-blue-600 text-sm font-medium rounded-lg text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  {currentBackup.exists ? 'Update Backup' : 'Create Backup'}
                </button>
              </div>
              
              {/* Current Backup Status */}
              {currentBackup.exists ? (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Current Backup</h4>
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="flex items-center">
                      <Database className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{currentBackup.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Created on {currentBackup.date} • {currentBackup.size}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ready
                      </span>
                      <button 
                        onClick={handleDownloadBackup}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-center py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  <Archive className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No backup created yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Create your first backup to secure your product data</p>
                </div>
              )}
            </div>

            {/* Account Deletion */}
            <div className="border border-red-200 dark:border-red-600 rounded-lg p-4 bg-red-50/50 dark:bg-red-900/10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                    <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                      Delete Account
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <div className="flex items-center text-xs text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    This will remove all products, settings, and backups
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="ml-4 inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-600 text-sm font-medium rounded-lg text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
        
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

        {/* Status Messages */}
        {saveStatus && (
          <div className={`p-4 rounded-lg text-sm ${
            saveStatus.includes('Error') 
              ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' 
              : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
          }`}>
            {saveStatus}
          </div>
        )}

        {operationStatus && (
          <div className={`p-4 rounded-lg text-sm ${
            operationStatus.includes('Error') || operationStatus.includes('deletion')
              ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' 
              : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
          }`}>
            {operationStatus}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;