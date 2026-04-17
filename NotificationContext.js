import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, where, addDoc, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();
export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { user, userData } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Listen to notifications in real-time from Firestore
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    }, (err) => {
      console.log('Notification listener error:', err);
    });

    return unsub;
  }, [user]);

  const markAsRead = async (notifId) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      await markAsRead(n.id);
    }
  };

  const addNotification = useCallback(async (userId, { title, description, type, icon, color }) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        title,
        description,
        type,
        icon: icon || 'bell',
        color: color || 'indigo',
        read: false,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to add notification:', err);
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};
