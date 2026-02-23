import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/utils/api';
import { toast } from 'react-toastify';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AccessKeyResponse {
  accessKey: string;
  isNewAccount: boolean;
  redirectUrl: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  register: () => void;
  logout: () => void;
  checkAuthStatus: () => Promise<void>;
  setAccessKey: (key: string) => void;
  getAccessKeyAfterOAuth: () => Promise<AccessKeyResponse>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_KEY_STORAGE_KEY = 'codepush_access_key';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const setAccessKey = (key: string) => {
    localStorage.setItem(ACCESS_KEY_STORAGE_KEY, key);
    // Update the default headers for all future requests
    api.defaults.headers.common['Authorization'] = `Bearer ${key}`;
  };

  const getAccessKeyAfterOAuth = async (): Promise<AccessKeyResponse> => {
    try {
      // First try to get the access key from the /accesskey endpoint
      const response = await api.get<AccessKeyResponse>('/auth/accesskey', {
        withCredentials: true,
        headers: {
          'Accept': 'application/json',
        },
        params: {
          source: 'web',
          redirect: '/code-push/dashboard'  // Add default redirect URL
        }
      });
      
      const { accessKey, redirectUrl } = response.data;
      if (!accessKey) {
        throw new Error('No access key received from server');
      }
      
      // Explicitly set the access key in localStorage and headers
      localStorage.setItem(ACCESS_KEY_STORAGE_KEY, accessKey);
      api.defaults.headers.common['Authorization'] = `Bearer ${accessKey}`;
      
      // Return both access key and redirect URL
      return {
        accessKey,
        redirectUrl: redirectUrl || '/code-push/dashboard',
        isNewAccount: response.data.isNewAccount
      };
    } catch (error) {
      console.error('Failed to get access key:', error);
      throw error;
    }
  };

  const checkAuthStatus = async () => {
    try {
      // Try to get the access key from storage
      const storedKey = localStorage.getItem(ACCESS_KEY_STORAGE_KEY);
      if (!storedKey) {
        throw new Error('No access key found');
      }

      api.defaults.headers.common['Authorization'] = `Bearer ${storedKey}`;

      // First try to get the account info
      const response = await api.get('/account', {
        withCredentials: true,
        headers: {
          'Accept': 'application/json',
        }
      });

      if (response.data && response.data.account) {
        setUser({
          id: response.data.account.id || response.data.account.email,
          email: response.data.account.email,
          name: response.data.account.name
        });
      } else {
        throw new Error('Invalid account data received');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      localStorage.removeItem(ACCESS_KEY_STORAGE_KEY);
      delete api.defaults.headers.common['Authorization'];
      // If we're not on the login page, redirect to login
      if (window.location.pathname !== '/code-push/login') {
        window.location.href = '/code-push/login';
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const login = () => {
    // Get the current origin for the redirect_uri
    const redirectUri = `${window.location.origin}/oauth/callback`;
    // Redirect to the backend's Google OAuth endpoint with our callback URL
    // @ts-ignore
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/login/google?redirect_uri=${encodeURIComponent(redirectUri)}&source=web`;
  };

  const register = () => {
    // Get the current origin for the redirect_uri
    const redirectUri = `${window.location.origin}/oauth/callback`;
    // Redirect to the backend's Google OAuth registration endpoint
    // @ts-ignore
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/register/google?redirect_uri=${encodeURIComponent(redirectUri)}&source=web`;
  };

  const logout = async () => {
    try {
      const storedKey = localStorage.getItem(ACCESS_KEY_STORAGE_KEY);
      if (storedKey) {
        // Remove the access key from the server
        try {
          await api.delete(`/accessKeys/${storedKey}`);
        } catch (error) {
          // If the key is already invalid/removed, we can ignore the error
          console.log('Access key removal error:', error);
        }
      }

      // Clear local state
      setUser(null);
      localStorage.removeItem(ACCESS_KEY_STORAGE_KEY);
      delete api.defaults.headers.common['Authorization'];
      
      // Redirect to login
      window.location.href = '/code-push/login';
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Failed to logout. Please try again.');
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    checkAuthStatus,
    setAccessKey,
    getAccessKeyAfterOAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 