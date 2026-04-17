import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { UserPlus, Search, User, Phone, Activity, X, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import PatientTimeline from '../shared/PatientTimeline';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const BLOOD_COLORS = { 'A+': '#f43f5e', 'A-': '#f97316', 'B+': '#6366f1', 'B-': '#8b5cf6', 'AB+': '#10b981', 'AB-': '#0ea5e9', 'O+': '#f59e0b', 'O-': '#ec4899' };

function PatientModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', age: '', gender: 'Male', phone: '', email: '', address: '', bloodGroup: '', emergencyContact: '', allergies: '', medicalHistory: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/patients', { ...form, age: parseInt(form.age), allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()) : [] });
      toast.success('Patient registered!');
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">👤 Register New Patient</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid cols-2">
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Patient's full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Age *</label>
                <input className="form-input" type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} required min={0} max={150} />
              </div>
              <div className="form-group">
                <label className="form-label">Gender *</label>
                <select className="form-select" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required placeholder="+91 XXXXX XXXXX" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="optional — for reminders" />
              </div>
              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select className="form-select" value={form.bloodGroup} onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))}>
                  <option value="">Unknown</option>
                  {BLOOD_GROUPS.map(bg => <option key={bg}>{bg}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Emergency Contact</label>
                <input className="form-input" value={form.emergencyContact} onChange={e => setForm(f => ({ ...f, emergencyContact: e.target.value }))} placeholder="Name & phone" />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Address</label>
                <input className="form-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address" />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Known Allergies (comma-separated)</label>
                <input className="form-input" value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} placeholder="Penicillin, Aspirin..." />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Medical History</label>
                <textarea className="form-textarea" value={form.medicalHistory} onChange={e => setForm(f => ({ ...f, medicalHistory: e.target.value }))} placeholder="Previous conditions, surgeries..." />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Activity size={15} className="spinning" /> : <UserPlus size={15} />} Register Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TimelineModal({ patient, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal modal-lg" style={{ maxWidth: 860, maxHeight: '92vh' }}>
        <div className="modal-header">
          <h3 className="modal-title">🏥 Medical History — {patient.name}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto', maxHeight: '75vh' }}>
          <PatientTimeline patientId={patient.id} patientName={patient.name} />
        </div>
      </div>
    </div>
  );
}

