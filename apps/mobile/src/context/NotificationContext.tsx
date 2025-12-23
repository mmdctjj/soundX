import React, { createContext, useContext, useState } from 'react';
import { Track } from '../models';

export type NotificationType = 'resume' | 'sync';

interface NotificationData {
  type: NotificationType;
  track: Track;
  title: string;
  description: string;
  onAccept: () => void;
  onReject: () => void;
}

interface NotificationContextType {
  notification: NotificationData | null;
  showNotification: (data: NotificationData) => void;
  hideNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<NotificationData | null>(null);

  const showNotification = (data: NotificationData) => {
    setNotification(data);
  };

  const hideNotification = () => {
    setNotification(null);
  };

  return (
    <NotificationContext.Provider value={{ notification, showNotification, hideNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
