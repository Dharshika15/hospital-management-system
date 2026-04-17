import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Calendar, Activity, CheckCircle, XCircle, Clock, Sun, Sunset, AlertTriangle, X, AlarmClock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { db } from '../../firebase';
import { doc, setDoc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';

// Notify all receptionists
async function notifyReceptionists(addNotification, { patientName, doctorName, oldTime, newTime, date, reason }) {
  try {
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'receptionist')));
    const receptionists = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    for (const r of receptionists) {
      await addNotification(r.id, {
        title: 'Appointment Delayed',
        description: `Dr. ${doctorName} delayed ${patientName}'s appointment on ${date} from ${oldTime} to ${newTime}. Reason: ${reason}`,
        type: 'appointment_delay',
        icon: 'clock',
        color: 'amber',
      });
    }
  } catch (err) {
    console.error('Failed to notify receptionists:', err);
  }
}

function DelayModal({ appointment, doctorName, onClose, onSaved, addNotification }) {
  const [newTime, setNewTime] = useState(appointment.time || '');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTime) return toast.error('Please enter new time');
    if (!reason.trim()) return toast.error('Please enter a reason');
    setLoading(true);
    try {
      // Update appointment time in backend
      await api.patch(`/appointments/${appointment.id}/status`, {
        status: 'scheduled',
        time: newTime,
        delayReason: reason,
      });

      // Notify all receptionists
      await notifyReceptionists(addNotification, {
        patientName: appointment.patientName,
        doctorName,
        oldTime: appointment.time,
        newTime,
        date: appointment.date,
        reason,
      });

      toast.success('Appointment delayed & receptionists notified!');
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Failed to update appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3 className="modal-title">⏰ Delay Appointment</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Appointment info */}
            <div style={{ background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{appointment.patientName}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                📅 {appointment.date} &nbsp;·&nbsp; Current time: <strong style={{ color: 'var(--amber)' }}>{appointment.time}</strong>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">New Time *</label>
              <input
                className="form-input"
                type="time"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Reason for Delay *</label>
              <textarea
                className="form-textarea"
                placeholder="e.g. Emergency case, previous patient took longer..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="alert warning" style={{ fontSize: '0.82rem' }}>
              📢 All receptionists will be notified immediately.
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-warning" disabled={loading} style={{ minWidth: 160, justifyContent: 'center', background: 'var(--amber)', color: '#fff', border: 'none' }}>
              {loading ? <><Activity size={15} className="spinning" /> Sending...</> : <><AlarmClock size={15} /> Delay & Notify</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LeaveModal({ doctorId, onClose }) {
  const [leaveDate, setLeaveDate] = useState('');
  const [reason, setReason] = useState('');
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'doctorLeaves', doctorId));
        if (snap.exists()) setLeaves(snap.data().leaves || []);
      } catch {}
    };
    load();
  }, [doctorId]);

  const addLeave = async () => {
    if (!leaveDate) return toast.error('Select a date');
    setLoading(true);
    try {
      const updated = [...leaves.filter(l => l.date !== leaveDate), { date: leaveDate, reason: reason || 'Personal leave' }];
      await setDoc(doc(db, 'doctorLeaves', doctorId), { leaves: updated });
      setLeaves(updated);
      setLeaveDate('');
      setReason('');
      toast.success('Leave marked!');
    } catch { toast.error('Failed'); } finally { setLoading(false); }
  };

  const removeLeave = async (date) => {
    const updated = leaves.filter(l => l.date !== date);
    await setDoc(doc(db, 'doctorLeaves', doctorId), { leaves: updated });
    setLeaves(updated);
    toast.success('Leave removed');
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 480 }}>
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg,#ecfdf5,#f0fdf4)' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>🏖️ Manage Leave</h3>
        </div>
        <div style={{ padding: 24 }}>
          <div className="form-grid cols-2" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Leave Date</label>
              <input className="form-input" type="date" value={leaveDate}
                onChange={e => setLeaveDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="form-group">
              <label className="form-label">Reason</label>
              <input className="form-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Personal, Medical..." />
            </div>
          </div>
          <button className="btn btn-primary" onClick={addLeave} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? <Activity size={15} className="spinning" /> : null} Mark Leave
          </button>

          {leaves.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Upcoming Leaves</div>
              {leaves.sort((a, b) => new Date(a.date) - new Date(b.date)).map(l => (
                <div key={l.date} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--rose-dim)', borderRadius: 8, marginBottom: 6, border: '1px solid rgba(244,63,94,0.15)' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--rose)', fontSize: '0.875rem' }}>{new Date(l.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.reason}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => removeLeave(l.date)} style={{ color: 'var(--rose)' }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function DoctorAppointments() {
  const { userData, user } = useAuth();
  const { addNotification } = useNotifications();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLeave, setShowLeave] = useState(false);
  const [onLeaveToday, setOnLeaveToday] = useState(false);
  const [delayModal, setDelayModal] = useState(null);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const todayAppts = appointments.filter(a => a.date === today);
  const tomorrowAppts = appointments.filter(a => a.date === tomorrow);
  const upcomingAppts = appointments.filter(a => a.date > tomorrow);

  useEffect(() => {
    const load = async () => {
      try {
        const [apptRes, leaveSnap] = await Promise.all([
          api.get('/appointments'),
          getDoc(doc(db, 'doctorLeaves', user?.uid || '')).catch(() => null),
        ]);
        setAppointments(apptRes.data);

        if (leaveSnap?.exists()) {
          const leaves = leaveSnap.data().leaves || [];
          setOnLeaveToday(leaves.some(l => l.date === today));
        }
      } catch { toast.error('Failed to load'); } finally { setLoading(false); }
    };
    if (user) load();
  }, [user, today]);

  const updateStatus = async (appt, status) => {
    try {
      await api.patch(`/appointments/${appt.id}/status`, { status });
      toast.success(`Marked as ${status}!`);
      if (status === 'completed') {
        await addDoc(collection(db, 'logs'), {
          action: 'APPOINTMENT_COMPLETED', targetId: appt.id,
          targetName: appt.patientName, performedBy: user.uid,
          performedByName: userData?.name, timestamp: new Date().toISOString(),
        });
      }
      setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status } : a));
    } catch { toast.error('Failed to update'); }
  };

  const statusBadge = s => ({ scheduled: 'yellow', completed: 'green', cancelled: 'red' }[s] || 'gray');

  const AppointmentTable = ({ appts, title, icon, emptyMsg }) => (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.1rem' }}>{icon}</span>
          <span className="card-title">{title}</span>
          <span className="badge indigo">{appts.length}</span>
        </div>
      </div>
      <div className="table-wrap">
        {appts.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 20px' }}>
            <Calendar size={32} /><h3>{emptyMsg}</h3>
          </div>
        ) : (
          <table>
            <thead><tr><th>Patient</th><th>Time</th><th>Type</th><th>Fee</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {appts.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 700 }}>{a.patientName}</td>
                  <td><span style={{ fontWeight: 700, color: 'var(--indigo)', background: 'var(--indigo-dim)', padding: '3px 10px', borderRadius: 6, fontSize: '0.82rem' }}>{a.time}</span></td>
                  <td><span className="badge indigo">{a.type}</span></td>
                  <td style={{ color: 'var(--emerald)', fontWeight: 700 }}>₹{(a.fee || 0).toLocaleString()}</td>
                  <td><span className={`badge ${statusBadge(a.status)}`}>{a.status}</span></td>
                  <td>
                    {a.status === 'scheduled' && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-success btn-sm btn-icon" title="Complete" onClick={() => updateStatus(a, 'completed')}><CheckCircle size={14} /></button>
                        <button className="btn btn-danger btn-sm btn-icon" title="Cancel" onClick={() => updateStatus(a, 'cancelled')}><XCircle size={14} /></button>
                        <button
                          className="btn btn-sm btn-icon"
                          title="Delay / Reschedule"
                          onClick={() => setDelayModal(a)}
                          style={{ background: 'var(--amber-dim)', color: 'var(--amber)', border: '1px solid rgba(245,158,11,0.3)' }}
                        >
                          <AlarmClock size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}><Activity size={20} className="spinning" /></div>;

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">My Appointments</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>{appointments.length} total appointments</p>
        </div>
        <button className="btn btn-secondary" onClick={() => setShowLeave(true)}>
          🏖️ Manage Leave
        </button>
      </div>

      {/* Leave alert */}
      {onLeaveToday && (
        <div className="alert error" style={{ marginBottom: 20 }}>
          <AlertTriangle size={16} />
          <span>You are on <strong>leave today</strong>. Patients cannot book appointments with you today.</span>
        </div>
      )}

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Today', value: todayAppts.length, color: 'var(--indigo)', bg: 'var(--indigo-dim)', accent: 'linear-gradient(90deg,#6366f1,#8b5cf6)' },
          { label: 'Tomorrow', value: tomorrowAppts.length, color: 'var(--sky)', bg: 'var(--sky-dim)', accent: 'linear-gradient(90deg,#0ea5e9,#38bdf8)' },
          { label: 'Completed Today', value: todayAppts.filter(a => a.status === 'completed').length, color: 'var(--emerald)', bg: 'var(--emerald-dim)', accent: 'linear-gradient(90deg,#10b981,#059669)' },
          { label: 'Pending Today', value: todayAppts.filter(a => a.status === 'scheduled').length, color: 'var(--amber)', bg: 'var(--amber-dim)', accent: 'linear-gradient(90deg,#f59e0b,#f97316)' },
        ].map(({ label, value, color, bg, accent }) => (
          <div key={label} className="stat-card" style={{ '--card-accent': accent }}>
            <div className="stat-icon" style={{ background: bg }}><Clock size={22} color={color} /></div>
            <div className="stat-info">
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ color }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Today Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Sun size={18} color="var(--amber)" />
        <span style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          Today — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>
      <AppointmentTable appts={todayAppts} title="Today's Appointments" icon="📅" emptyMsg="No appointments today" />

      {/* Tomorrow Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 24 }}>
        <Sunset size={18} color="var(--violet)" />
        <span style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          Tomorrow — {new Date(Date.now() + 86400000).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>
      <AppointmentTable appts={tomorrowAppts} title="Tomorrow's Appointments" icon="🔜" emptyMsg="No appointments tomorrow" />

      {/* Upcoming Section */}
      {upcomingAppts.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 24 }}>
            <Calendar size={18} color="var(--sky)" />
            <span style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              Upcoming ({upcomingAppts.length})
            </span>
          </div>
          <AppointmentTable appts={upcomingAppts} title="Upcoming Appointments" icon="📆" emptyMsg="No upcoming appointments" />
        </>
      )}

      {showLeave && <LeaveModal doctorId={user?.uid} onClose={() => setShowLeave(false)} />}
      {delayModal && (
        <DelayModal
          appointment={delayModal}
          doctorName={userData?.name || 'Doctor'}
          onClose={() => setDelayModal(null)}
          onSaved={() => {
            setAppointments(prev => prev.map(a =>
              a.id === delayModal.id ? { ...a, time: delayModal.newTime || a.time } : a
            ));
            setDelayModal(null);
          }}
          addNotification={addNotification}
        />
      )}
    </div>
  );
}
