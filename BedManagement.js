import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection, doc, onSnapshot, setDoc, updateDoc, getDocs, getDoc, runTransaction
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { BedDouble, Plus, X, Activity, UserCheck, LogOut, Search } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const WARD_CONFIG = {
  ICU:     { label: 'ICU',          color: '#f43f5e', bg: '#fff1f2', accent: 'linear-gradient(90deg,#f43f5e,#fb7185)', total: 10 },
  HDU:     { label: 'HDU',          color: '#f97316', bg: '#fff7ed', accent: 'linear-gradient(90deg,#f97316,#fb923c)', total: 8  },
  General: { label: 'General Ward', color: '#6366f1', bg: '#eef2ff', accent: 'linear-gradient(90deg,#6366f1,#8b5cf6)', total: 20 },
  Maternity:{ label: 'Maternity',   color: '#ec4899', bg: '#fdf2f8', accent: 'linear-gradient(90deg,#ec4899,#f472b6)', total: 10 },
  Pediatric:{ label: 'Pediatric',   color: '#10b981', bg: '#f0fdf4', accent: 'linear-gradient(90deg,#10b981,#34d399)', total: 8  },
};

function AdmitModal({ ward, bedNo, onClose, onSaved }) {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [doctorId, setDoctorId] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/patients'), api.get('/users?role=doctor')])
      .then(([p, d]) => { setPatients(p.data); setDoctors(d.data); });
  }, []);

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) || p.patientId?.includes(search)
  ).slice(0, 5);

  const selectDoc = (e) => {
    const d = doctors.find(x => (x.uid || x.id) === e.target.value);
    if (d) { setDoctorId(d.uid || d.id); setDoctorName(d.name); }
  };

  const handleAdmit = async () => {
    if (!selected) return toast.error('Select a patient');
    if (!doctorId) return toast.error('Select a doctor');
    setLoading(true);
    try {
      const bedRef = doc(db, 'beds', `${ward}_${bedNo}`);

      // Use a Firestore transaction to prevent race-condition conflicts
      await runTransaction(db, async (transaction) => {
        const bedSnap = await transaction.get(bedRef);

        // Conflict check: if bed is already occupied, abort
        if (bedSnap.exists() && bedSnap.data().status === 'occupied') {
          throw new Error(`Bed ${bedNo} in ${ward} is already occupied by ${bedSnap.data().patientName}. Please choose another bed.`);
        }

        // Also check: is this patient already admitted to any bed?
        const allBedsSnap = await getDocs(collection(db, 'beds'));
        const alreadyAdmitted = allBedsSnap.docs.find(d =>
          d.data().patientId === selected.id && d.data().status === 'occupied'
        );
        if (alreadyAdmitted) {
          const b = alreadyAdmitted.data();
          throw new Error(`${selected.name} is already admitted to ${b.ward} Bed ${b.bedNo}. Please discharge first.`);
        }

        transaction.set(bedRef, {
          ward, bedNo,
          status: 'occupied',
          patientId: selected.id,
          patientName: selected.name,
          doctorId, doctorName,
          admitReason: reason,
          admittedAt: new Date().toISOString(),
          dischargedAt: null,
        });
      });

      toast.success(`✅ ${selected.name} admitted to ${ward} Bed ${bedNo}`);
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.message || 'Failed to admit patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3 className="modal-title">🛏️ Admit Patient — {ward} Bed {bedNo}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Search Patient *</label>
            <input className="form-input" placeholder="Name or Patient ID..."
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
            <label className="form-label">Assign Doctor *</label>
            <select className="form-select" defaultValue="" onChange={selectDoc}>
              <option value="" disabled>Choose doctor...</option>
              {doctors.map(d => (
                <option key={d.uid || d.id} value={d.uid || d.id}>
                  {d.name}{d.specialty ? ` — ${d.specialty}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Admission Reason</label>
            <textarea className="form-textarea" rows={2} placeholder="Chief complaint / diagnosis..."
              value={reason} onChange={e => setReason(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdmit} disabled={loading}>
            {loading ? <Activity size={15} className="spinning" /> : <UserCheck size={15} />}
            Admit Patient
          </button>
        </div>
      </div>
    </div>
  );
}

function DischargeModal({ bed, onClose, onSaved }) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDischarge = async () => {
    setLoading(true);
    try {
      const bedRef = doc(db, 'beds', `${bed.ward}_${bed.bedNo}`);
      await updateDoc(bedRef, {
        status: 'available',
        dischargedAt: new Date().toISOString(),
        dischargeNotes: notes,
        patientId: null, patientName: null,
        doctorId: null, doctorName: null,
        admitReason: null, admittedAt: null,
      });
      toast.success(`${bed.patientName} discharged from ${bed.ward} Bed ${bed.bedNo}`);
      onSaved();
      onClose();
    } catch { toast.error('Failed to discharge'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3 className="modal-title">🏥 Discharge Patient</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ background: '#f0fdf4', border: '1.5px solid #10b981', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{bed.patientName}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {bed.ward} · Bed {bed.bedNo} · Dr. {bed.doctorName}
            </div>
            {bed.admittedAt && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Admitted: {new Date(bed.admittedAt).toLocaleString('en-IN')}
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Discharge Notes</label>
            <textarea className="form-textarea" rows={3} placeholder="Discharge summary, instructions..."
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn" style={{ background: '#f43f5e', color: '#fff' }} onClick={handleDischarge} disabled={loading}>
            {loading ? <Activity size={15} className="spinning" /> : <LogOut size={15} />}
            Confirm Discharge
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BedManagement() {
  const { userData } = useAuth();
  const isDoctor = userData?.role === 'doctor';
  const [beds, setBeds] = useState({});
  const [admitModal, setAdmitModal] = useState(null);
  const [dischargeModal, setDischargeModal] = useState(null);
  const [activeWard, setActiveWard] = useState('All');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'beds'), (snap) => {
      const map = {};
      snap.forEach(d => { map[d.id] = d.data(); });
      setBeds(map);
    });
    return () => unsub();
  }, []);

  const getBed = (ward, no) => beds[`${ward}_${no}`] || { ward, bedNo: no, status: 'available' };

  // For doctors: only show beds where they are the assigned doctor
  const isVisible = (bed) => {
    if (!isDoctor) return true;
    return bed.status === 'occupied' && bed.doctorId === (userData?.uid || userData?.id);
  };

  const wardStats = Object.entries(WARD_CONFIG).map(([key, cfg]) => {
    const total = cfg.total;
    const occupied = Array.from({ length: total }, (_, i) => i + 1)
      .filter(n => getBed(key, n).status === 'occupied').length;
    return { key, ...cfg, total, occupied, available: total - occupied };
  });

  const totalOccupied = wardStats.reduce((s, w) => s + w.occupied, 0);
  const totalBeds = wardStats.reduce((s, w) => s + w.total, 0);

  const displayWards = activeWard === 'All'
    ? Object.keys(WARD_CONFIG)
    : [activeWard];

  // For doctor view: collect all their admitted beds across all wards
  const myBeds = isDoctor
    ? Object.values(beds).filter(b => b.status === 'occupied' && b.doctorId === (userData?.uid || userData?.id))
    : [];

  if (isDoctor) {
    // Doctor sees only their admitted patients' beds
    return (
      <div>
        <div className="section-header">
          <div>
            <h2 className="section-title">🛏️ My Admitted Patients</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
              {myBeds.length} patient{myBeds.length !== 1 ? 's' : ''} currently admitted under your care
            </p>
          </div>
        </div>

        {myBeds.length === 0 ? (
          <div className="card">
            <div className="empty-state" style={{ padding: 48 }}>
              <BedDouble size={44} />
              <h3>No admitted patients</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                You have no patients currently admitted to a bed.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
            {myBeds.map(b => {
              const cfg = WARD_CONFIG[b.ward] || { color: '#6366f1', bg: '#eef2ff', label: b.ward };
              return (
                <div key={`${b.ward}_${b.bedNo}`} className="card" style={{
                  border: `1.5px solid ${cfg.color}55`,
                  background: cfg.bg,
                  borderRadius: 14,
                }}>
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: cfg.color }}>{b.patientName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {cfg.label} · Bed {b.bedNo}
                        </div>
                      </div>
                      <span style={{
                        padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
                        background: cfg.color + '20', color: cfg.color, border: `1px solid ${cfg.color}44`
                      }}>🛏 Admitted</span>
                    </div>
                    {b.admitReason && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Reason: </span>{b.admitReason}
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Admitted: {b.admittedAt ? new Date(b.admittedAt).toLocaleString('en-IN') : '—'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">🛏️ Bed Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
            {totalOccupied} / {totalBeds} beds occupied
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['All', ...Object.keys(WARD_CONFIG)].map(w => (
            <button key={w}
              className={`btn btn-sm ${activeWard === w ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveWard(w)}>
              {w === 'All' ? 'All Wards' : WARD_CONFIG[w]?.label || w}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {wardStats.map(w => (
          <div key={w.key} className="stat-card" style={{ '--card-accent': w.accent }}>
            <div className="stat-icon" style={{ background: w.bg }}>
              <BedDouble size={22} color={w.color} />
            </div>
            <div className="stat-info">
              <div className="stat-label">{w.label}</div>
              <div className="stat-value" style={{ color: w.color }}>{w.available}<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}> / {w.total} free</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* Bed grid per ward */}
      {displayWards.map(wardKey => {
        const cfg = WARD_CONFIG[wardKey];
        return (
          <div key={wardKey} className="card" style={{ marginBottom: 20 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: cfg.color }} />
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{cfg.label}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  ({Array.from({ length: cfg.total }, (_, i) => i + 1).filter(n => getBed(wardKey, n).status === 'occupied').length} occupied / {cfg.total} total)
                </span>
              </div>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {Array.from({ length: cfg.total }, (_, i) => i + 1).map(no => {
                const bed = getBed(wardKey, no);
                const occupied = bed.status === 'occupied';
                return (
                  <div key={no}
                    onClick={() => occupied ? setDischargeModal(bed) : setAdmitModal({ ward: wardKey, bedNo: no })}
                    title={occupied ? `${bed.patientName} · Dr. ${bed.doctorName} · Click to discharge` : `Bed ${no} — Available · Click to admit`}
                    style={{
                      width: 72, height: 72, borderRadius: 12, cursor: 'pointer',
                      border: `2px solid ${occupied ? cfg.color : 'var(--border)'}`,
                      background: occupied ? cfg.bg : 'var(--bg-secondary)',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 3,
                      transition: 'all 0.18s', position: 'relative',
                      boxShadow: occupied ? `0 2px 8px ${cfg.color}33` : 'none',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <BedDouble size={20} color={occupied ? cfg.color : 'var(--text-muted)'} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: occupied ? cfg.color : 'var(--text-muted)' }}>
                      {no}
                    </span>
                    {occupied && (
                      <span style={{
                        position: 'absolute', top: 4, right: 5,
                        width: 8, height: 8, borderRadius: '50%',
                        background: cfg.color, boxShadow: `0 0 4px ${cfg.color}`
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Occupied patients list */}
            {Array.from({ length: cfg.total }, (_, i) => i + 1)
              .map(n => getBed(wardKey, n))
              .filter(b => b.status === 'occupied').length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '12px 20px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Admitted Patients</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Array.from({ length: cfg.total }, (_, i) => i + 1)
                    .map(n => getBed(wardKey, n))
                    .filter(b => b.status === 'occupied')
                    .map(b => (
                      <div key={b.bedNo} style={{
                        background: cfg.bg, border: `1px solid ${cfg.color}44`,
                        borderRadius: 8, padding: '6px 12px', fontSize: '0.8rem'
                      }}>
                        <span style={{ fontWeight: 700, color: cfg.color }}>Bed {b.bedNo}</span>
                        <span style={{ margin: '0 6px', color: 'var(--text-muted)' }}>·</span>
                        <span>{b.patientName}</span>
                        <span style={{ margin: '0 6px', color: 'var(--text-muted)' }}>·</span>
                        <span style={{ color: 'var(--text-secondary)' }}>Dr. {b.doctorName}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: 'var(--bg-secondary)', border: '2px solid var(--border)' }} />
          Available — click to admit
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: '#eef2ff', border: '2px solid #6366f1' }} />
          Occupied — click to discharge
        </div>
      </div>

      {admitModal && (
        <AdmitModal
          ward={admitModal.ward} bedNo={admitModal.bedNo}
          onClose={() => setAdmitModal(null)}
          onSaved={() => {}}
        />
      )}
      {dischargeModal && (
        <DischargeModal
          bed={dischargeModal}
          onClose={() => setDischargeModal(null)}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}
