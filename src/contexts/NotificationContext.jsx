import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext';

const NotificationContext = createContext();

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { favoriteStores, cards, banks } = useProfile();
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState({
    newDeals: true,
    expiringDeals: true,
    // Marketing-style emails default OFF (opt-in, PECR reg 22).
    personalizedOffers: false,
    weeklyDigest: false,
    priceAlerts: false
  });

  // Mock notifications - em produção viria da API
  const mockNotifications = [
    {
      id: 1,
      type: 'new_deal',
      title: 'New Amazon Deal Available!',
      message: 'Amazon is now offering 6% cashback - 1% higher than usual!',
      store: 'Amazon',
      cashbackRate: 6.0,
      previousRate: 5.0,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      read: false,
      priority: 'high',
      icon: '🛒',
      color: 'from-orange-500 to-orange-600',
      action: {
        type: 'external_link',
        url: 'https://amazon.com',
        text: 'Shop Now'
      }
    },
    {
      id: 2,
      type: 'expiring_deal',
      title: 'Deal Expiring Soon!',
      message: 'Your John Lewis 3.5% cashback deal expires in 2 days',
      store: 'John Lewis',
      cashbackRate: 3.5,
      expiresIn: '2 days',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      read: false,
      priority: 'medium',
      icon: '🏬',
      color: 'from-purple-500 to-purple-600',
      action: {
        type: 'external_link',
        url: 'https://johnlewis.com',
        text: 'Use Deal'
      }
    },
    {
      id: 3,
      type: 'personalized_offer',
      title: 'Perfect Match Found!',
      message: 'Based on your shopping history, ASOS has a special 4% offer just for you',
      store: 'ASOS',
      cashbackRate: 4.0,
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      read: true,
      priority: 'medium',
      icon: '👗',
      color: 'from-pink-500 to-pink-600',
      action: {
        type: 'internal_link',
        url: '/compare',
        text: 'Compare'
      }
    },
    {
      id: 4,
      type: 'new_card',
      title: 'New Card Recommendation',
      message: 'Chase Sapphire Reserve could increase your cashback by 25%',
      cardName: 'Chase Sapphire Reserve',
      potentialIncrease: 25,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      read: true,
      priority: 'low',
      icon: '💳',
      color: 'from-blue-500 to-blue-600',
      action: {
        type: 'internal_link',
        url: '/profile',
        text: 'Add Card'
      }
    },
    {
      id: 5,
      type: 'weekly_digest',
      title: 'Weekly Savings Report',
      message: 'You saved £47.80 this week! See your full report.',
      savings: 47.80,
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      read: false,
      priority: 'low',
      icon: '📊',
      color: 'from-green-500 to-green-600',
      action: {
        type: 'internal_link',
        url: '/dashboard',
        text: 'View Report'
      }
    }
  ];

  // Carregar notificações quando o usuário logar
  useEffect(() => {
    if (user) {
      setNotifications(mockNotifications);
      updateUnreadCount(mockNotifications);
    }
  }, [user]);

  // Atualizar contador de não lidas
  const updateUnreadCount = (notificationList = notifications) => {
    const unread = notificationList.filter(n => !n.read).length;
    setUnreadCount(unread);
  };

  // Marcar notificação como lida
  const markAsRead = (notificationId) => {
    setNotifications(prev => {
      const updated = prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      );
      updateUnreadCount(updated);
      return updated;
    });
  };

  // Marcar todas como lidas
  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(notification => ({ ...notification, read: true }));
      setUnreadCount(0);
      return updated;
    });
  };

  // Deletar notificação
  const deleteNotification = (notificationId) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== notificationId);
      updateUnreadCount(updated);
      return updated;
    });
  };

  // Adicionar nova notificação
  const addNotification = (notification) => {
    const newNotification = {
      ...notification,
      id: Date.now(),
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      updateUnreadCount(updated);
      return updated;
    });
  };

  // Atualizar configurações
  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Filtrar notificações por tipo
  const getNotificationsByType = (type) => {
    return notifications.filter(n => n.type === type);
  };

  // Obter notificações recentes (últimas 24h)
  const getRecentNotifications = () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return notifications.filter(n => n.timestamp > oneDayAgo);
  };

  // Obter notificações por prioridade
  const getNotificationsByPriority = (priority) => {
    return notifications.filter(n => n.priority === priority);
  };

  // Simular geração de nova notificação baseada no perfil
  const generatePersonalizedNotification = () => {
    if (favoriteStores.length > 0) {
      const randomStore = favoriteStores[Math.floor(Math.random() * favoriteStores.length)];
      const newRate = (Math.random() * 2 + 3).toFixed(1); // 3-5%
      
      addNotification({
        type: 'new_deal',
        title: `New ${randomStore} Deal!`,
        message: `${randomStore} is now offering ${newRate}% cashback!`,
        store: randomStore,
        cashbackRate: parseFloat(newRate),
        priority: 'high',
        icon: '🔥',
        color: 'from-red-500 to-red-600',
        action: {
          type: 'external_link',
          url: `https://${randomStore.toLowerCase().replace(' ', '')}.com`,
          text: 'Shop Now'
        }
      });
    }
  };

  const value = {
    // State
    notifications,
    unreadCount,
    settings,

    // Actions
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
    updateSettings,

    // Filters
    getNotificationsByType,
    getRecentNotifications,
    getNotificationsByPriority,

    // Utils
    generatePersonalizedNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}