export default function Patients() {
  const { userData } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [timelinePatient, setTimelinePatient] = useState(null);
  const [statFilter, setStatFilter] = useState(null);
  const canAdd = ['admin', 'receptionist'].includes(userData?.role);

  const load = async () => {
    try { const res = await api.get('/patients'); setPatients(res.data); }
    catch { toast.error('Failed to load patients'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().split('T')[0];
  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search) ||
    p.patientId?.toLowerCase().includes(search.toLowerCase())
  );

  const statDrillRows = statFilter === 'total' ? patients
    : statFilter === 'today' ? patients.filter(p => p.createdAt?.startsWith(today))
    : statFilter === 'active' ? patients.filter(p => p.status === 'active')
    : statFilter === 'allergies' ? patients.filter(p => p.allergies?.length > 0)
    : null;
  const statDrillTitle = statFilter === 'total' ? '👥 All Patients'
    : statFilter === 'today' ? '✅ Registered Today'
    : statFilter === 'active' ? '💚 Active Patients'
    : statFilter === 'allergies' ? '⚠️ Patients With Allergies'
    : '';

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Patients</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>{patients.length} registered patients</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-bar"><Search size={15} /><input placeholder="Search by name, phone, ID..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          {canAdd && <button className="btn btn-primary" onClick={() => setShowModal(true)}><UserPlus size={15} /> Register Patient</button>}
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          { key: 'total',    label: 'Total Patients',   value: patients.length,                                                                       color: 'var(--indigo)', bg: 'var(--indigo-dim)', accent: 'linear-gradient(90deg,#6366f1,#8b5cf6)' },
          { key: 'today',    label: 'Registered Today', value: patients.filter(p => p.createdAt?.startsWith(today)).length,                           color: 'var(--emerald)', bg: 'var(--emerald-dim)', accent: 'linear-gradient(90deg,#10b981,#059669)' },
          { key: 'active',   label: 'Active',           value: patients.filter(p => p.status === 'active').length,                                    color: 'var(--sky)', bg: 'var(--sky-dim)', accent: 'linear-gradient(90deg,#0ea5e9,#38bdf8)' },
          { key: 'allergies',label: 'With Allergies',   value: patients.filter(p => p.allergies?.length > 0).length,                                  color: 'var(--rose)', bg: 'var(--rose-dim)', accent: 'linear-gradient(90deg,#f43f5e,#fb7185)' },
        ].map(({ key, label, value, color, bg, accent }) => (
          <div key={key} className="stat-card" style={{ '--card-accent': accent, cursor: 'pointer', outline: statFilter === key ? `2px solid ${color}` : 'none' }}
            onClick={() => setStatFilter(statFilter === key ? null : key)}>
            <div className="stat-icon" style={{ background: bg }}><User size={22} color={color} /></div>
            <div className="stat-info">
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ color }}>{value}</div>
              {statFilter === key && <div style={{ fontSize: '0.65rem', color, fontWeight: 700, marginTop: 2 }}>▼ tap to collapse</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Stat drill-down */}
      {statDrillRows && (
        <div className="card" style={{ marginBottom: 16, border: '2px solid var(--border-active)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">{statDrillTitle}</span>
            <span className="badge indigo">{statDrillRows.length}</span>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setStatFilter(null)}>✕</button>
          </div>
          <div className="table-wrap">
            {statDrillRows.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}><User size={30} /><p>No patients in this category</p></div>
            ) : (
              <table>
                <thead><tr><th>Name</th><th>ID</th><th>Age</th><th>Gender</th><th>Phone</th><th>Blood Group</th><th>Registered</th></tr></thead>
                <tbody>
                  {statDrillRows.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700 }}>{p.name}</td>
                      <td><span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#6366f1', background: 'var(--indigo-dim)', padding: '2px 7px', borderRadius: 5 }}>{p.patientId}</span></td>
                      <td>{p.age || '—'}</td>
                      <td><span className="badge gray">{p.gender || '—'}</span></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{p.phone || '—'}</td>
                      <td>{p.bloodGroup ? <span className="badge red">{p.bloodGroup}</span> : '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{p.createdAt?.split('T')[0] || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}><Activity size={20} className="spinning" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><User size={40} /><h3>{search ? 'No matches found' : 'No patients registered'}</h3></div>
          ) : (
            <table>
              <thead>
                <tr><th>Patient ID</th><th>Name</th><th>Age/Gender</th><th>Blood</th><th>Phone</th><th>Registered</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--indigo)', fontWeight: 700, background: 'var(--indigo-dim)', padding: '3px 8px', borderRadius: 6 }}>{p.patientId}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,var(--indigo),var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                          {p.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.email || 'No email'}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style={{ color: 'var(--text-secondary)' }}>{p.age}y · {p.gender}</span></td>
                    <td>
                      {p.bloodGroup ? (
                        <span className="badge" style={{ background: `${BLOOD_COLORS[p.bloodGroup] || '#6366f1'}15`, color: BLOOD_COLORS[p.bloodGroup] || '#6366f1', border: `1px solid ${BLOOD_COLORS[p.bloodGroup] || '#6366f1'}30` }}>
                          🩸 {p.bloodGroup}
                        </span>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                        <Phone size={12} color="var(--sky)" /> {p.phone}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(p.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td><span className={`badge ${p.status === 'active' ? 'green' : 'gray'}`}>{p.status || 'active'}</span></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => setTimelinePatient(p)} title="View medical history">
                        <Clock size={14} color="var(--indigo)" /> History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && <PatientModal onClose={() => setShowModal(false)} onSaved={load} />}
      {timelinePatient && <TimelineModal patient={timelinePatient} onClose={() => setTimelinePatient(null)} />}
    </div>
  );
}
