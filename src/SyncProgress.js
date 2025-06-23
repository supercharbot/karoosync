import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getSyncStatus } from './api';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

const SyncProgress = ({ syncId, onComplete, onError }) => {
  const { getAuthToken } = useAuth();
  const [status, setStatus] = useState({
    status: 'started',
    progress: 0,
    message: 'Initializing sync...'
  });
  
  // Use useRef to store the interval ID to ensure proper cleanup
  const intervalRef = useRef(null);
  const isCompletedRef = useRef(false);

  useEffect(() => {
    console.log('🔄 SyncProgress mounted, starting polling');
    startPolling();
    
    // Cleanup function
    return () => {
      console.log('🔄 SyncProgress unmounting, clearing interval');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const startPolling = () => {
    const pollStatus = async () => {
      // Don't poll if already completed
      if (isCompletedRef.current) {
        console.log('🔄 Sync already completed, skipping poll');
        return;
      }

      try {
        console.log('📊 Getting sync status...');
        const authToken = await getAuthToken();
        const result = await getSyncStatus(authToken);
        
        if (result.status) {
          setStatus(result);
          
          if (result.status === 'completed') {
            console.log('✅ Sync completed, stopping polling');
            isCompletedRef.current = true;
            
            // Clear the interval immediately
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            
            // Go straight to dashboard without showing completion screen
            console.log('🎉 Calling onComplete callback - going to dashboard');
            onComplete(result.result);
            
          } else if (result.status === 'failed') {
            console.log('❌ Sync failed, stopping polling');
            isCompletedRef.current = true;
            
            // Clear the interval immediately
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            
            onError(result.error || 'Sync failed');
          }
        }
      } catch (error) {
        console.error('❌ Error polling sync status:', error);
        // Don't stop polling on API errors, just log them
      }
    };

    // Initial poll
    pollStatus();
    
    // Set up interval polling
    intervalRef.current = setInterval(pollStatus, 2000);
    console.log('⏰ Polling interval set:', intervalRef.current);
  };

  const getStatusIcon = () => {
    switch (status.status) {
      case 'started':
      case 'processing':
        return (
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
        );
      case 'completed':
        return (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
        );
      case 'failed':
        return (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-white" />
          </div>
        );
      default:
        return (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
            <Clock className="w-8 h-8 text-white" />
          </div>
        );
    }
  };

  const getProgressBarClass = () => {
    switch (status.status) {
      case 'started':
      case 'processing':
        return 'bg-gradient-to-r from-blue-500 to-purple-600';
      case 'completed':
        return 'bg-gradient-to-r from-green-500 to-green-600';
      case 'failed':
        return 'bg-gradient-to-r from-red-500 to-red-600';
      default:
        return 'bg-gradient-to-r from-gray-400 to-gray-500';
    }
  };

  const formatProgress = (progress) => {
    // Remove decimals and ensure it's between 0-100
    return Math.floor(Math.min(Math.max(progress || 0, 0), 100));
  };

  const getProgressText = () => {
    const progress = formatProgress(status.progress);
    
    if (status.status === 'completed') return 'Complete';
    if (status.status === 'failed') return 'Failed';
    
    if (progress === 0) return 'Starting...';
    if (progress < 25) return 'Beginning...';
    if (progress < 50) return 'In Progress...';
    if (progress < 75) return 'Processing...';
    if (progress < 95) return 'Almost Done...';
    return 'Finalizing...';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            {getStatusIcon()}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {status.status === 'completed' ? 'Sync Complete!' : 
             status.status === 'failed' ? 'Sync Failed' : 
             'Syncing Your Store'}
          </h2>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {status.message || 'Processing your WooCommerce data...'}
          </p>

          {status.status !== 'completed' && status.status !== 'failed' && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Progress</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {getProgressText()}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ease-out ${getProgressBarClass()}`}
                  style={{ width: `${formatProgress(status.progress)}%` }}
                />
              </div>
              <div className="mt-2 text-center">
                <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  {formatProgress(status.progress)}%
                </span>
              </div>
            </div>
          )}

          {status.status === 'completed' && status.result && (
            <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-6">
              <div className="text-sm text-green-800 dark:text-green-200">
                <div className="font-medium mb-2">Sync Summary:</div>
                <div className="space-y-1">
                  <div>📦 Products: {status.result.metadata?.totalProducts || 'N/A'}</div>
                  <div>📁 Categories: {status.result.metadata?.totalCategories || 'N/A'}</div>
                  <div>🏷️ Attributes: {status.result.metadata?.totalAttributes || 'N/A'}</div>
                </div>
              </div>
            </div>
          )}

          {status.status === 'failed' && (
            <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
              <div className="text-sm text-red-800 dark:text-red-200">
                <div className="font-medium mb-1">Error Details:</div>
                <div>{status.error || 'Unknown error occurred'}</div>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div>Sync ID: {syncId}</div>
            {status.startedAt && (
              <div>Started: {new Date(status.startedAt).toLocaleTimeString()}</div>
            )}
          </div>

          {status.status === 'failed' && (
            <button
              onClick={() => window.location.reload()}
              className="mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm font-medium shadow-lg"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SyncProgress;