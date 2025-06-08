import React from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Store } from 'lucide-react';
import { useAuth } from './AuthContext';

const UserWrapper = ({ user, children }) => {
  const { setUser } = useAuth();

  React.useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [user, setUser]);

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