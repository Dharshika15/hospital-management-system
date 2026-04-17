import React, { useState } from 'react';
import Sidebar from './Sidebar';
import NotificationPanel from './NotificationPanel';
import { useNotifications } from '../../contexts/NotificationContext';
import { Bell } from 'lucide-react';

export default function Layout({ children, title, subtitle }) {
  const { unreadCount } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <div className="topbar-title">
            <h2>{title || 'Dashboard'}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="topbar-actions">
            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setShowNotifs(!showNotifs)}
                style={{
                  background: showNotifs ? 'var(--indigo-dim)' : 'transparent',
                  color: showNotifs ? 'var(--indigo)' : 'var(--text-secondary)',
                  border: '1.5px solid',
                  borderColor: showNotifs ? 'var(--border-active)' : 'var(--border)',
                  borderRadius: 10,
                  position: 'relative',
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="notif-dot-topbar" />}
              </button>
            </div>

            {/* Date Badge */}
            <div style={{
              padding: '7px 14px',
              background: 'linear-gradient(135deg, var(--indigo-dim), var(--violet-dim))',
              borderRadius: 10,
              border: '1.5px solid var(--border-active)',
              fontSize: '0.78rem',
              color: 'var(--indigo)',
              fontWeight: 600,
            }}>
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="page-content">
          {children}
        </div>
      </div>

      {/* Notification Panel */}
      {showNotifs && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 998 }}
            onClick={() => setShowNotifs(false)}
          />
          <NotificationPanel onClose={() => setShowNotifs(false)} />
        </>
      )}
    </div>
  );
}
