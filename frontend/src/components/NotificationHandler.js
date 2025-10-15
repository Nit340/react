// frontend/src/components/NotificationHandler.js
import React, { useState, useEffect } from 'react';
import './NotificationHandler.css';

const NotificationHandler = () => {
  const [notifications, setNotifications] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  useEffect(() => {
    // Poll every 5 seconds for new notifications
    const interval = setInterval(() => {
      fetchNotifications();
    }, 5000);

    // Initial fetch
    fetchNotifications();

    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      // Set clear=true to remove notifications from backend after fetching
      const response = await fetch('http://localhost:8000/api/onboard-notifications?limit=10&clear=true');
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        console.log('New notifications found:', data.data);
        
        // Show the panel when new notifications arrive
        setIsVisible(true);
        setHasNewNotifications(true);
        
        // Show browser notifications
        data.data.forEach(notification => {
          displayBrowserNotification(notification);
        });
        
        // Update state with new notifications
        setNotifications(prev => [...data.data, ...prev].slice(0, 20));
      } else {
        // No new notifications, hide panel if no existing notifications
        if (notifications.length === 0) {
          setIsVisible(false);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const displayBrowserNotification = (notification) => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`🔔 ${notification.service}`, { 
          body: `${notification.title}: ${notification.message}`,
          icon: '/favicon.ico'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(`🔔 ${notification.service}`, { 
              body: `${notification.title}: ${notification.message}`,
              icon: '/favicon.ico'
            });
          }
        });
      }
    }
  };

  const clearNotifications = async () => {
    // Clear from backend
    try {
      await fetch('http://localhost:8000/api/onboard-notifications/clear', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
    
    // Clear from frontend state
    setNotifications([]);
    setIsVisible(false);
    setHasNewNotifications(false);
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
    // If user manually opens, don't show as "new" anymore
    if (isVisible === false) {
      setHasNewNotifications(false);
    }
  };

  // Don't render anything if no notifications and not visible
  if (!isVisible && notifications.length === 0) {
    return null;
  }

  return (
    <div className={`notification-panel ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="notification-header">
        <div className="notification-title-section">
          <h3>
            🔔 Notifications 
            {hasNewNotifications && <span className="new-badge">NEW</span>}
          </h3>
          {notifications.length > 0 && (
            <span className="count-badge">{notifications.length}</span>
          )}
        </div>
        <div className="notification-actions">
          <button onClick={toggleVisibility} className="hide-btn">
            {isVisible ? 'Hide' : 'Show'}
          </button>
          {notifications.length > 0 && (
            <button onClick={clearNotifications} className="clear-btn">
              Clear All
            </button>
          )}
        </div>
      </div>
      
      {isVisible && (
        <div className="notifications-list">
          {notifications.length === 0 ? (
            <p className="no-notifications">No notifications</p>
          ) : (
            notifications.map(notification => (
              <div key={notification.id} className="notification-item">
                <div className="notification-item-header">
                  <strong>{notification.title}</strong>
                  <span className={`service-tag ${notification.service}`}>
                    {notification.service}
                  </span>
                </div>
                <p className="notification-message">{notification.message}</p>
                <small className="notification-time">
                  {new Date(notification.timestamp).toLocaleString()}
                </small>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationHandler;