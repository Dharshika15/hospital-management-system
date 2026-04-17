import React from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { Bell, X, Check, Calendar, User, Pill, FileText, DollarSign, CheckCheck } from 'lucide-react';

const ICONS = {
  calendar: Calendar, user: User, pill: Pill,
  file: FileText, dollar: DollarSign, bell: Bell,
};

const COLORS = {
  indigo: { bg: '#eef2ff', color: '#6366f1' },
  emerald: { bg: '#ecfdf5', color: '#10b981' },
  amber: { bg: '#fffbeb', color: '#f59e0b' },
  rose: { bg: '#fff1f2', color: '#f43f5e' },
  violet: { bg: '#f5f3ff', color: '#8b5cf6' },
  sky: { bg: '#f0f9ff', color: '#0ea5e9' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

export default function NotificationPanel({ onClose }) {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();

  return (
    <div className="notif-panel">
      <div className="notif-header">
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Notifications
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {unreadCount} unread
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {unreadCount > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={markAllAsRead} title="Mark all read">
              <CheckCheck size={14} /> All read
            </button>
          )}
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="notif-list">
        {notifications.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Bell size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>No notifications yet</div>
            <div style={{ fontSize: '0.78rem', marginTop: 4 }}>You're all caught up!</div>
          </div>
        ) : (
          notifications.map(notif => {
            const Icon = ICONS[notif.icon] || Bell;
            const colorStyle = COLORS[notif.color] || COLORS.indigo;
            return (
              <div
                key={notif.id}
                className={`notif-item ${!notif.read ? 'unread' : ''}`}
                onClick={() => markAsRead(notif.id)}
              >
                <div className="notif-icon" style={{ background: colorStyle.bg }}>
                  <Icon size={16} color={colorStyle.color} />
                </div>
                <div className="notif-content">
                  <div className="notif-title">{notif.title}</div>
                  <div className="notif-desc">{notif.description}</div>
                  <div className="notif-time">{timeAgo(notif.createdAt)}</div>
                </div>
                {!notif.read && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--indigo)', flexShrink: 0, marginTop: 6 }} />
                )}
              </div>
            );
          })
        )}
      </div>

      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: '#f8faff', textAlign: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Notifications update in real-time
        </span>
      </div>
    </div>
  );
}
