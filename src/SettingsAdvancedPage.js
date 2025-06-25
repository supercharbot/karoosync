import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { fetchUserAttributes, updateUserAttributes } from 'aws-amplify/auth';
import { 
  startAsyncResync, 
  createBackup, 
  getBackupStatus, 
  downloadBackup, 
  exportData, 
  deleteAccount 
} from './api';
import { 
  Shield, 
  Zap, 
  RefreshCw, 
  Download, 
  Database, 
  Trash2, 
  AlertTriangle,
  Moon,
  Sun,
  X,
  Loader2,
  CheckCircle 
} from 'lucide-react';

// Modal Components (inline)
const DeleteAccountModal = React.memo(({ 
  isVisible, 
  onClose, 
  deleteConfirmText, 
  setDeleteConfirmText, 
  isDeleting, 
  onDeleteAccount 
}) => {
  if (!isVisible) return null;

  return (
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
            This action cannot be undone. All your data will be permanently deleted.
          </p>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">
            Type <strong>DELETE</strong> to confirm:
          </p>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Type DELETE"
            autoComplete="off"
          />
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onDeleteAccount}
            disabled={deleteConfirmText !== 'DELETE' || isDeleting}
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
});

const BackupModal = React.memo(({ 
  isVisible, 
  onClose, 
  backupName, 
  setBackupName, 
  currentBackup, 
  isCreatingBackup, 
  onCreateBackup 
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Create Backup
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={isCreatingBackup}
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
              autoComplete="off"
              disabled={isCreatingBackup}
            />
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              This backup will include all your products in comprehensive CSV format with {currentBackup.exists ? currentBackup.fieldCount || '38' : '38'} fields for easy viewing in Excel or Google Sheets.
            </p>
          </div>

          {isCreatingBackup && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Creating backup...
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Processing your products and generating CSV file
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isCreatingBackup}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {isCreatingBackup ? 'Please wait...' : 'Cancel'}
          </button>
          <button
            onClick={onCreateBackup}
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
});

const DownloadModal = React.memo(({ 
  isVisible, 
  onClose, 
  downloadFormat, 
  setDownloadFormat, 
  selectedDataTypes, 
  setSelectedDataTypes, 
  isDownloading, 
  onExportData 
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Export Data
          </h3>
          <button
            onClick={onClose}
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
              <option value="json">JSON Format (Complete Data)</option>
              <option value="csv">CSV Format (Comprehensive)</option>
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
                        setSelectedDataTypes(prev => [...prev, item.id]);
                      } else {
                        setSelectedDataTypes(prev => prev.filter(type => type !== item.id));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDownloading}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onExportData}
            disabled={isDownloading || selectedDataTypes.length === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              'Export Data'
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

const SettingsAdvancedPage = ({ onStartResync }) => {
  const { user, getAuthToken } = useAuth();
  const { darkMode: currentTheme, setDarkMode } = useTheme();
  
  // Settings state
  const [settings, setSettings] = useState({
    darkMode: currentTheme
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  
  // Resync state
  const [isResyncStarting, setIsResyncStarting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  
  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Backup state
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [currentBackup, setCurrentBackup] = useState({
    exists: false,
    name: '',
    date: '',
    size: '',
    status: '',
    productCount: 0,
    fieldCount: 0
  });
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  
  // Download state
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('json');
  const [selectedDataTypes, setSelectedDataTypes] = useState(['products', 'categories']);
  const [isDownloading, setIsDownloading] = useState(false);
  const [operationStatus, setOperationStatus] = useState('');

  // Load backup status
  const loadBackupStatus = useCallback(async () => {
    try {
      const authToken = await getAuthToken();
      const result = await getBackupStatus(authToken);
      
      if (result.success && result.backup.exists) {
        setCurrentBackup(result.backup);
      } else {
        setCurrentBackup({
          exists: false,
          name: '',
          date: '',
          size: '',
          status: '',
          productCount: 0,
          fieldCount: 0
        });
      }
    } catch (error) {
      console.error('Failed to load backup status:', error);
    }
  }, [getAuthToken]);

  // Initialize settings
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
    loadBackupStatus();
  }, [currentTheme, loadBackupStatus]);

  // Settings handlers
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

  // Resync handlers
  const handleReSync = async () => {
    setShowConfirmDialog(false);
    setConfirmText('');
    setIsResyncStarting(true);

    try {
      const authToken = await getAuthToken();
      const result = await startAsyncResync(authToken);

      if (result.success && result.syncId) {
        console.log('✅ Resync started successfully, redirecting to progress screen');
        if (onStartResync) {
          onStartResync(result.syncId);
        }
      } else {
        throw new Error(result.error || 'Failed to start resync');
      }
    } catch (error) {
      console.error('❌ Resync start error:', error);
      setOperationStatus(`Error starting resync: ${error.message}`);
      setTimeout(() => setOperationStatus(''), 5000);
      setIsResyncStarting(false);
    }
  };

  // Backup handlers
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    
    try {
      const authToken = await getAuthToken();
      const result = await createBackup(backupName || 'Product Backup', authToken);
      
      if (result.success) {
        setCurrentBackup(result.backup);
        setShowBackupModal(false);
        setBackupName('');
        setOperationStatus('Backup created successfully!');
        setTimeout(() => setOperationStatus(''), 3000);
      } else {
        setOperationStatus(`Backup error: ${result.error}`);
        setTimeout(() => setOperationStatus(''), 5000);
      }
    } catch (error) {
      setOperationStatus(`Backup error: ${error.message}`);
      setTimeout(() => setOperationStatus(''), 5000);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const authToken = await getAuthToken();
      const result = await downloadBackup(authToken);
      
      if (result.success) {
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setOperationStatus('Backup download started...');
        setTimeout(() => setOperationStatus(''), 3000);
      } else {
        setOperationStatus(`Download error: ${result.error}`);
        setTimeout(() => setOperationStatus(''), 5000);
      }
    } catch (error) {
      setOperationStatus(`Download error: ${error.message}`);
      setTimeout(() => setOperationStatus(''), 5000);
    }
  };

  // Export handlers
  const handleExportData = async () => {
    setIsDownloading(true);
    try {
      const authToken = await getAuthToken();
      const result = await exportData(downloadFormat, selectedDataTypes, authToken);
      
      if (result.success) {
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setOperationStatus(`Data export started. Download should begin automatically.`);
        setTimeout(() => setOperationStatus(''), 5000);
        
        setShowDownloadModal(false);
        setSelectedDataTypes(['products', 'categories']);
      } else {
        setOperationStatus(`Export error: ${result.error}`);
        setTimeout(() => setOperationStatus(''), 5000);
      }
    } catch (error) {
      setOperationStatus(`Export error: ${error.message}`);
      setTimeout(() => setOperationStatus(''), 5000);
    } finally {
      setIsDownloading(false);
    }
  };

  // Delete account handlers
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    
    try {
      const authToken = await getAuthToken();
      const result = await deleteAccount(authToken);
      
      if (result.success) {
        setOperationStatus('Account deleted successfully. You will be logged out.');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        setOperationStatus(`Account deletion failed: ${result.error}`);
        setTimeout(() => setOperationStatus(''), 5000);
      }
    } catch (error) {
      setOperationStatus(`Account deletion error: ${error.message}`);
      setTimeout(() => setOperationStatus(''), 5000);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
  };

  // Confirm dialog component
  const ConfirmDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-6 w-6 text-amber-500 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Confirm Re-sync
          </h3>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            This will completely replace your current data with fresh data from your WordPress store.
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

  // Loading state
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
      
      {/* External Modals */}
      <DeleteAccountModal 
        isVisible={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteConfirmText('');
        }}
        deleteConfirmText={deleteConfirmText}
        setDeleteConfirmText={setDeleteConfirmText}
        isDeleting={isDeleting}
        onDeleteAccount={handleDeleteAccount}
      />
      
      <BackupModal 
        isVisible={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        backupName={backupName}
        setBackupName={setBackupName}
        currentBackup={currentBackup}
        isCreatingBackup={isCreatingBackup}
        onCreateBackup={handleCreateBackup}
      />
      
      <DownloadModal 
        isVisible={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        downloadFormat={downloadFormat}
        setDownloadFormat={setDownloadFormat}
        selectedDataTypes={selectedDataTypes}
        setSelectedDataTypes={setSelectedDataTypes}
        isDownloading={isDownloading}
        onExportData={handleExportData}
      />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your application preferences and account</p>
      </div>

      <div className="space-y-6">
        {/* Appearance Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            {settings.darkMode ? 
              <Moon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" /> : 
              <Sun className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
            }
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Dark Mode</label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Toggle between light and dark themes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.darkMode}
                  onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            {hasUnsavedChanges && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
                <p className="text-sm text-amber-600 dark:text-amber-400">You have unsaved changes</p>
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 text-sm font-medium"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
            
            {saveStatus && (
              <div className={`p-3 rounded-lg text-sm ${
                saveStatus.includes('Error') 
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200' 
                  : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
              }`}>
                {saveStatus}
              </div>
            )}
          </div>
        </div>

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
                disabled={isResyncStarting}
                className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-600 text-sm font-medium rounded-lg text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isResyncStarting ? 'animate-spin' : ''}`} />
                {isResyncStarting ? 'Starting...' : 'Re-sync Now'}
              </button>
            </div>
          </div>
        </div>

        {/* Backup & Export */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Database className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Backup & Export</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Create Backup</label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Save a snapshot of your current data</p>
              </div>
              <button
                onClick={() => setShowBackupModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <Shield className="h-4 w-4 mr-2" />
                Create Backup
              </button>
            </div>
            
            {currentBackup.exists ? (
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="flex items-center">
                    <Database className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{currentBackup.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Created on {currentBackup.date} • {currentBackup.size} • {currentBackup.productCount} products • {currentBackup.fieldCount} fields
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
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <div className="text-center py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  <Shield className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No backup created yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Create your first comprehensive backup to secure your product data</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-600 pt-4">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Export Data</label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Download your product data and categories in JSON or comprehensive CSV format</p>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">JSON (Complete)</span>
                  <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">CSV (38 Fields)</span>
                </div>
              </div>
              <button
                onClick={() => setShowDownloadModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-red-200 dark:border-red-700 p-6">
          <div className="flex items-center mb-4">
            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">Danger Zone</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-red-900 dark:text-red-100">Delete Account</label>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* Operation Status Messages */}
        {operationStatus && (
          <div className={`p-4 rounded-lg text-sm ${
            operationStatus.includes('Error') || operationStatus.includes('error') || operationStatus.includes('failed')
              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200' 
              : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
          }`}>
            {operationStatus}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsAdvancedPage;