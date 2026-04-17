import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { CalendarPlus, Search, Calendar, Activity, X, CheckCircle, XCircle, Mail, Copy, CalendarClock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { sendEmailReminder, copyReminderToClipboard } from '../../utils/emailReminder';
import { sendSMSReminder, sendWhatsAppReminder, openWhatsAppWeb, copyReminderText } from '../../utils/smsReminder';
import { db } from '../../firebase';
import { getDoc, doc } from 'firebase/firestore';

// ===== SCHEDULE APPOINTMENT MODAL =====
function AppointmentModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    patientId: '', patientName: '', patientEmail: '',
    doctorId: '', doctorName: '', date: '', time: '',
    type: 'General', notes: '', fee: ''
  });
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [doctorLeaves, setDoctorLeaves] = useState({});

  useEffect(() => {
    Promise.all([api.get('/patients'), api.get('/users?role=doctor')])
      .then(([p, d]) => {
        setPatients(p.data);
        setDoctors(d.data);
        const docs = d.data;
        Promise.all(
          docs.map(async (doctor) => {
            const id = doctor.uid || doctor.id;
            try {
              const snap = await getDoc(doc(db, 'doctorLeaves', id));
              const leaves = snap.exists() ? (snap.data().leaves || []).map(l => l.date) : [];
              return [id, leaves];
            } catch { return [id, []]; }
          })
        ).then(entries => {
          setDoctorLeaves(Object.fromEntries(entries));
        });
      })
      .catch(() => {});
  }, []);

  const isDoctorOnLeave = (doctorId, date) => {
    if (!date || !doctorId) return false;
    const leaves = doctorLeaves[doctorId] || [];
    return leaves.includes(date);
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.patientId?.includes(patientSearch)
  );

  const selectPatient = (p) => {
    setForm(f => ({ ...f, patientId: p.id, patientName: p.name, patientEmail: p.email || '' }));
    setPatientSearch(p.name);
  };

  const selectDoctor = (e) => {
    const doc = doctors.find(d => (d.uid || d.id) === e.target.value);
    if (doc) setForm(f => ({ ...f, doctorId: doc.uid || doc.id, doctorName: doc.name }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/appointments', form);
      toast.success('Appointment scheduled!');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">📅 Schedule Appointment</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid cols-2">

              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Search Patient *</label>
                <input
                  className="form-input"
                  placeholder="Type patient name or ID..."
                  value={patientSearch}
                  onChange={e => {
                    setPatientSearch(e.target.value);
                    setForm(f => ({ ...f, patientId: '', patientName: '' }));
                  }}
                />
                {patientSearch && !form.patientId && filteredPatients.length > 0 && (
                  <div style={{
                    background: '#fff', border: '1.5px solid var(--border)',
                    borderRadius: 10, maxHeight: 180, overflowY: 'auto',
                    marginTop: 4, boxShadow: 'var(--shadow)'
                  }}>
                    {filteredPatients.slice(0, 5).map(p => (
                      <div key={p.id} onClick={() => selectPatient(p)}
                        style={{
                          padding: '10px 14px', cursor: 'pointer',
                          borderBottom: '1px solid var(--border)', fontSize: '0.875rem'
                        }}>
                        <strong>{p.name}</strong>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                          · {p.patientId} · {p.age}y
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {form.patientId && (
                  <span className="badge green" style={{ marginTop: 6 }}>✓ {form.patientName}</span>
                )}
              </div>

              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Select Doctor *</label>
                <select className="form-select" onChange={selectDoctor} required defaultValue="">
                  <option value="" disabled>Choose doctor...</option>
                  {doctors.map(d => {
                    const id = d.uid || d.id;
                    const onLeave = isDoctorOnLeave(id, form.date);
                    return (
                      <option key={id} value={id}>
                        {onLeave ? '🏖️ ON LEAVE — ' : ''}{d.name}{d.specialty ? ` — ${d.specialty}` : ''}
                      </option>
                    );
                  })}
                </select>
                {form.doctorId && form.date && isDoctorOnLeave(form.doctorId, form.date) && (
                  <div style={{
                    marginTop: 8, padding: '10px 14px',
                    background: '#fff7ed', border: '1.5px solid #f97316',
                    borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: '0.85rem', fontWeight: 600, color: '#c2410c'
                  }}>
                    ⚠️ This doctor is on leave on {form.date}. Please choose another date or doctor.
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Date *</label>
                <input
                  className="form-input" type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Time *</label>
                <input
                  className="form-input" type="time"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Appointment Type</label>
                <select className="form-select" value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {['General', 'Specialist', 'Emergency', 'Follow-up', 'Lab', 'Surgery'].map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Consultation Fee (₹)</label>
                <input
                  className="form-input" type="number"
                  value={form.fee}
                  onChange={e => setForm(f => ({ ...f, fee: e.target.value }))}
                  placeholder="500" min={0}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Notes</label>
                <textarea
                  className="form-textarea"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional notes..."
                />
              </div>

            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Activity size={15} className="spinning" /> : <CalendarPlus size={15} />}
              Schedule Appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== ✅ NEW: RESCHEDULE MODAL =====
function RescheduleModal({ appointment, onClose, onSaved }) {
  const [date, setDate] = useState(appointment.date || '');
  const [time, setTime] = useState(appointment.time || '');
  const [loading, setLoading] = useState(false);

  // Check if date/time actually changed
  const isChanged = date !== appointment.date || time !== appointment.time;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isChanged) {
      toast.error('Please choose a different date or time');
      return;
    }
    setLoading(true);
    try {
      await api.put(`/appointments/${appointment.id}`, {
        ...appointment,
        date,
        time,
        status: 'scheduled', // reset to scheduled if it was something else
      });
      toast.success(`✅ Rescheduled to ${new Date(date).toLocaleDateString('en-IN')} at ${time}`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reschedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h3 className="modal-title">🗓️ Reschedule Appointment</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* Patient + Doctor info card */}
            <div style={{
              background: 'linear-gradient(135deg,var(--indigo-dim),var(--violet-dim))',
              borderRadius: 12, padding: '14px 18px', marginBottom: 20,
              border: '1px solid var(--border-active)',
            }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: 6 }}>
                {appointment.patientName}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span>👨‍⚕️ Dr. {appointment.doctorName}</span>
                <span>📅 Current: <strong>{new Date(appointment.date).toLocaleDateString('en-IN')}</strong> at <strong>{appointment.time}</strong></span>
                <span className={`badge ${appointment.type === 'Emergency' ? 'red' : 'indigo'}`} style={{ marginTop: 4, width: 'fit-content' }}>
                  {appointment.type}
                </span>
              </div>
            </div>

            <div className="form-grid cols-2">
              <div className="form-group">
                <label className="form-label">New Date *</label>
                <input
                  className="form-input"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">New Time *</label>
                <input
                  className="form-input"
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Show what will change */}
            {isChanged && (
              <div style={{
                marginTop: 4, padding: '10px 14px',
                background: 'var(--emerald-dim)', border: '1.5px solid var(--emerald)',
                borderRadius: 10, fontSize: '0.83rem', color: 'var(--emerald)', fontWeight: 600,
              }}>
                ✅ Will reschedule to: {date ? new Date(date).toLocaleDateString('en-IN') : '—'} at {time || '—'}
              </div>
            )}

          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !isChanged}>
              {loading ? <Activity size={15} className="spinning" /> : <CalendarClock size={15} />}
              Confirm Reschedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== EMAIL REMINDER MODAL =====
function ReminderModal({ appointment, onClose }) {
  const [sending, setSending] = useState({ sms: false, whatsapp: false, email: false });
  const [copied, setCopied] = useState(false);

  const phone = appointment.patientPhone || '';
  const hasPhone = !!phone;
  const hasEmail = !!appointment.patientEmail;

  const handle = async (type) => {
    setSending(s => ({ ...s, [type]: true }));
    try {
      let result;
      if (type === 'sms')       result = await sendSMSReminder(phone, appointment);
      if (type === 'whatsapp')  result = await sendWhatsAppReminder(phone, appointment);
      if (type === 'email')     result = await sendEmailReminder(appointment);
      if (result?.success) {
        toast.success(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} reminder sent!`);
        onClose();
      } else {
        toast.error(`❌ ${result?.error || 'Failed to send'}`);
      }
    } catch (e) {
      toast.error('Failed: ' + e.message);
    } finally {
      setSending(s => ({ ...s, [type]: false }));
    }
  };

  const handleCopy = () => {
    copyReminderText(appointment);
    setCopied(true);
    toast.success('✅ Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppWeb = () => {
    if (!hasPhone) return toast.error('No phone number for this patient');
    openWhatsAppWeb(phone, appointment);
  };

  const btnStyle = (disabled) => ({
    justifyContent: 'center', padding: '12px 18px', fontSize: '0.875rem',
    opacity: disabled ? 0.5 : 1,
  });

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3 className="modal-title">📲 Send Appointment Reminder</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">

          <div style={{
            background: 'linear-gradient(135deg,var(--indigo-dim),var(--violet-dim))',
            borderRadius: 12, padding: '16px 20px', marginBottom: 20,
            border: '1px solid var(--border-active)',
          }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 8 }}>{appointment.patientName}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>👨‍⚕️ Dr. {appointment.doctorName}</span>
              <span>📅 {appointment.date} at {appointment.time} · {appointment.type}</span>
              {hasPhone
                ? <span>📱 <strong style={{ color: 'var(--emerald)' }}>{phone}</strong></span>
                : <span style={{ color: 'var(--rose)', fontWeight: 600 }}>⚠️ No phone number on record</span>
              }
              {hasEmail
                ? <span>📧 <strong style={{ color: 'var(--emerald)' }}>{appointment.patientEmail}</strong></span>
                : <span style={{ color: 'var(--rose)', fontWeight: 600 }}>⚠️ No email on record</span>
              }
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-primary" style={btnStyle(!hasPhone)}
              onClick={() => handle('sms')} disabled={sending.sms || !hasPhone}>
              {sending.sms ? <><Activity size={15} className="spinning" /> Sending SMS...</> : <>📱 Send SMS</>}
            </button>
            <button className="btn btn-success" style={{ ...btnStyle(!hasPhone), background: '#25d366', borderColor: '#25d366', color: '#fff' }}
              onClick={() => handle('whatsapp')} disabled={sending.whatsapp || !hasPhone}>
              {sending.whatsapp ? <><Activity size={15} className="spinning" /> Sending WhatsApp...</> : <>💬 Send WhatsApp (API)</>}
            </button>
            <button className="btn btn-secondary"
              style={{ ...btnStyle(!hasPhone), borderColor: '#25d366', color: '#25d366' }}
              onClick={handleWhatsAppWeb} disabled={!hasPhone}>
              🔗 Open WhatsApp Web (Manual)
            </button>
            <button className="btn btn-secondary" style={btnStyle(!hasEmail)}
              onClick={() => handle('email')} disabled={sending.email || !hasEmail}>
              {sending.email ? <><Activity size={15} className="spinning" /> Sending...</> : <><Mail size={15} /> Send Email</>}
            </button>
            <button className="btn btn-ghost" style={btnStyle(false)} onClick={handleCopy}>
              <Copy size={15} />{copied ? '✓ Copied!' : 'Copy Text (paste in SMS/WA)'}
            </button>
          </div>

          <div className="alert info" style={{ marginTop: 16, fontSize: '0.78rem' }}>
            💡 <strong>SMS / WhatsApp API</strong> needs MSG91 or Twilio keys in <code>.env</code>.
            &nbsp;<strong>WhatsApp Web</strong> and <strong>Copy</strong> work without any setup.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN APPOINTMENTS PAGE =====
export default function Appointments() {
  const { userData } = useAuth();
  const { addNotification } = useNotifications();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [reminderAppt, setReminderAppt] = useState(null);
  const [rescheduleAppt, setRescheduleAppt] = useState(null); // ✅ NEW
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [statFilter, setStatFilter] = useState(null);

  const canAdd = ['admin', 'receptionist'].includes(userData?.role);

  const load = async () => {
    try {
      const res = await api.get('/appointments');
      setAppointments(res.data);
    } catch {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (appt, status) => {
    try {
      await api.patch(`/appointments/${appt.id}/status`, { status });
      toast.success(`Appointment marked as ${status}!`);
      if (status === 'completed' && appt.doctorId) {
        await addNotification(appt.doctorId, {
          title: 'Appointment Completed',
          description: `Appointment with ${appt.patientName} has been marked as completed`,
          type: 'appointment',
          icon: 'calendar',
          color: 'emerald',
        });
      }
      load();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filtered = appointments.filter(a => {
    const matchSearch =
      a.patientName?.toLowerCase().includes(search.toLowerCase()) ||
      a.doctorName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const today = new Date().toISOString().split('T')[0];

  const statDrillRows = statFilter === 'today' ? appointments.filter(a => a.date === today)
    : statFilter === 'scheduled' ? appointments.filter(a => a.status === 'scheduled')
    : statFilter === 'completed' ? appointments.filter(a => a.status === 'completed')
    : statFilter === 'total' ? appointments
    : null;
  const statDrillTitle = statFilter === 'today' ? "📅 Today's Appointments"
    : statFilter === 'scheduled' ? '⏳ Scheduled Appointments'
    : statFilter === 'completed' ? '✅ Completed Appointments'
    : statFilter === 'total' ? '📋 All Appointments'
    : '';

  const statusBadge = s => ({
    scheduled: 'yellow',
    completed: 'green',
    cancelled: 'red',
    'in-progress': 'blue'
  }[s] || 'gray');

  return (
    <div>

      {/* Page Header */}
      <div className="section-header">
        <div>
          <h2 className="section-title">Appointments</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
            {appointments.length} total appointments
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-bar">
            <Search size={15} />
            <input
              placeholder="Search patient or doctor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ width: 140 }}
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {canAdd && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <CalendarPlus size={15} /> Schedule
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          { key: 'today',     label: 'Today',     value: appointments.filter(a => a.date === today).length, color: 'var(--indigo)',  bg: 'var(--indigo-dim)',  accent: 'linear-gradient(90deg,#6366f1,#8b5cf6)' },
          { key: 'scheduled', label: 'Scheduled', value: appointments.filter(a => a.status === 'scheduled').length, color: 'var(--amber)',   bg: 'var(--amber-dim)',   accent: 'linear-gradient(90deg,#f59e0b,#f97316)' },
          { key: 'completed', label: 'Completed', value: appointments.filter(a => a.status === 'completed').length, color: 'var(--emerald)', bg: 'var(--emerald-dim)', accent: 'linear-gradient(90deg,#10b981,#059669)' },
          { key: 'total',     label: 'Total',     value: appointments.length, color: 'var(--violet)',  bg: 'var(--violet-dim)',  accent: 'linear-gradient(90deg,#8b5cf6,#ec4899)' },
        ].map(({ key, label, value, color, bg, accent }) => (
          <div key={key} className="stat-card" style={{ '--card-accent': accent, cursor: 'pointer', outline: statFilter === key ? `2px solid ${color}` : 'none' }}
            onClick={() => setStatFilter(statFilter === key ? null : key)}>
            <div className="stat-icon" style={{ background: bg }}>
              <Calendar size={22} color={color} />
            </div>
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
              <div className="empty-state" style={{ padding: 24 }}><Calendar size={30} /><p>No appointments found</p></div>
            ) : (
              <table>
                <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Type</th><th>Fee</th><th>Status</th></tr></thead>
                <tbody>
                  {statDrillRows.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 700 }}>{a.patientName}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{a.doctorName}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{a.date}</td>
                      <td><span style={{ fontWeight: 700, color: 'var(--indigo)' }}>{a.time}</span></td>
                      <td><span className="badge indigo">{a.type}</span></td>
                      <td style={{ color: 'var(--emerald)', fontWeight: 700 }}>₹{(a.fee || 0).toLocaleString()}</td>
                      <td><span className={`badge ${statusBadge(a.status)}`}>{a.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Appointments Table */}
      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Activity size={20} className="spinning" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Calendar size={40} />
              <h3>No appointments found</h3>
              <p>Schedule a new appointment using the button above</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Fee</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 700 }}>{a.patientName}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{a.doctorName}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {a.date ? new Date(a.date).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{a.time}</td>
                    <td><span className="badge indigo">{a.type}</span></td>
                    <td style={{ color: 'var(--emerald)', fontWeight: 700 }}>
                      ₹{(a.fee || 0).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${statusBadge(a.status)}`}>{a.status}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {a.status === 'scheduled' && (
                          <>
                            <button
                              className="btn btn-success btn-sm btn-icon"
                              title="Mark as completed"
                              onClick={() => updateStatus(a, 'completed')}
                            >
                              <CheckCircle size={14} />
                            </button>
                            <button
                              className="btn btn-danger btn-sm btn-icon"
                              title="Cancel appointment"
                              onClick={() => updateStatus(a, 'cancelled')}
                            >
                              <XCircle size={14} />
                            </button>
                            {/* ✅ NEW: Reschedule button — only for scheduled appointments */}
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              title="Reschedule appointment"
                              onClick={() => setRescheduleAppt(a)}
                              style={{ color: 'var(--amber)' }}
                            >
                              <CalendarClock size={14} />
                            </button>
                          </>
                        )}
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          title="Send reminder"
                          onClick={() => setReminderAppt(a)}
                          style={{ color: 'var(--sky)' }}
                        >
                          <Mail size={14} />
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

      {/* Modals */}
      {showModal && (
        <AppointmentModal
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
      {reminderAppt && (
        <ReminderModal
          appointment={reminderAppt}
          onClose={() => setReminderAppt(null)}
        />
      )}
      {/* ✅ NEW: Reschedule modal */}
      {rescheduleAppt && (
        <RescheduleModal
          appointment={rescheduleAppt}
          onClose={() => setRescheduleAppt(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
