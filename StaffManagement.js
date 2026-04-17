import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { UserPlus, Search, Users, Activity, X, ShieldCheck } from 'lucide-react';

const ROLE_COLORS = {
  admin: 'var(--accent)', doctor: 'var(--green)',
  pharmacy: 'var(--purple)', receptionist: 'var(--yellow)'
};

function AddStaffModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'doctor',
    phone: '', specialty: '', licenseNumber: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/users/create', form);
      toast.success('Staff member created');
      onSaved(); onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">Add Staff Member</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid cols-2">
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Dr. Full Name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} placeholder="Min. 6 characters" />
              </div>
              <div className="form-group">
                <label className="form-label">Role *</label>
                <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="doctor">Doctor</option>
                  <option value="pharmacy">Pharmacist</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
              </div>
              {form.role === 'doctor' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Specialty</label>
                    <select className="form-select" value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}>
                      <option value="">Select specialty</option>
                      {['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Neurology',
                        'Dermatology', 'ENT', 'Gynecology', 'Ophthalmology', 'Psychiatry', 'Surgery'].map(s =>
                        <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">License Number</label>
                    <input className="form-input" value={form.licenseNumber} onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))} placeholder="MCI-XXXXXXXX" />
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Activity size={15} className="spinning" /> : <UserPlus size={15} />} Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/users');
      setStaff(res.data);
    } catch { toast.error('Failed to load staff'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (id, current) => {
    const status = current === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/users/${id}/status`, { status });
      toast.success(`User ${status}`);
      load();
    } catch { toast.error('Failed'); }
  };

  const filtered = staff.filter(s => {
    const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || s.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleCount = (r) => staff.filter(s => s.role === r).length;

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Staff Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>{staff.length} total members</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-bar">
            <Search size={15} />
            <input placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ width: 150 }}>
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="doctor">Doctor</option>
            <option value="pharmacy">Pharmacy</option>
            <option value="receptionist">Receptionist</option>
          </select>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <UserPlus size={15} /> Add Staff
          </button>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          { role: 'doctor', label: 'Doctors', color: 'var(--green)', bg: 'var(--green-dim)' },
          { role: 'pharmacy', label: 'Pharmacists', color: 'var(--purple)', bg: 'var(--purple-dim)' },
          { role: 'receptionist', label: 'Receptionists', color: 'var(--yellow)', bg: 'var(--yellow-dim)' },
          { role: 'admin', label: 'Admins', color: 'var(--accent-hover)', bg: 'var(--accent-glow)' },
        ].map(({ role, label, color, bg }) => (
          <div key={role} className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setRoleFilter(role)}>
            <div className="stat-icon" style={{ background: bg }}>
              <ShieldCheck size={22} color={color} />
            </div>
            <div className="stat-info">
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ color }}>{roleCount(role)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}><Activity size={20} className="spinning" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><Users size={40} /><h3>No staff found</h3></div>
          ) : (
            <table>
              <thead>
                <tr><th>Name</th><th>Role</th><th>Email</th><th>Phone</th><th>Specialty</th><th>License</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.uid || s.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          background: ROLE_COLORS[s.role] || 'var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: 700, color: '#fff'
                        }}>
                          {(s.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        {s.name}
                      </div>
                    </td>
                    <td><span className="badge" style={{ background: `${ROLE_COLORS[s.role]}20`, color: ROLE_COLORS[s.role] }}>{s.role}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{s.email}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.phone || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.specialty || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'monospace' }}>{s.licenseNumber || '—'}</td>
                    <td><span className={`badge ${s.status === 'active' ? 'green' : 'gray'}`}>{s.status || 'active'}</span></td>
                    <td>
                      <button className={`btn btn-sm ${s.status === 'active' ? 'btn-danger' : 'btn-secondary'}`}
                        onClick={() => toggleStatus(s.uid || s.id, s.status)}>
                        {s.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && <AddStaffModal onClose={() => setShowModal(false)} onSaved={load} />}
    </div>
  );
}
