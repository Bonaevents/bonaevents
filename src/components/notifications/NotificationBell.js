import { useState } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';

function NotificationBell() {
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, unreadCount, markAsRead } = useNotifications();

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer'
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: 'red',
            color: 'white',
            borderRadius: '50%',
            padding: '2px 6px',
            fontSize: '12px'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          width: '300px',
          maxHeight: '400px',
          overflowY: 'auto',
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
          zIndex: 1000
        }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '15px', textAlign: 'center', color: '#666' }}>
              Nessuna notifica
            </div>
          ) : (
            notifications.map(notification => (
              <div
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                style={{
                  padding: '10px',
                  borderBottom: '1px solid #eee',
                  backgroundColor: notification.read ? 'white' : '#f0f8ff',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{notification.title}</div>
                <div style={{ fontSize: '14px' }}>{notification.body}</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  {new Date(notification.timestamp).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell; 