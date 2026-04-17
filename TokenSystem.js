import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase';
import {
  collection, doc, onSnapshot, setDoc, updateDoc,
  query, orderBy, getDocs, writeBatch, getDoc
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Hash, Zap, Clock, UserCheck, ChevronRight, X, Activity, BellRing, SkipForward, Volume2, VolumeX } from 'lucide-react';
import api from '../../utils/api';

const PRIORITY = { emergency: 1, urgent: 2, normal: 3 };
const PRIORITY_COLORS = {
  emergency: { color: '#f43f5e', bg: '#fff1f2', label: '🚨 Emergency', accent: 'linear-gradient(90deg,#f43f5e,#fb7185)' },
  urgent:    { color: '#f97316', bg: '#fff7ed', label: '⚡ Urgent',    accent: 'linear-gradient(90deg,#f97316,#fb923c)' },
  normal:    { color: '#6366f1', bg: '#eef2ff', label: '🟢 Normal',    accent: 'linear-gradient(90deg,#6366f1,#8b5cf6)' },
};

const AVG_CONSULT_MINS = 10;

function NewTokenModal({ onClose, onSaved, doctors }) {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [priority, setPriority] = useState('normal');
  const [doctorId, setDoctorId] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoAssign, setAutoAssign] = useState(true);

  useEffect(() => {
    api.get('/patients').then(r => setPatients(r.data)).catch(() => {});
  }, []);

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) || p.patientId?.includes(search)
  ).slice(0, 5);

  const selectDoc = (e) => {
    const d = doctors.find(x => (x.uid || x.id) === e.target.value);
    if (d) { setDoctorId(d.uid || d.id); setDoctorName(d.name); setAutoAssign(false); }
  };

  const getAutoDoctor = useCallback(async () => {
    if (!doctors.length) return null;
    const snap = await getDocs(collection(db, 'tokens'));
    const today = new Date().toDateString();
    const counts = {};
    snap.forEach(d => {
      const t = d.data();
      if (new Date(t.createdAt).toDateString() === today && t.doctorId) {
        counts[t.doctorId] = (counts[t.doctorId] || 0) + 1;
      }
    });
    const activeDocs = doctors.filter(d => d.status !== 'inactive');
    if (!activeDocs.length) return doctors[0];
    activeDocs.sort((a, b) => {
      const ca = counts[a.uid || a.id] || 0;
      const cb = counts[b.uid || b.id] || 0;
      return ca - cb;
    });
    return activeDocs[0];
  }, [doctors]);

  const handleSubmit = async () => {
    if (!selected) return toast.error('Select a patient');
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'tokens'));
      const today = new Date().toDateString();
      const todayTokens = [];
      snap.forEach(d => {
        if (new Date(d.data().createdAt).toDateString() === today) todayTokens.push(d.data());
      });

      let tokenNumber;
      if (priority === 'emergency') {
        const emergCount = todayTokens.filter(t => t.priority === 'emergency').length;
        tokenNumber = `E${String(emergCount + 1).padStart(2, '0')}`;
      } else {
        const normalCount = todayTokens.filter(t => t.priority !== 'emergency').length;
        tokenNumber = `T${String(normalCount + 1).padStart(3, '0')}`;
      }

      let assignedDoctorId = doctorId;
      let assignedDoctorName = doctorName;
      if (autoAssign || !doctorId) {
        const auto = await getAutoDoctor();
        if (auto) { assignedDoctorId = auto.uid || auto.id; assignedDoctorName = auto.name; }
      }

      const ahead = todayTokens.filter(t =>
        t.doctorId === assignedDoctorId &&
        t.status === 'waiting' &&
        PRIORITY[t.priority] <= PRIORITY[priority]
      ).length;
      const waitMins = ahead * AVG_CONSULT_MINS;

      const tokenRef = doc(db, 'tokens', `${new Date().getTime()}`);
      await setDoc(tokenRef, {
        tokenNumber,
        patientId: selected.id,
        patientName: selected.name,
        doctorId: assignedDoctorId,
        doctorName: assignedDoctorName,
        priority,
        reason,
        status: 'waiting',
        waitingAhead: ahead,
        estimatedWaitMins: waitMins,
        createdAt: new Date().toISOString(),
        calledAt: null,
        completedAt: null,
      });

      toast.success(`Token ${tokenNumber} generated! Waiting: ~${waitMins} mins`);
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate token');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h3 className="modal-title">🎫 Generate Token</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div className="form-group">
            <label className="form-label">Priority *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(PRIORITY_COLORS).map(([key, val]) => (
                <button key={key} type="button"
                  onClick={() => setPriority(key)}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                    border: `2px solid ${priority === key ? val.color : 'var(--border)'}`,
                    background: priority === key ? val.bg : 'var(--bg-secondary)',
                    color: priority === key ? val.color : 'var(--text-muted)',
                    fontWeight: 700, fontSize: '0.78rem', transition: 'all 0.15s',
                  }}>
                  {val.label}
                </button>
              ))}
            </div>
            {priority === 'emergency' && (
              <div className="alert" style={{ marginTop: 8, background: '#fff1f2', border: '1px solid #f43f5e', color: '#c2410c', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600 }}>
                🚨 Emergency — Patient will be moved to front of queue immediately!
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Patient *</label>
            <input className="form-input" placeholder="Search by name or ID..."
              value={search} onChange={e => { setSearch(e.target.value); setSelected(null); }} />
            {search && !selected && filtered.length > 0 && (
              <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, marginTop: 4, boxShadow: 'var(--shadow)' }}>
                {filtered.map(p => (
                  <div key={p.id} onClick={() => { setSelected(p); setSearch(p.name); }}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                    <strong>{p.name}</strong>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>· {p.patientId} · {p.age}y</span>
                  </div>
                ))}
              </div>
            )}
            {selected && <span className="badge green" style={{ marginTop: 6 }}>✓ {selected.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Doctor</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <input type="checkbox" id="autoAssign" checked={autoAssign}
                onChange={e => { setAutoAssign(e.target.checked); if (e.target.checked) { setDoctorId(''); setDoctorName(''); } }} />
              <label htmlFor="autoAssign" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                ⚡ Auto-assign (least busy doctor)
              </label>
            </div>
            {!autoAssign && (
              <select className="form-select" defaultValue="" onChange={selectDoc}>
                <option value="" disabled>Choose doctor...</option>
                {doctors.map(d => (
                  <option key={d.uid || d.id} value={d.uid || d.id}>
                    {d.name}{d.specialty ? ` — ${d.specialty}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Chief Complaint</label>
            <input className="form-input" placeholder="Brief reason for visit..."
              value={reason} onChange={e => setReason(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <Activity size={15} className="spinning" /> : <Hash size={15} />}
            Generate Token
          </button>
        </div>
      </div>
    </div>
  );
}

function TokenCard({ token, onCall, onComplete, onSkip }) {
  const pc = PRIORITY_COLORS[token.priority] || PRIORITY_COLORS.normal;
  const admittedMins = token.createdAt
    ? Math.floor((Date.now() - new Date(token.createdAt).getTime()) / 60000)
    : 0;

  return (
    <div style={{
      background: '#fff', borderRadius: 14,
      border: `1.5px solid ${token.status === 'called' || token.status === 'in-progress' ? pc.color : 'var(--border)'}`,
      padding: '14px 16px',
      boxShadow: token.status === 'called' ? `0 4px 16px ${pc.color}33` : '0 1px 4px rgba(0,0,0,0.05)',
      position: 'relative', overflow: 'hidden',
    }}>
      {(token.status === 'called' || token.status === 'in-progress') && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: pc.accent || pc.color }} />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background: pc.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: '1rem', color: pc.color, flexShrink: 0,
          }}>
            {token.tokenNumber}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{token.patientName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Dr. {token.doctorName} · {token.reason || 'General consultation'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{
            padding: '2px 8px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700,
            background: pc.bg, color: pc.color,
          }}>{pc.label}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <Clock size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
            {admittedMins}m ago
          </span>
        </div>
      </div>

      {token.status === 'waiting' && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Est. wait: <strong style={{ color: 'var(--text-primary)' }}>~{token.estimatedWaitMins || 0} mins</strong>
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-sm btn-ghost" onClick={() => onSkip(token)} title="Skip" style={{ color: 'var(--text-muted)' }}>
              <SkipForward size={13} />
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => onCall(token)}>
              <BellRing size={13} /> Call
            </button>
          </div>
        </div>
      )}
      {(token.status === 'called' || token.status === 'in-progress') && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${pc.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: pc.color }}>
            {token.status === 'called' ? '📣 Called — Waiting to enter' : '🩺 In Progress'}
          </span>
          <button className="btn btn-sm btn-success" onClick={() => onComplete(token)}>
            <UserCheck size={13} /> Done
          </button>
        </div>
      )}
    </div>
  );
}

export default function TokenQueue() {
  const [tokens, setTokens] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filterDoctor, setFilterDoctor] = useState('all');
  const [currentToken, setCurrentToken] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true); // ✅ NEW

  useEffect(() => {
    api.get('/users?role=doctor').then(r => setDoctors(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'tokens'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      const today = new Date().toDateString();
      const list = [];
      snap.forEach(d => {
        const t = { id: d.id, ...d.data() };
        if (new Date(t.createdAt).toDateString() === today) list.push(t);
      });
      list.sort((a, b) => {
        const pd = PRIORITY[a.priority] - PRIORITY[b.priority];
        if (pd !== 0) return pd;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
      setTokens(list);
      const cur = list.find(t => t.status === 'called' || t.status === 'in-progress');
      setCurrentToken(cur || null);
    });
    return () => unsub();
  }, []);

  const announceToken = (token) => {
    if (!audioEnabled) return;
    if (!window.speechSynthesis) return;

    const voices = window.speechSynthesis.getVoices();
    // Microsoft David — offline voice, responds correctly to rate changes in Edge
    const preferred = voices.find(v => v.name === 'Microsoft David - English (United States)')
      || voices.find(v => v.localService && v.lang.startsWith('en'))
      || voices[0];

    // Part 1: Token number — fast
    window._tokenU1 = new SpeechSynthesisUtterance(`Token number ${token.tokenNumber}.`);
    window._tokenU1.voice = preferred;
    window._tokenU1.rate = 1.8;
    window._tokenU1.pitch = 1;
    window._tokenU1.volume = 1;

    // Part 2: Patient name + instruction — slightly slower
    window._tokenU2 = new SpeechSynthesisUtterance(`${token.patientName}, please proceed to the consultation room.`);
    window._tokenU2.voice = preferred;
    window._tokenU2.rate = 1.4;
    window._tokenU2.pitch = 1;
    window._tokenU2.volume = 1;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(window._tokenU1);
    window.speechSynthesis.speak(window._tokenU2);
  };

  // announce FIRST (user gesture context), then await Firestore
  const callToken = async (token) => {
    announceToken(token);
    toast.success(`Token ${token.tokenNumber} called!`);
    await updateDoc(doc(db, 'tokens', token.id), { status: 'called', calledAt: new Date().toISOString() });
  };

  const completeToken = async (token) => {
    await updateDoc(doc(db, 'tokens', token.id), { status: 'done', completedAt: new Date().toISOString() });
    toast.success(`Token ${token.tokenNumber} completed`);
  };

  const skipToken = async (token) => {
    await updateDoc(doc(db, 'tokens', token.id), { status: 'skipped' });
    toast.success(`Token ${token.tokenNumber} skipped`);
  };

  const waiting = tokens.filter(t => t.status === 'waiting' && (filterDoctor === 'all' || t.doctorId === filterDoctor));
  const active  = tokens.filter(t => (t.status === 'called' || t.status === 'in-progress') && (filterDoctor === 'all' || t.doctorId === filterDoctor));
  const done    = tokens.filter(t => (t.status === 'done' || t.status === 'skipped') && (filterDoctor === 'all' || t.doctorId === filterDoctor));

  const todayTotal       = tokens.length;
  const todayDone        = tokens.filter(t => t.status === 'done').length;
  const emergencyWaiting = waiting.filter(t => t.priority === 'emergency').length;
  const avgWait          = waiting.length ? Math.round(waiting.reduce((s, t) => s + (t.estimatedWaitMins || 0), 0) / waiting.length) : 0;

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">🎫 Token Queue</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
            {waiting.length} waiting · {todayDone}/{todayTotal} done today
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* ✅ NEW — Audio toggle button */}
          <button
            className={`btn ${audioEnabled ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setAudioEnabled(prev => {
                const next = !prev;
                toast(next ? '🔊 Announcements enabled' : '🔇 Announcements muted');
                return next;
              });
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            title={audioEnabled ? 'Mute announcements' : 'Enable announcements'}
          >
            {audioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            {audioEnabled ? 'Audio On' : 'Audio Off'}
          </button>

          <select className="form-select" style={{ width: 180 }}
            value={filterDoctor} onChange={e => setFilterDoctor(e.target.value)}>
            <option value="all">All Doctors</option>
            {doctors.map(d => (
              <option key={d.uid || d.id} value={d.uid || d.id}>{d.name}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Hash size={15} /> New Token
          </button>
        </div>
      </div>

      {/* ✅ NEW — Audio status banner */}
      <div style={{
        marginBottom: 16, padding: '10px 16px', borderRadius: 10,
        background: audioEnabled ? 'var(--emerald-dim)' : 'var(--amber-dim)',
        border: `1px solid ${audioEnabled ? 'var(--emerald)' : 'var(--amber)'}`,
        fontSize: '0.82rem', fontWeight: 600,
        color: audioEnabled ? 'var(--emerald)' : 'var(--amber)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {audioEnabled
          ? '🔊 Audio announcements ON — patients will be called out loud when you press "Call"'
          : '🔇 Audio announcements OFF — click "Audio Off" to re-enable'}
      </div>

      {/* Stat Cards */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Waiting',        value: waiting.length, color: 'var(--amber)',   bg: 'var(--amber-dim)',   accent: 'linear-gradient(90deg,#f59e0b,#f97316)', icon: Clock },
          { label: 'Emergency',      value: emergencyWaiting, color: 'var(--rose)', bg: 'var(--rose-dim)',    accent: 'linear-gradient(90deg,#f43f5e,#fb7185)', icon: Zap },
          { label: 'Completed Today',value: todayDone,      color: 'var(--emerald)', bg: 'var(--emerald-dim)', accent: 'linear-gradient(90deg,#10b981,#059669)', icon: UserCheck },
          { label: 'Avg Wait',       value: `${avgWait}m`,  color: 'var(--indigo)',  bg: 'var(--indigo-dim)',  accent: 'linear-gradient(90deg,#6366f1,#8b5cf6)', icon: Clock },
        ].map(({ label, value, color, bg, accent, icon: Icon }) => (
          <div key={label} className="stat-card" style={{ '--card-accent': accent }}>
            <div className="stat-icon" style={{ background: bg }}><Icon size={22} color={color} /></div>
            <div className="stat-info">
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ color }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Current Token Display */}
      {currentToken && (
        <div style={{
          background: `linear-gradient(135deg, ${PRIORITY_COLORS[currentToken.priority].bg}, #fff)`,
          border: `2px solid ${PRIORITY_COLORS[currentToken.priority].color}`,
          borderRadius: 16, padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          boxShadow: `0 4px 24px ${PRIORITY_COLORS[currentToken.priority].color}33`,
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
              🔔 Now Serving
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: PRIORITY_COLORS[currentToken.priority].color, lineHeight: 1 }}>
              {currentToken.tokenNumber}
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: 6 }}>{currentToken.patientName}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Dr. {currentToken.doctorName}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              background: PRIORITY_COLORS[currentToken.priority].color,
              color: '#fff', borderRadius: 12, padding: '8px 18px',
              fontWeight: 800, fontSize: '0.85rem', marginBottom: 8,
            }}>
              {currentToken.status === 'called' ? '📣 Called' : '🩺 In Progress'}
            </div>
            <button className="btn btn-sm btn-success" onClick={() => completeToken(currentToken)}>
              <UserCheck size={13} /> Mark Done
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Waiting Queue */}
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} color="var(--amber)" /> Waiting Queue
            <span style={{ background: 'var(--amber-dim)', color: 'var(--amber)', borderRadius: 20, padding: '1px 8px', fontSize: '0.72rem', fontWeight: 700 }}>{waiting.length}</span>
          </div>
          {waiting.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'var(--bg-secondary)', borderRadius: 12 }}>
              No patients waiting
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {waiting.map(t => (
                <TokenCard key={t.id} token={t} onCall={callToken} onComplete={completeToken} onSkip={skipToken} />
              ))}
            </div>
          )}
        </div>

        {/* Active + Done */}
        <div>
          {active.length > 0 && (
            <>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={16} color="var(--emerald)" /> Active
                <span style={{ background: 'var(--emerald-dim)', color: 'var(--emerald)', borderRadius: 20, padding: '1px 8px', fontSize: '0.72rem', fontWeight: 700 }}>{active.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {active.map(t => (
                  <TokenCard key={t.id} token={t} onCall={callToken} onComplete={completeToken} onSkip={skipToken} />
                ))}
              </div>
            </>
          )}

          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserCheck size={16} color="var(--indigo)" /> Completed Today
            <span style={{ background: 'var(--indigo-dim)', color: 'var(--indigo)', borderRadius: 20, padding: '1px 8px', fontSize: '0.72rem', fontWeight: 700 }}>{done.length}</span>
          </div>
          {done.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'var(--bg-secondary)', borderRadius: 12 }}>
              No completed tokens yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
              {done.slice().reverse().map(t => (
                <div key={t.id} style={{
                  background: 'var(--bg-secondary)', borderRadius: 10, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  opacity: 0.7,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t.tokenNumber}</span>
                    <span style={{ fontSize: '0.82rem' }}>{t.patientName}</span>
                  </div>
                  <span className={`badge ${t.status === 'done' ? 'green' : 'gray'}`}>{t.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <NewTokenModal
          onClose={() => setShowModal(false)}
          onSaved={() => {}}
          doctors={doctors}
        />
      )}
    </div>
  );
}
