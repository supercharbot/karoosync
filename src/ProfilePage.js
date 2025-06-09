import React, { useState, useEffect } from 'react';
import { Save, User, Mail, Calendar, Clock } from 'lucide-react';
import { fetchUserAttributes, updateUserAttributes } from 'aws-amplify/auth';

const ProfilePage = ({ user }) => {
  const [profile, setProfile] = useState({
    name: '',
    email: ''
  });
  const [userInfo, setUserInfo] = useState({
    signUpTime: '',
    lastLogin: '',
    userId: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Load user data from Cognito
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const attributes = await fetchUserAttributes();
        
        setProfile({
          name: attributes.name || '',
          email: attributes.email || ''
        });

        setUserInfo({
          signUpTime: attributes['custom:sign_up_time'] || '',
          lastLogin: attributes['custom:last_login'] || '',
          userId: attributes.sub || user?.username || ''
        });

      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const handleInputChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('Saving...');

    try {
      await updateUserAttributes({
        name: profile.name,
        email: profile.email
      });
      
      setSaveStatus('Profile updated successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      setSaveStatus('Error updating profile');
      setTimeout(() => setSaveStatus(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Format dates for display
  const formatDate = (isoString) => {
    if (!isoString) return 'Not available';
    
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Australia/Sydney'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatMemberSince = (isoString) => {
    if (!isoString) return 'Not available';
    
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Australia/Sydney'
      });
    } catch (error) {
      return 'Not available';
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-73px)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-73px)]">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profile</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account information</p>
      </div>

      <div className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-6">
            <User className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Personal Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Enter your full name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="your.email@example.com"
              />
            </div>
          </div>

          {/* Save Status */}
          {saveStatus && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              saveStatus.includes('Error') 
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' 
                : saveStatus.includes('Saving')
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
            }`}>
              {saveStatus}
            </div>
          )}
        </div>

        {/* Account Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-6">
            <Mail className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Account Information</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">User ID</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{userInfo.userId}</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Account Status</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active & Verified</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400">
                Verified
              </span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Member Since</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{formatMemberSince(userInfo.signUpTime)}</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center py-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Last Login</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(userInfo.lastLogin)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-6">
            <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Account Login</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(userInfo.lastLogin)}</p>
                </div>
              </div>
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">Recent</span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Account Created</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatMemberSince(userInfo.signUpTime)}</p>
                </div>
              </div>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;