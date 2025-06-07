import React, { createContext, useContext, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { signOut, fetchAuthSession } from 'aws-amplify/auth';
import { awsConfig } from './aws-config';

Amplify.configure(awsConfig);

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [hasSubscription, setHasSubscription] = useState(true);

  // This will be called by ProtectedRoute when Authenticator confirms user
  const setAuthenticatedUser = (authenticatedUser) => {
    console.log('✅ Setting authenticated user:', authenticatedUser?.username);
    setUser(authenticatedUser);
    setHasSubscription(true);
  };

  const logout = async () => {
    try {
      console.log('🔄 Logging out...');
      await signOut();
      setUser(null);
      setHasSubscription(false);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  const getAuthToken = async () => {
    try {
      console.log('🔄 Getting auth token...');
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (token) {
        console.log('✅ Auth token retrieved successfully');
        return token;
      } else {
        console.warn('⚠️ No token found in session');
        return null;
      }
    } catch (error) {
      console.error('❌ Token retrieval failed:', error);
      return null;
    }
  };

  const value = {
    user,
    hasSubscription,
    loading: false, // No loading since we don't check auth state here
    logout,
    getAuthToken,
    setAuthenticatedUser // Expose this so ProtectedRoute can set the user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};