import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import toast from 'react-hot-toast';
import {
  Activity, LayoutDashboard, UserCheck, Calendar,
  Pill, FileText, DollarSign, ClipboardList,
  LogOut, Stethoscope, Receipt, FlaskConical, BedDouble, CalendarDays,Hash
} from 'lucide-react';

const ROLE_GRADIENTS = {
  admin: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
  doctor: 'linear-gradient(135deg,#10b981,#059669)',
  pharmacy: 'linear-gradient(135deg,#8b5cf6,#a78bfa)',
  receptionist: 'linear-gradient(135deg,#f59e0b,#f97316)',
  lab: 'linear-gradient(135deg,#0ea5e9,#38bdf8)',
};

const navConfig = {
  admin: [
    { section: 'Overview', items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    ]},
    { section: 'Doctors', items: [
      { label: 'Manage Doctors', icon: Stethoscope, path: '/admin/doctors' },
    ]},
    { section: 'Finance', items: [
      { label: 'Revenue', icon: DollarSign, path: '/finance' },
      
    ]},
    { section: 'System', items: [
      { label: 'Activity Logs', icon: ClipboardList, path: '/logs' },
    ]},
  ],
  doctor: [
    { section: 'Overview', items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    ]},
    { section: 'Clinical', items: [
      { label: 'My Appointments', icon: Calendar, path: '/appointments' },
      { label: 'Patients', icon: UserCheck, path: '/patients' },
      { label: 'Prescriptions', icon: FileText, path: '/prescriptions' },
    ]},
    { section: 'Ward', items: [
      { label: 'Bed Management', icon: BedDouble, path: '/beds' },
    ]},
  ],
  pharmacy: [
    { section: 'Overview', items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    ]},
    { section: 'Pharmacy', items: [
      { label: 'Medicines & Invoices', icon: Pill, path: '/pharmacy' },
      { label: 'Prescriptions', icon: FileText, path: '/prescriptions' },
      { label: 'Dispense', icon: ClipboardList, path: '/dispense' },
    ]},
  ],
  lab: [
    { section: 'Overview', items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    ]},
    { section: 'Lab', items: [
      { label: 'Lab & Diagnostics', icon: FlaskConical, path: '/lab' },
    ]},
  ],
  receptionist: [
    { section: 'Overview', items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    ]},
    { section: 'Front Desk', items: [
      { label: 'Patients', icon: UserCheck, path: '/patients' },
      { label: 'Appointments', icon: Calendar, path: '/reception/appointments' },
      { label: 'Invoices', icon: Receipt, path: '/reception/invoices' },
      { label: 'Token Queue', icon: Hash, path: '/reception/tokens' },
      { label: 'Leave Calendar', icon: CalendarDays, path: '/leave-calendar' },
    ]},
    { section: 'Ward', items: [
      { label: 'Bed Management', icon: BedDouble, path: '/beds' },
    ]},
  ],
};

export default function Sidebar() {
  const { userData, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const role = userData?.role || 'receptionist';
  const nav = navConfig[role] || navConfig.receptionist;
  const initials = (userData?.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon"><Activity size={22} color="#fff" /></div>
        <h1>MediCore HMS</h1>
        <p>Hospital Management</p>
      </div>

      <nav className="sidebar-nav">
        {nav.map(section => (
          <div key={section.section}>
            <div className="nav-section-label">{section.section}</div>
            {section.items.map(item => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <div key={item.path} className={`nav-item ${active ? 'active' : ''}`} onClick={() => navigate(item.path)}>
                  <Icon size={16} className="nav-icon" />
                  {item.label}
                  {(item.path === '/appointments' || item.path === '/reception/appointments') && unreadCount > 0 && (
                    <span className="nav-badge">{unreadCount}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="user-avatar" style={{ background: ROLE_GRADIENTS[role] || ROLE_GRADIENTS.admin }}>{initials}</div>
        <div className="user-info">
          <div className="name">{userData?.name || 'User'}</div>
          <div className="role-badge">{role}</div>
        </div>
        <button className="logout-btn" onClick={handleLogout} title="Sign out"><LogOut size={16} /></button>
      </div>
    </aside>
  );
}
