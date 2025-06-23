import React, { useState, useEffect } from 'react';
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
  const [pollingInterval, setPollingInterval] = useState(null);

  useEffect(() => {
    startPolling();
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  const startPolling = () => {
    const pollStatus = async () => {
      try {
        const authToken = await getAuthToken();
        const result = await getSyncStatus(authToken);
        
        if (result.status) {
          setStatus(result);
          
          if (result.status === 'completed') {
            clearInterval(pollingInterval);
            setTimeout(() => onComplete(result.result), 1000);
          } else if (result.status === 'failed') {
            clearInterval(pollingInterval);
            onError(result.error || 'Sync failed');
          }
        }
      } catch (error) {
        console.error('Error polling sync status:', error);
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 2000);
    setPollingInterval(interval);
  };

  const getStatusIcon = () => {
    switch (status.status) {
      case 'started':
      case 'processing':
        return <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'failed':
        return <XCircle className="w-8 h-8 text-red-500" />;
      default:
        return <Clock className="w-8 h-8 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'started':
      case 'processing':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatProgress = (progress) => {
    return Math.min(Math.max(progress || 0, 0), 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            {getStatusIcon()}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {status.status === 'completed' ? 'Sync Complete!' : 
             status.status === 'failed' ? 'Sync Failed' : 
             'Syncing Your Store'}
          </h2>

          <p className="text-gray-600 mb-6">
            {status.message || 'Processing your WooCommerce data...'}
          </p>

          {status.status !== 'completed' && status.status !== 'failed' && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Progress</span>
                <span className="text-sm font-medium text-gray-700">
                  {formatProgress(status.progress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ease-out ${getStatusColor()}`}
                  style={{ width: `${formatProgress(status.progress)}%` }}
                />
              </div>
            </div>
          )}

          {status.status === 'completed' && status.result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="text-sm text-green-800">
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="text-sm text-red-800">
                <div className="font-medium mb-1">Error Details:</div>
                <div>{status.error || 'Unknown error occurred'}</div>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 space-y-1">
            <div>Sync ID: {syncId}</div>
            <div>Started: {new Date(status.startedAt).toLocaleTimeString()}</div>
          </div>

          {status.status === 'failed' && (
            <button
              onClick={() => window.location.reload()}
              className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
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