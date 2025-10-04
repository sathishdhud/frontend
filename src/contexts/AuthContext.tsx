import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/api';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (userName: string, password: string) => Promise<User | boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginTime, setLoginTime] = useState<number | null>(null);

  // Remove automatic session timeout
  // Users will stay logged in until they explicitly click logout
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const loginTimestamp = localStorage.getItem('loginTime');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Don't set up automatic logout - user stays logged in until explicit logout
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('loginTime');
      }
    }
    setIsLoading(false);
  }, []);

  // Removed automatic logout on tab closing
  // Users will stay logged in until they explicitly click the logout button

  const login = async (userName: string, password: string): Promise<User | boolean> => {
    try {
      const response = await authApi.login(userName, password);
      
      if (response.data.success) {
        const userData = response.data.data;
        const currentTime = Date.now();
        
        localStorage.setItem('token', userData.token!);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('loginTime', currentTime.toString());
        
        setUser(userData);
        setLoginTime(currentTime);
        
        // Removed automatic logout - user will stay logged in until explicit logout
        
        // Send successful login notification to Telegram
        authApi.sendLoginNotification(userName);
        
        return userData;
      } else {
        // Send failed login notification to Telegram
        authApi.sendFailedLoginNotification(userName);
        return false;
      }
    } catch (error) {
      console.error('Login failed:', error);
      // Send failed login notification to Telegram
      authApi.sendFailedLoginNotification(userName);
      return false;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('loginTime');
      setUser(null);
      setLoginTime(null);
    }
  };

  const value = {
    user,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};