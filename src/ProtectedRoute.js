import React, { useState, useEffect } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import { fetchUserAttributes } from 'aws-amplify/auth';
import '@aws-amplify/ui-react/styles.css';
import { Store, CreditCard, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from './AuthContext';

const UserWrapper = ({ user, children }) => {
  const { setUser } = useAuth();
  const [hasSubscription, setHasSubscription] = useState(null); // null = checking, true/false = result
  const [isChecking, setIsChecking] = useState(false);

  React.useEffect(() => {
    if (user) {
      setUser(user);
      checkSubscription();
    }
  }, [user, setUser]);

  const checkSubscription = async () => {
    try {
      setIsChecking(true);
      console.log('🔍 Checking subscription status...');
      
      const attributes = await fetchUserAttributes();
      console.log('📋 User attributes:', Object.keys(attributes));
      
      const subscriptionStatus = attributes['custom:subscription_status'];
      console.log('🎫 Subscription status from Cognito:', subscriptionStatus);
      
      // Simple check: if status is 'active', user has subscription
      const isActive = subscriptionStatus === 'active';
      setHasSubscription(isActive);
      
      console.log('✅ Subscription check complete. Has subscription:', isActive);
    } catch (error) {
      console.error('❌ Error checking subscription:', error);
      setHasSubscription(false);
    } finally {
      setIsChecking(false);
    }
  };

  // Show loading while checking
  if (hasSubscription === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Loader className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-gray-900 font-medium">Checking subscription status...</span>
          </div>
          <p className="text-gray-600 text-sm">This will only take a moment</p>
        </div>
      </div>
    );
  }

  // Show subscription required screen
  if (!hasSubscription) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <CreditCard className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Subscription Required</h2>
          <p className="text-gray-600 mb-6">
            You need an active subscription to access Karoosync. Please subscribe to continue using all features.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
              <span className="font-medium text-blue-900">Current Status</span>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              No Active Subscription
            </span>
          </div>

          <div className="space-y-3">
            <a
              href="https://buy.stripe.com/test_dRm6oGh0F2OP9ykc4z8Zq00" // You'll replace this with your actual Stripe payment link
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors inline-block font-medium"
            >
              Subscribe Now - $19/month
            </a>
            <button
              onClick={checkSubscription}
              disabled={isChecking}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChecking ? (
                <>
                  <Loader className="w-4 h-4 animate-spin inline mr-2" />
                  Checking...
                </>
              ) : (
                'I\'ve Already Subscribed - Refresh Status'
              )}
            </button>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Signed in as: {user?.username}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // User has subscription - render the app
  return children;
};

const ProtectedRoute = ({ children }) => {
  return (
    <Authenticator
      formFields={{
        signUp: {
          email: { order: 1, isRequired: true },
          name: { order: 2, isRequired: true, label: 'Full Name' },
          password: { order: 3, isRequired: true },
          confirm_password: { order: 4, isRequired: true }
        }
      }}
      components={{
        Header() {
          return (
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
                <Store className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Karoosync</h1>
              <p className="text-gray-600 mt-2">WooCommerce Product Editor</p>
            </div>
          );
        }
      }}
    >
      {({ user }) => {
        return user ? <UserWrapper user={user}>{children}</UserWrapper> : null;
      }}
    </Authenticator>
  );
};

export default ProtectedRoute;