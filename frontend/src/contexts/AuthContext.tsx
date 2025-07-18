import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_CONFIG.baseURL}/api/auth/login`, {
        email,
        password
      });

      const { token, user } = response.data;
      
      setToken(token);
      setUser(user);
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await axios.post(`${API_CONFIG.baseURL}/api/auth/register`, {
        username,
        email,
        password
      });

      const { token, user } = response.data;
      
      setToken(token);
      setUser(user);
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isAuthenticated: !!token
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
