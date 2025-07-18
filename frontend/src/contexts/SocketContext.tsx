import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import io, { Socket } from 'socket.io-client';
import API_CONFIG from '../config/api';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
        const newSocket = io(API_CONFIG.socketURL);
      newSocket.on('connect', () => {
        setIsConnected(true);
      });
      newSocket.on('disconnect', () => {
        setIsConnected(false);
      });
      setSocket(newSocket);
      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [isAuthenticated]);

  const value: SocketContextType = {
    socket,
    isConnected
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
