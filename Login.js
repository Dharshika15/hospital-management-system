import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Activity, Eye, EyeOff, Heart, Shield, Zap } from 'lucide-react';

const DEMO_ROLES = [
  { role: 'Admin', email: 'admin@medicore.com', password: 'Admin@123456', color: '#6366f1', bg: '#eef2ff', emoji: '👑' },
  { role: 'Doctor', email: 'doctor@medicore.com', password: 'Doctor@123456', color: '#10b981', bg: '#ecfdf5', emoji: '🩺' },
  { role: 'Pharmacy', email: 'pharmacy@medicore.com', password: 'Pharmacy@123456', color: '#8b5cf6', bg: '#f5f3ff', emoji: '💊' },
  { role: 'Receptionist', email: 'reception@medicore.com', password: 'Reception@123456', color: '#f59e0b', bg: '#fffbeb', emoji: '📋' },
  { role: 'Lab',email: 'lab@medicore.com',password: 'Lab@123456',color: '#06b6d4',bg: '#ecfeff',emoji: '🧪'}
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back! 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (email, password) => {
    setLoading(true);
    setForm({ email, password });
    try {
      await login(email, password);
      toast.success('Welcome back! 🎉');
      navigate('/dashboard');
    } catch {
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" />

      {/* Floating decorative elements */}
      <div style={{ position: 'absolute', top: '10%', left: '5%', opacity: 0.15 }}>
        <Heart size={60} color="#fff" />
      </div>
      <div style={{ position: 'absolute', bottom: '15%', right: '6%', opacity: 0.1 }}>
        <Shield size={80} color="#fff" />
      </div>
      <div style={{ position: 'absolute', top: '60%', left: '8%', opacity: 0.1 }}>
        <Zap size={50} color="#fff" />
      </div>

      <div style={{ display: 'flex', gap: 40, alignItems: 'center', zIndex: 1, flexWrap: 'wrap', justifyContent: 'center', padding: '20px' }}>

        {/* Left side — Branding */}
        <div style={{ color: '#fff', maxWidth: 400, textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            border: '2px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(10px)',
          }}>
            <Activity size={40} color="#fff" />
          </div>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 900, fontFamily: "'Outfit', sans-serif", letterSpacing: '-1px', marginBottom: 12 }}>
            MediCore HMS
          </h1>
          <p style={{ fontSize: '1.05rem', opacity: 0.85, lineHeight: 1.7, marginBottom: 32 }}>
            Professional Hospital Management System with real-time operations, smart analytics, and seamless workflows.
          </p>

          {/* Feature Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {['Real-time Updates', '4 Role System', 'PDF Invoices', 'Smart Notifications', 'Patient Timeline', 'Email Reminders'].map(f => (
              <span key={f} style={{
                padding: '6px 14px',
                background: 'rgba(255,255,255,0.15)',
                borderRadius: 99,
                fontSize: '0.75rem',
                fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(5px)',
              }}>
                ✦ {f}
              </span>
            ))}
          </div>
        </div>

        {/* Right side — Login Card */}
        <div className="login-card" style={{ animation: 'slideUp 0.4s ease' }}>
          <div className="login-logo">
            <div className="icon">
              <Activity size={26} color="#fff" />
            </div>
            <div className="text">
              <h1>MediCore HMS</h1>
              <p>Hospital Management</p>
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.5px', marginBottom: 6, color: '#0f172a' }}>
              Sign in 👋
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Enter your credentials to access the system
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                className="form-input"
                type="email"
                placeholder="you@medicore.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '13px 18px', marginTop: 4, fontSize: '0.95rem' }}
            >
              {loading ? <Activity size={16} className="spinning" /> : null}
              {loading ? 'Signing in...' : 'Sign in to MediCore'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 20px' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(99,102,241,0.12)' }} />
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Login</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(99,102,241,0.12)' }} />
          </div>

          {/* Quick Login Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {DEMO_ROLES.map(({ role, email, password, color, bg, emoji }) => (
              <button
                key={role}
                type="button"
                onClick={() => quickLogin(email, password)}
                disabled={loading}
                style={{
                  padding: '10px 12px',
                  background: bg,
                  border: `1.5px solid ${color}25`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.18s',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${color}25`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                <span style={{ fontSize: '1rem' }}>{emoji}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color }}>{role}</div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Quick access</div>
                </div>
              </button>
            ))}
          </div>

          <p style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', marginTop: 20 }}>
            🔒 Secured system · Unauthorized access is prohibited
          </p>
        </div>
      </div>
    </div>
  );
}
