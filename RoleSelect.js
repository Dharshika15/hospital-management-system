import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Activity, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const ROLES = [
  {
    key: 'admin',
    label: 'Admin',
    emoji: '👑',
    desc: 'Manage staff, revenue & logs',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    bg: '#eef2ff',
    color: '#3730a3',
    email: 'admin@medicore.com',
  },
  {
    key: 'doctor',
    label: 'Doctor',
    emoji: '🩺',
    desc: 'Appointments & prescriptions',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    bg: '#ecfdf5',
    color: '#065f46',
    email: 'doctor@medicore.com',
  },
  {
    key: 'pharmacy',
    label: 'Pharmacist',
    emoji: '💊',
    desc: 'Medicines, dispense & invoices',
    gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    bg: '#f5f3ff',
    color: '#5b21b6',
    email: 'pharmacy@medicore.com',
  },
  {
    key: 'receptionist',
    label: 'Receptionist',
    emoji: '📋',
    desc: 'Patients & appointments',
    gradient: 'linear-gradient(135deg, #f59e0b, #f97316)',
    bg: '#fffbeb',
    color: '#92400e',
    email: 'reception@medicore.com',
  },
  {
  key: 'lab',
  label: 'Lab Technician',
  emoji: '🧪',
  desc: 'Tests, reports & diagnostics',
  gradient: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', // cyan-blue
  bg: '#ecfeff',
  color: '#0e7490',
  email: 'lab@medicore.com',
}
];

function LoginForm({ role, onBack }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(role.email || '');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success(`Welcome, ${role.label}! 🎉`);
      navigate('/dashboard');
    } catch {
      toast.error('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: role.gradient,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -100, right: -100 }} />
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', bottom: -80, left: -80 }} />

      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'rgba(255,255,255,0.97)',
        borderRadius: 24,
        padding: '40px 36px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.2)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Back button */}
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#64748b', fontSize: 13, fontWeight: 600,
          marginBottom: 24, padding: 0,
          fontFamily: 'var(--font-body)',
        }}>
          <ArrowLeft size={16} /> Back to roles
        </button>

        {/* Role icon */}
        <div style={{
          width: 72, height: 72,
          background: role.gradient,
          borderRadius: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem',
          marginBottom: 20,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        }}>
          {role.emoji}
        </div>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: "'Outfit',sans-serif", color: '#0f172a', marginBottom: 6 }}>
          {role.label} Login
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: 28 }}>
          {role.desc}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={role.email}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                style={{ paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{
                position: 'absolute', right: 12, top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#94a3b8', display: 'flex',
              }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            className="btn"
            type="submit"
            disabled={loading}
            style={{
              background: role.gradient,
              color: '#fff',
              justifyContent: 'center',
              padding: '13px 18px',
              marginTop: 4,
              fontSize: '0.95rem',
              border: 'none',
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
            }}
          >
            {loading ? <Activity size={16} className="spinning" /> : role.emoji}
            {loading ? 'Signing in...' : `Sign in as ${role.label}`}
          </button>
        </form>

        <p style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', marginTop: 20 }}>
          🔒 Secured system · Unauthorized access is prohibited
        </p>
      </div>
    </div>
  );
}

export default function RoleSelect() {
  const [selectedRole, setSelectedRole] = useState(null);

  if (selectedRole) {
    return <LoginForm role={selectedRole} onBack={() => setSelectedRole(null)} />;
  }

  return (
    <div className="role-select-page">
      {/* Decorative elements */}
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: -150, right: -100 }} />
      <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', bottom: -100, left: -80 }} />

      <div style={{ zIndex: 1, width: '100%', maxWidth: 700, textAlign: 'center' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            width: 80, height: 80,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            border: '2px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(10px)',
          }}>
            <Activity size={40} color="#fff" />
          </div>
          <h1 style={{
            fontSize: '2.8rem', fontWeight: 900,
            fontFamily: "'Outfit',sans-serif",
            color: '#fff', letterSpacing: '-1px', marginBottom: 10,
          }}>
            MediCore HMS
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.05rem' }}>
            Select your role to continue
          </p>
        </div>

        {/* Role Cards */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          {ROLES.map(role => (
            <div
              key={role.key}
              className="role-card"
              onClick={() => setSelectedRole(role)}
              style={{ background: 'rgba(255,255,255,0.95)' }}
            >
              {/* Role icon circle */}
              <div style={{
                width: 64, height: 64,
                background: role.gradient,
                borderRadius: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.8rem',
                margin: '0 auto 14px',
                boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
              }}>
                {role.emoji}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: 6, fontFamily: "'Outfit',sans-serif" }}>
                {role.label}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                {role.desc}
              </div>
              <div style={{
                marginTop: 14,
                padding: '6px 14px',
                background: role.bg,
                borderRadius: 99,
                fontSize: '0.72rem',
                fontWeight: 700,
                color: role.color,
                display: 'inline-block',
              }}>
                Login →
              </div>
            </div>
          ))}
        </div>

        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', marginTop: 32 }}>
          MediCore Hospital Management System · Secure Access
        </p>
      </div>
    </div>
  );
}
