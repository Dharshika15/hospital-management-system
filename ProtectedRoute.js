import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Activity } from 'lucide-react';

export default function ProtectedRoute({ children, roles }) {
  const { user, userData, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-muted)',
        gap: 12,
        flexDirection: 'column'
      }}>
        <Activity size={28} className="spinning" color="var(--accent)" />
        <p style={{ fontSize: '0.875rem' }}>Loading system...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && userData && !roles.includes(userData.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
