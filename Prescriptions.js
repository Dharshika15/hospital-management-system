import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Plus, FileText, Search, Activity, X, Pill } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

function PrescriptionModal({ onClose, onSaved }) {
  const [patients, setPatients] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [instructions, setInstructions] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [rxItems, setRxItems] = useState([{ medicineId: '', medicineName: '', dosage: '', frequency: '', duration: '', quantity: '' }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/patients'), api.get('/medicines')])
      .then(([p, m]) => { setPatients(p.data); setMedicines(m.data); });
  }, []);

  const filteredPt = patients.filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase())).slice(0, 5);

  const addItem = () => setRxItems(i => [...i, { medicineId: '', medicineName: '', dosage: '', frequency: '', duration: '', quantity: '' }]);
  const removeItem = (idx) => setRxItems(i => i.filter((_, j) => j !== idx));
  const updateItem = (idx, key, val) => setRxItems(i => i.map((item, j) => j === idx ? { ...item, [key]: val } : item));
  const selectMed = (idx, medId) => {
    const med = medicines.find(m => m.id === medId);
    updateItem(idx, 'medicineId', medId);
    if (med) updateItem(idx, 'medicineName', med.name);
  };

  const getStockBadge = (medId) => {
    const med = medicines.find(m => m.id === medId);
    if (!med) return null;
    const stock = Number(med.stock) || 0;
    const minStock = Number(med.minStock) || 10;
    if (stock === 0) return { label: 'Out of Stock', color: '#f43f5e', bg: '#fff1f2' };
    if (stock <= minStock) return { label: `Low Stock (${stock})`, color: '#f59e0b', bg: '#fffbeb' };
    return { label: `In Stock (${stock})`, color: '#10b981', bg: '#f0fdf4' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return toast.error('Select a patient');
    setLoading(true);
    try {
      await api.post('/prescriptions', {
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        diagnosis, instructions, followUpDate,
        medicines: rxItems,
      });
      toast.success('Prescription created');
      onSaved(); onClose();
    } catch { toast.error('Failed'); } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">Write Prescription</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Patient *</label>
              <input className="form-input" placeholder="Search patient..." value={patientSearch}
                onChange={e => { setPatientSearch(e.target.value); setSelectedPatient(null); }} />
              {patientSearch && !selectedPatient && filteredPt.length > 0 && (
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4 }}>
                  {filteredPt.map(p => (
                    <div key={p.id} onClick={() => { setSelectedPatient(p); setPatientSearch(p.name); }}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                      {p.name} · {p.patientId} · {p.age}y
                    </div>
                  ))}
                </div>
              )}
              {selectedPatient && <span className="badge green" style={{ marginTop: 4 }}>✓ {selectedPatient.name}</span>}
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Diagnosis *</label>
              <textarea className="form-textarea" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} required placeholder="Patient's diagnosis and presenting complaints..." />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <label className="form-label" style={{ margin: 0 }}>Medications (Rx)</label>
                <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}><Plus size={13} /> Add Medicine</button>
              </div>

              {rxItems.map((item, idx) => (
                <div key={idx} style={{
                  background: 'var(--bg-secondary)', borderRadius: 10, padding: '14px',
                  marginBottom: 10, border: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' }}>
                    <select className="form-select" value={item.medicineId} onChange={e => selectMed(idx, e.target.value)} style={{ flex: 2 }} required>
                      <option value="">Select medicine...</option>
                      {medicines.map(m => {
                        const stock = Number(m.stock) || 0;
                        const minStock = Number(m.minStock) || 10;
                        const stockLabel = stock === 0 ? ' ⛔ Out of Stock' : stock <= minStock ? ` ⚠️ Low (${stock})` : ` ✅ (${stock})`;
                        return <option key={m.id} value={m.id}>{m.name}{stockLabel}</option>;
                      })}
                    </select>
                    <input className="form-input" placeholder="Dosage (e.g. 500mg)" value={item.dosage} onChange={e => updateItem(idx, 'dosage', e.target.value)} style={{ flex: 1 }} required />
                    {rxItems.length > 1 && (
                      <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeItem(idx)}><X size={14} color="var(--red)" /></button>
                    )}
                  </div>
                  {item.medicineId && (() => {
                    const badge = getStockBadge(item.medicineId);
                    return badge ? (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem',
                          fontWeight: 700, background: badge.bg, color: badge.color,
                          border: `1px solid ${badge.color}33`
                        }}>
                          {badge.color === '#f43f5e' ? '⛔' : badge.color === '#f59e0b' ? '⚠️' : '✅'} {badge.label}
                        </span>
                      </div>
                    ) : null;
                  })()}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select className="form-select" value={item.frequency} onChange={e => updateItem(idx, 'frequency', e.target.value)} style={{ flex: 1 }} required>
                      <option value="">Frequency...</option>
                      {['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 4 hours', 'As needed', 'At bedtime'].map(f => <option key={f}>{f}</option>)}
                    </select>
                    <input className="form-input" placeholder="Duration (e.g. 5 days)" value={item.duration} onChange={e => updateItem(idx, 'duration', e.target.value)} style={{ flex: 1 }} />
                    <input className="form-input" type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} style={{ flex: 0.6 }} min={1} />
                  </div>
                </div>
              ))}
            </div>

            <div className="form-grid cols-2">
              <div className="form-group">
                <label className="form-label">Instructions / Notes</label>
                <textarea className="form-textarea" value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Special instructions for patient..." style={{ minHeight: 60 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Follow-up Date</label>
                <input className="form-input" type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Activity size={15} className="spinning" /> : <FileText size={15} />} Create Prescription
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PrescriptionDetail({ rx, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">Prescription Details</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
            <div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Patient</div><div style={{ fontWeight: 700 }}>{rx.patientName}</div></div>
            <div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Doctor</div><div style={{ fontWeight: 700 }}>{rx.doctorName}</div></div>
            <div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Date</div><div>{new Date(rx.createdAt).toLocaleDateString('en-IN')}</div></div>
            <div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Status</div><span className={`badge ${rx.status === 'dispensed' ? 'green' : 'yellow'}`}>{rx.status}</span></div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Diagnosis</div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>{rx.diagnosis}</p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Medications</div>
            {(rx.medicines || []).map((m, i) => (
              <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                <Pill size={16} color="var(--purple)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 3 }}>{m.medicineName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.dosage} · {m.frequency} · {m.duration} · Qty: {m.quantity}</div>
                </div>
              </div>
            ))}
          </div>

          {rx.instructions && (
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Instructions</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{rx.instructions}</p>
            </div>
          )}
          {rx.followUpDate && (
            <div style={{ marginTop: 16 }}>
              <span className="badge yellow">Follow-up: {rx.followUpDate}</span>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function Prescriptions() {
  const { userData } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState('');

  const canCreate = ['doctor', 'admin'].includes(userData?.role);

  const load = async () => {
    try {
      const res = await api.get('/prescriptions');
      setPrescriptions(res.data);
    } catch { toast.error('Failed to load prescriptions'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = prescriptions.filter(p =>
    p.patientName?.toLowerCase().includes(search.toLowerCase()) ||
    p.doctorName?.toLowerCase().includes(search.toLowerCase()) ||
    p.diagnosis?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Prescriptions</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>{prescriptions.length} total</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-bar">
            <Search size={15} />
            <input placeholder="Search by patient, doctor..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {canCreate && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={15} /> New Prescription
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}><Activity size={20} className="spinning" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><FileText size={40} /><h3>No prescriptions found</h3></div>
          ) : (
            <table>
              <thead><tr><th>Patient</th><th>Doctor</th><th>Diagnosis</th><th>Medicines</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                {filtered.map(rx => (
                  <tr key={rx.id}>
                    <td style={{ fontWeight: 600 }}>{rx.patientName}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{rx.doctorName}</td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rx.diagnosis}</td>
                    <td><span className="badge purple">{(rx.medicines || []).length} med{(rx.medicines || []).length !== 1 ? 's' : ''}</span></td>
                    <td><span className={`badge ${rx.status === 'dispensed' ? 'green' : 'yellow'}`}>{rx.status}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(rx.createdAt).toLocaleDateString('en-IN')}</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => setDetail(rx)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && <PrescriptionModal onClose={() => setShowModal(false)} onSaved={load} />}
      {detail && <PrescriptionDetail rx={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

