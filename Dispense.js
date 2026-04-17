import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Pill, Search, Activity, CheckCircle } from 'lucide-react';

export default function Dispense() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dispensing, setDispensing] = useState(null);

  const load = async () => {
    try {
      const res = await api.get('/prescriptions?status=pending');
      setPrescriptions(res.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDispense = async (rx) => {
    setDispensing(rx.id);
    try {
      // Calculate total
      const medicines = await api.get('/medicines');
      const medMap = {};
      medicines.data.forEach(m => { medMap[m.id] = m; });

      const items = (rx.medicines || []).map(m => ({
        medicineId: m.medicineId,
        medicineName: m.medicineName,
        quantity: parseInt(m.quantity) || 1,
        price: medMap[m.medicineId]?.price || 0,
      }));
      const totalAmount = items.reduce((s, i) => s + (i.price * i.quantity), 0);

      await api.post('/medicines/dispense', {
        prescriptionId: rx.id,
        patientId: rx.patientId,
        patientName: rx.patientName,
        items, totalAmount,
      });

      toast.success(`Dispensed to ${rx.patientName}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Dispensing failed');
    } finally { setDispensing(null); }
  };

  const filtered = prescriptions.filter(p =>
    p.patientName?.toLowerCase().includes(search.toLowerCase()) ||
    p.doctorName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Dispense Medicines</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>Pending prescriptions to dispense</p>
        </div>
        <div className="search-bar">
          <Search size={15} />
          <input placeholder="Search prescriptions..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}><Activity size={20} className="spinning" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><Pill size={40} /><h3>No pending prescriptions</h3><p>All prescriptions have been dispensed</p></div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filtered.map(rx => (
            <div key={rx.id} className="card">
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{rx.patientName}</span>
                      <span className="badge yellow">Pending</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 6 }}>
                      Dr. {rx.doctorName} · {new Date(rx.createdAt).toLocaleDateString('en-IN')}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                      <strong>Diagnosis:</strong> {rx.diagnosis}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {(rx.medicines || []).map((m, i) => (
                        <div key={i} style={{
                          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                          borderRadius: 8, padding: '8px 12px', fontSize: '0.82rem'
                        }}>
                          <div style={{ fontWeight: 600 }}>{m.medicineName}</div>
                          <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                            {m.dosage} · {m.frequency} · Qty: {m.quantity}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleDispense(rx)}
                    disabled={dispensing === rx.id}
                    style={{ flexShrink: 0 }}
                  >
                    {dispensing === rx.id ? <Activity size={15} className="spinning" /> : <CheckCircle size={15} />}
                    Dispense
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
