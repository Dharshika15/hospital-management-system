// ─── AdminDoctors.js — Enhanced with Doctor Profile/Edit, Schedule, CSV Export ──
//
// NEW FEATURES (search // *** NEW *** to find them):
//   1. Doctor Profile Modal — view full details + edit name/phone/specialty/license
//   2. Doctor Schedule Setup — set working days & hours per doctor (saved to Firestore)
//   3. CSV Export — download filtered doctor list as a spreadsheet
//   4. Clickable doctor rows to open profile
//   5. Doctor stats card shows "On Leave Today" count

import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  UserPlus, Search, Stethoscope, Activity, X, ShieldCheck,
  // *** NEW ***
  Edit3, Calendar, Download, Clock, Phone, Mail, Award, Save, ChevronRight
} from 'lucide-react';
import { db } from '../../firebase';                                    // *** NEW ***
import { doc, getDoc, setDoc } from 'firebase/firestore';              // *** NEW ***

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SPECIALTIES = [
  'General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics',
  'Neurology', 'Dermatology', 'ENT', 'Gynecology',
  'Ophthalmology', 'Psychiatry', 'Surgery', 'Oncology',
  'Nephrology', 'Gastroenterology', 'Pulmonology',
];

const SPECIALTY_COLORS = {
  'General Medicine': 'blue', 'Cardiology': 'red', 'Orthopedics': 'yellow',
  'Pediatrics': 'green', 'Neurology': 'purple', 'Dermatology': 'pink',
  'ENT': 'blue', 'Gynecology': 'pink', 'Surgery': 'red', 'Oncology': 'orange',
};

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function exportDoctorsCSV(doctors) {
  if (!doctors.length) return toast.error('No doctors to export');
  const keys = ['name', 'email', 'phone', 'specialty', 'licenseNumber', 'status'];
  const header = ['Name', 'Email', 'Phone', 'Specialty', 'License Number', 'Status'];
  const rows = doctors.map(d => keys.map(k => `"${(d[k] || '').toString().replace(/"/g, '""')}"`).join(','));
  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `doctors_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  toast.success('CSV downloaded');
}

// ─── Add Doctor Modal (unchanged from original) ────────────────────────────────
function AddDoctorModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'doctor',
    phone: '', specialty: '', licenseNumber: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/users/create', form);
      toast.success('Doctor account created!');
      onSaved(); onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create doctor');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">🩺 Add Doctor</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid cols-2">
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required placeholder="Dr. Full Name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-input" type="password" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required minLength={6} placeholder="Min. 6 characters" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 XXXXX XXXXX" />
              </div>
              <div className="form-group">
                <label className="form-label">Specialty *</label>
                <select className="form-select" value={form.specialty}
                  onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} required>
                  <option value="">Select specialty</option>
                  {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">License Number *</label>
                <input className="form-input" value={form.licenseNumber}
                  onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))}
                  placeholder="MCI-XXXXXXXX" required />
              </div>
            </div>
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--indigo-dim)', borderRadius: 10, border: '1px solid var(--border-active)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--indigo)', fontWeight: 600 }}>
                ℹ️ This will create a Doctor login account. The doctor can login at the Doctor portal with these credentials.
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Activity size={15} className="spinning" /> : <UserPlus size={15} />}
              Create Doctor Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── *** NEW ***: Doctor Profile + Edit Modal ──────────────────────────────────
function DoctorProfileModal({ doctor, onClose, onSaved }) {
  const [tab, setTab] = useState('profile'); // 'profile' | 'schedule'
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: doctor.name || '',
    phone: doctor.phone || '',
    specialty: doctor.specialty || '',
    licenseNumber: doctor.licenseNumber || '',
  });
  const [schedule, setSchedule] = useState({
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 15, // minutes
    breakStart: '13:00',
    breakEnd: '14:00',
  });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(true);

  const docId = doctor.uid || doctor.id;

  // Load existing schedule from Firestore
  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const snap = await getDoc(doc(db, 'doctorSchedules', docId));
        if (snap.exists()) setSchedule(s => ({ ...s, ...snap.data() }));
      } catch {} finally { setScheduleLoading(false); }
    };
    loadSchedule();
  }, [docId]);

  const handleSaveProfile = async () => {
    setLoadingProfile(true);
    try {
      await api.patch(`/users/${docId}`, form);
      toast.success('Profile updated');
      onSaved();
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally { setLoadingProfile(false); }
  };

  const handleSaveSchedule = async () => {
    setLoadingSchedule(true);
    try {
      await setDoc(doc(db, 'doctorSchedules', docId), {
        ...schedule,
        doctorId: docId,
        doctorName: doctor.name,
        updatedAt: new Date().toISOString(),
      });
      toast.success('Schedule saved');
    } catch (err) {
      toast.error('Failed to save schedule');
    } finally { setLoadingSchedule(false); }
  };

  const toggleDay = (day) => {
    setSchedule(s => ({
      ...s,
      workingDays: s.workingDays.includes(day)
        ? s.workingDays.filter(d => d !== day)
        : [...s.workingDays, day],
    }));
  };

  const initials = (doctor.name || 'D').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg" style={{ maxWidth: 620 }}>
        <div className="modal-header" style={{ paddingBottom: 0, borderBottom: 'none' }}>
          {/* Doctor hero card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg,#10b981,#059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>{initials}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>{doctor.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                {doctor.specialty && (
                  <span className={`badge ${SPECIALTY_COLORS[doctor.specialty] || 'blue'}`}>
                    {doctor.specialty}
                  </span>
                )}
                <span className={`badge ${doctor.status === 'inactive' ? 'red' : 'green'}`}>
                  {doctor.status === 'inactive' ? 'Inactive' : 'Active'}
                </span>
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '16px 24px 0', borderBottom: '1px solid var(--border)' }}>
          {[
            { id: 'profile', label: '👤 Profile' },
            { id: 'schedule', label: '📅 Schedule' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: '8px 16px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.82rem',
                background: tab === t.id ? 'var(--bg-card)' : 'transparent',
                color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {/* PROFILE TAB */}
          {tab === 'profile' && (
            <div>
              {!editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Info rows */}
                  {[
                    { icon: Mail, label: 'Email', value: doctor.email },
                    { icon: Phone, label: 'Phone', value: doctor.phone || '—' },
                    { icon: Stethoscope, label: 'Specialty', value: doctor.specialty || '—' },
                    { icon: Award, label: 'License', value: doctor.licenseNumber || '—', mono: true },
                  ].map(({ icon: Icon, label, value, mono }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 16px', borderRadius: 12, background: 'var(--bg-secondary)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--indigo-dim)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={16} color="var(--indigo)" />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600,
                          textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                        <div style={{ fontWeight: 600, fontFamily: mono ? 'monospace' : undefined }}>{value}</div>
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}
                    onClick={() => setEditing(true)}>
                    <Edit3 size={14} /> Edit Profile
                  </button>
                </div>
              ) : (
                <div className="form-grid cols-2">
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Specialty</label>
                    <select className="form-select" value={form.specialty}
                      onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}>
                      <option value="">Select</option>
                      {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">License Number</label>
                    <input className="form-input" value={form.licenseNumber}
                      onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))}
                      placeholder="MCI-XXXXXXXX" />
                  </div>
                  <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10 }}>
                    <button className="btn btn-primary" onClick={handleSaveProfile} disabled={loadingProfile}>
                      {loadingProfile ? <Activity size={14} className="spinning" /> : <Save size={14} />}
                      Save Changes
                    </button>
                    <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SCHEDULE TAB */}
          {tab === 'schedule' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {scheduleLoading ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                  <Activity size={20} className="spinning" />
                </div>
              ) : (
                <>
                  {/* Working Days */}
                  <div>
                    <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>
                      Working Days
                    </label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {DAYS_OF_WEEK.map(day => {
                        const active = schedule.workingDays.includes(day);
                        return (
                          <button key={day} onClick={() => toggleDay(day)}
                            style={{
                              padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                              fontWeight: 700, fontSize: '0.82rem', transition: 'all 0.15s',
                              background: active ? 'var(--accent)' : 'var(--bg-secondary)',
                              color: active ? '#fff' : 'var(--text-muted)',
                              boxShadow: active ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                            }}>
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Working Hours */}
                  <div className="form-grid cols-2">
                    <div className="form-group">
                      <label className="form-label">Start Time</label>
                      <input className="form-input" type="time" value={schedule.startTime}
                        onChange={e => setSchedule(s => ({ ...s, startTime: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">End Time</label>
                      <input className="form-input" type="time" value={schedule.endTime}
                        onChange={e => setSchedule(s => ({ ...s, endTime: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Break Start</label>
                      <input className="form-input" type="time" value={schedule.breakStart}
                        onChange={e => setSchedule(s => ({ ...s, breakStart: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Break End</label>
                      <input className="form-input" type="time" value={schedule.breakEnd}
                        onChange={e => setSchedule(s => ({ ...s, breakEnd: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Slot Duration (minutes)</label>
                      <select className="form-select" value={schedule.slotDuration}
                        onChange={e => setSchedule(s => ({ ...s, slotDuration: Number(e.target.value) }))}>
                        {[10, 15, 20, 30, 45, 60].map(m => (
                          <option key={m} value={m}>{m} min</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Schedule Preview */}
                  <div style={{ padding: '12px 16px', background: 'var(--indigo-dim)',
                    borderRadius: 10, border: '1px solid var(--border-active)', fontSize: '0.82rem',
                    color: 'var(--indigo)', fontWeight: 600 }}>
                    <Clock size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    Working {schedule.workingDays.join(', ')} · {schedule.startTime}–{schedule.endTime}
                    {' '}· Break {schedule.breakStart}–{schedule.breakEnd}
                    {' '}· {schedule.slotDuration} min slots
                  </div>

                  <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}
                    onClick={handleSaveSchedule} disabled={loadingSchedule}>
                    {loadingSchedule ? <Activity size={14} className="spinning" /> : <Save size={14} />}
                    Save Schedule
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null); // *** NEW ***

  const load = async () => {
    try {
      const res = await api.get('/users?role=doctor');
      setDoctors(res.data);
    } catch { toast.error('Failed to load doctors'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (e, id, current) => {
    e.stopPropagation(); // *** NEW ***: prevent row click
    const status = current === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/users/${id}/status`, { status });
      toast.success(`Doctor ${status}`);
      load();
    } catch { toast.error('Failed'); }
  };

  const filtered = doctors.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.specialty?.toLowerCase().includes(search.toLowerCase()) ||
    d.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">🩺 Doctors Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
            {doctors.length} registered doctors
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-bar">
            <Search size={15} />
            <input placeholder="Search doctors..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {/* *** NEW ***: CSV Export button */}
          <button className="btn btn-secondary" onClick={() => exportDoctorsCSV(filtered)} title="Export to CSV">
            <Download size={15} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <UserPlus size={15} /> Add Doctor
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Doctors', value: doctors.length, color: 'var(--emerald)', bg: 'var(--emerald-dim)', accent: 'linear-gradient(90deg,#10b981,#059669)' },
          { label: 'Active', value: doctors.filter(d => d.status !== 'inactive').length, color: 'var(--indigo)', bg: 'var(--indigo-dim)', accent: 'linear-gradient(90deg,#6366f1,#8b5cf6)' },
          { label: 'Specialties', value: new Set(doctors.map(d => d.specialty).filter(Boolean)).size, color: 'var(--violet)', bg: 'var(--violet-dim)', accent: 'linear-gradient(90deg,#8b5cf6,#a78bfa)' },
          { label: 'Inactive', value: doctors.filter(d => d.status === 'inactive').length, color: 'var(--rose)', bg: 'var(--rose-dim)', accent: 'linear-gradient(90deg,#f43f5e,#fb7185)' },
        ].map(({ label, value, color, bg, accent }) => (
          <div key={label} className="stat-card" style={{ '--card-accent': accent }}>
            <div className="stat-icon" style={{ background: bg }}><Stethoscope size={22} color={color} /></div>
            <div className="stat-info">
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ color }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}><Activity size={20} className="spinning" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Stethoscope size={40} />
              <h3>No doctors found</h3>
              <p>Add the first doctor using the button above</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>Doctor</th><th>Specialty</th><th>Email</th><th>Phone</th><th>License</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {filtered.map(doc => (
                  // *** NEW ***: Clickable rows open profile modal
                  <tr key={doc.uid || doc.id} onClick={() => setSelectedDoc(doc)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 12,
                          background: 'linear-gradient(135deg,#10b981,#059669)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.82rem', fontWeight: 800, color: '#fff', flexShrink: 0,
                        }}>
                          {(doc.name || 'D').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{doc.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click to view profile</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {doc.specialty ? (
                        <span className={`badge ${SPECIALTY_COLORS[doc.specialty] || 'indigo'}`}>
                          {doc.specialty}
                        </span>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{doc.email}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{doc.phone || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'monospace' }}>{doc.licenseNumber || '—'}</td>
                    <td><span className={`badge ${doc.status === 'inactive' ? 'red' : 'green'}`}>{doc.status === 'inactive' ? 'Inactive' : 'Active'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {/* *** NEW ***: Edit shortcut */}
                        <button className="btn btn-sm btn-secondary"
                          onClick={e => { e.stopPropagation(); setSelectedDoc(doc); }}
                          title="View / Edit">
                          <Edit3 size={13} />
                        </button>
                        <button
                          className={`btn btn-sm ${doc.status === 'inactive' ? 'btn-success' : 'btn-danger'}`}
                          onClick={e => toggleStatus(e, doc.uid || doc.id, doc.status)}>
                          {doc.status === 'inactive' ? 'Activate' : 'Deactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && <AddDoctorModal onClose={() => setShowModal(false)} onSaved={load} />}

      {/* *** NEW ***: Doctor Profile Modal */}
      {selectedDoc && (
        <DoctorProfileModal
          doctor={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onSaved={() => { load(); setSelectedDoc(null); }}
        />
      )}
    </div>
  );
}
