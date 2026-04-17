import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  Plus, Search, Pill, AlertTriangle, Activity, X,
  Package, TrendingUp, TrendingDown, Receipt, CheckCircle,
  ChevronRight, FileText, ArrowRight, Printer, Calendar, Users,
  Edit2, Trash2, BarChart2, Download
} from 'lucide-react';
import { printInvoice } from '../../utils/printInvoice';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const REAL_MEDICINES = [
  { name: 'Amoxicillin 500mg', category: 'Antibiotic', brands: ['Mox', 'Novamox', 'Wymox'], unit: 'capsule', price: 8.5 },
  { name: 'Azithromycin 250mg', category: 'Antibiotic', brands: ['Azithral', 'Zithromax', 'Azifast'], unit: 'tablet', price: 22.0 },
  { name: 'Ciprofloxacin 500mg', category: 'Antibiotic', brands: ['Ciplox', 'Cifran', 'Ciprobid'], unit: 'tablet', price: 15.0 },
  { name: 'Paracetamol 500mg', category: 'Analgesic', brands: ['Crocin', 'Dolo 650', 'Calpol'], unit: 'tablet', price: 2.0 },
  { name: 'Ibuprofen 400mg', category: 'Analgesic', brands: ['Brufen', 'Combiflam', 'Ibugesic'], unit: 'tablet', price: 5.0 },
  { name: 'Diclofenac 50mg', category: 'Analgesic', brands: ['Voveran', 'Voltaren', 'Dicloflex'], unit: 'tablet', price: 6.0 },
  { name: 'Metformin 500mg', category: 'Diabetes', brands: ['Glycomet', 'Glucophage', 'Obimet'], unit: 'tablet', price: 4.5 },
  { name: 'Glimepiride 2mg', category: 'Diabetes', brands: ['Amaryl', 'Glisen', 'Glimy'], unit: 'tablet', price: 12.0 },
  { name: 'Atorvastatin 10mg', category: 'Cardiovascular', brands: ['Lipitor', 'Atorva', 'Tonact'], unit: 'tablet', price: 14.0 },
  { name: 'Amlodipine 5mg', category: 'Cardiovascular', brands: ['Amlokind', 'Stamlo', 'Norvasc'], unit: 'tablet', price: 8.0 },
  { name: 'Losartan 50mg', category: 'Cardiovascular', brands: ['Cozaar', 'Losar', 'Repace'], unit: 'tablet', price: 18.0 },
  { name: 'Omeprazole 20mg', category: 'Gastro', brands: ['Omez', 'Prilosec', 'Ocid'], unit: 'capsule', price: 7.0 },
  { name: 'Pantoprazole 40mg', category: 'Gastro', brands: ['Pan 40', 'Pantocid', 'Pantop'], unit: 'tablet', price: 9.0 },
  { name: 'Cetirizine 10mg', category: 'Antihistamine', brands: ['Cetrizet', 'Zyrtec', 'Cetzine'], unit: 'tablet', price: 3.5 },
  { name: 'Montelukast 10mg', category: 'Respiratory', brands: ['Montair', 'Singulair', 'Montek'], unit: 'tablet', price: 22.0 },
  { name: 'Salbutamol Inhaler', category: 'Respiratory', brands: ['Asthalin', 'Ventolin', 'Derihaler'], unit: 'inhaler', price: 85.0 },
  { name: 'Vitamin D3 1000IU', category: 'Vitamin', brands: ['D-Rise', 'Calcirol', 'Uprise D3'], unit: 'tablet', price: 15.0 },
  { name: 'Vitamin B12 500mcg', category: 'Vitamin', brands: ['Methylcobal', 'Cobamin', 'Nurokind'], unit: 'tablet', price: 18.0 },
  { name: 'Calcium + D3', category: 'Supplement', brands: ['Shelcal', 'Calcimax', 'Ostocalcium'], unit: 'tablet', price: 12.0 },
  { name: 'Metronidazole 400mg', category: 'Antibiotic', brands: ['Flagyl', 'Metrogyl', 'Aristogyl'], unit: 'tablet', price: 6.0 },
  { name: 'Doxycycline 100mg', category: 'Antibiotic', brands: ['Doxt', 'Vibramycin', 'Doxy 1'], unit: 'capsule', price: 20.0 },
  { name: 'Insulin Regular 100IU', category: 'Diabetes', brands: ['Actrapid', 'Huminsulin R', 'Wosulin R'], unit: 'vial', price: 185.0 },
  { name: 'Aspirin 75mg', category: 'Cardiovascular', brands: ['Disprin', 'Ecosprin', 'Asprocol'], unit: 'tablet', price: 3.0 },
  { name: 'Clopidogrel 75mg', category: 'Cardiovascular', brands: ['Plavix', 'Clopilet', 'Deplatt'], unit: 'tablet', price: 28.0 },
  { name: 'Levothyroxine 50mcg', category: 'Thyroid', brands: ['Eltroxin', 'Thyronorm', 'Thyrox'], unit: 'tablet', price: 35.0 },
];

const CATEGORIES = [...new Set(REAL_MEDICINES.map(m => m.category)), 'Vaccine', 'Other'];

function getExpiryStatus(expiryDate) {
  if (!expiryDate) return { status: 'unknown', label: 'No expiry set', className: '' };
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysLeft = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { status: 'expired', label: 'EXPIRED', className: 'expiry-critical' };
  if (daysLeft <= 30) return { status: 'critical', label: `${daysLeft}d left`, className: 'expiry-critical' };
  if (daysLeft <= 90) return { status: 'warning', label: `${daysLeft}d left`, className: 'expiry-warning' };
  return { status: 'ok', label: expiryDate, className: 'expiry-ok' };
}

// ─── Step Indicator ──────────────────────────────────────────────────────────
function StepIndicator({ step }) {
  const steps = ['Prescription', 'Dispense', 'Invoice'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 24 }}>
      {steps.map((label, i) => {
        const idx = i + 1;
        const active = step === idx;
        const done = step > idx;
        return (
          <React.Fragment key={label}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.9rem',
                background: done ? '#10b981' : active ? '#6366f1' : 'var(--bg-secondary)',
                color: done || active ? '#fff' : 'var(--text-muted)',
                border: `2px solid ${done ? '#10b981' : active ? '#6366f1' : 'var(--border)'}`,
                transition: 'all 0.25s',
              }}>
                {done ? <CheckCircle size={16} /> : idx}
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: active ? '#6366f1' : done ? '#10b981' : 'var(--text-muted)' }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                height: 2, width: 60, marginBottom: 22,
                background: step > i + 1 ? '#10b981' : 'var(--border)',
                transition: 'background 0.25s',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Pharmacy Dispense Flow (3-step modal) ───────────────────────────────────
function DispenseFlowModal({ onClose, onSaved }) {
  const [step, setStep] = useState(1);
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [prescSearch, setPrescSearch] = useState('');
  const [showDispensed, setShowDispensed] = useState(false);
  const [selectedRx, setSelectedRx] = useState(null);
  const [dispenseItems, setDispenseItems] = useState([]);
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/prescriptions'),
      api.get('/medicines'),
    ]).then(([rxRes, medRes]) => {
      setPrescriptions(rxRes.data); // show all including dispensed
      setMedicines(medRes.data);
    }).catch(() => {
      toast.error('Failed to load data');
    }).finally(() => setLoadingData(false));
  }, []);

  const filteredRx = prescriptions.filter(r => {
    const matchSearch = r.patientName?.toLowerCase().includes(prescSearch.toLowerCase()) ||
      r.doctorName?.toLowerCase().includes(prescSearch.toLowerCase()) ||
      r.diagnosis?.toLowerCase().includes(prescSearch.toLowerCase());
    const matchDispensed = showDispensed ? true : r.status !== 'dispensed';
    return matchSearch && matchDispensed;
  });

  const selectPrescription = (rx) => {
    setSelectedRx(rx);
    const items = (rx.medicines || []).map(m => {
      const med = medicines.find(x => x.id === m.medicineId);
      return {
        medicineId: m.medicineId || '',
        medicineName: m.medicineName || '',
        unitPrice: med ? med.price : 0,
        qty: parseInt(m.quantity) || 1,
        dosage: m.dosage || '',
        frequency: m.frequency || '',
        duration: m.duration || '',
      };
    });
    setDispenseItems(items);
  };

  const updateItem = (idx, key, val) => {
    setDispenseItems(prev => prev.map((item, j) => j === idx ? { ...item, [key]: val } : item));
  };

  const selectMedForItem = (idx, medId) => {
    const med = medicines.find(m => m.id === medId);
    if (med) {
      setDispenseItems(prev => prev.map((item, j) => j === idx ? {
        ...item, medicineId: medId, medicineName: med.name, unitPrice: med.price,
      } : item));
    }
  };

  const subtotal = dispenseItems.reduce((s, i) => s + ((i.unitPrice || 0) * (i.qty || 1)), 0);
  const finalAmount = Math.max(0, subtotal - (parseFloat(discount) || 0));

  const handleDispense = async () => {
    if (dispenseItems.length === 0) return toast.error('No medicines to dispense');
    setLoading(true);
    try {
      if (selectedRx) {
        await api.patch(`/prescriptions/${selectedRx.id}`, { status: 'dispensed' }).catch(() => {});
      }
      for (const item of dispenseItems) {
        if (item.medicineId) {
          await api.patch(`/medicines/${item.medicineId}/stock`, {
            quantity: item.qty, operation: 'subtract',
          }).catch(() => {});
        }
      }
      toast.success('Medicines dispensed successfully!');
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to dispense');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    setLoading(true);
    try {
      const invoiceNumber = 'PHR-' + Date.now();
      const invoiceItems = dispenseItems.map(i => ({
        description: `${i.medicineName}${i.dosage ? ' ' + i.dosage : ''} × ${i.qty}`,
        amount: (i.unitPrice || 0) * (i.qty || 1),
      }));

      const invoiceData = {
        invoiceNumber,
        patientId: selectedRx?.patientId || '',
        patientName: selectedRx?.patientName || '',
        prescriptionId: selectedRx?.id || '',
        doctorName: selectedRx?.doctorName || '',
        items: invoiceItems,
        totalAmount: subtotal,
        discount: parseFloat(discount) || 0,
        finalAmount,
        paymentMethod,
        source: 'pharmacy',
        status: 'paid',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'invoices'), invoiceData);
      const saved = { ...invoiceData, id: docRef.id, createdAt: new Date().toISOString() };
      setCreatedInvoice(saved);
      toast.success('Invoice created!');
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">💊 Pharmacy Dispense Flow</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <StepIndicator step={step} />

          {/* STEP 1: Select Prescription */}
          {step === 1 && (
            <div>
              <div style={{ marginBottom: 14, padding: '10px 16px', background: 'var(--indigo-dim)', borderRadius: 10, fontSize: '0.82rem', color: 'var(--indigo)', fontWeight: 600 }}>
                📋 Select a doctor's prescription to begin dispensing medicines
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <input className="form-input" placeholder="Search by patient, doctor, diagnosis..."
                    value={prescSearch} onChange={e => { setPrescSearch(e.target.value); setSelectedRx(null); }} />
                </div>
                <button
                  type="button"
                  className={`btn btn-sm ${showDispensed ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setShowDispensed(v => !v)}
                  style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  {showDispensed ? '✓ Showing All' : 'Show Dispensed'}
                </button>
              </div>

              {loadingData ? (
                <div style={{ textAlign: 'center', padding: 32 }}><Activity size={20} className="spinning" /></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                  {filteredRx.length === 0 ? (
                    <div className="empty-state" style={{ padding: 32 }}>
                      <FileText size={36} />
                      <h3>No prescriptions found</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{showDispensed ? 'No prescriptions exist yet.' : 'All dispensed. Toggle "Show Dispensed" to view history.'}</p>
                    </div>
                  ) : (
                    filteredRx.map(rx => (
                      <div key={rx.id}
                        onClick={() => rx.status !== 'dispensed' ? selectPrescription(rx) : null}
                        style={{
                          padding: '14px 16px', borderRadius: 12,
                          cursor: rx.status === 'dispensed' ? 'default' : 'pointer',
                          border: `2px solid ${selectedRx?.id === rx.id ? '#6366f1' : rx.status === 'dispensed' ? 'var(--border)' : 'var(--border)'}`,
                          background: selectedRx?.id === rx.id ? 'var(--indigo-dim)' : rx.status === 'dispensed' ? 'var(--bg-secondary)' : 'var(--bg-hover)',
                          opacity: rx.status === 'dispensed' ? 0.7 : 1,
                          transition: 'all 0.15s',
                        }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rx.patientName}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              Dr. {rx.doctorName} · {rx.createdAt ? new Date(rx.createdAt).toLocaleDateString('en-IN') : ''}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                              {rx.diagnosis}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            <span className="badge purple">{(rx.medicines || []).length} med{(rx.medicines || []).length !== 1 ? 's' : ''}</span>
                            <span className={`badge ${rx.status === 'dispensed' ? 'green' : 'yellow'}`}>{rx.status || 'pending'}</span>
                          </div>
                        </div>
                        {selectedRx?.id === rx.id && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                            {(rx.medicines || []).map((m, i) => (
                              <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: 8, marginBottom: 3, alignItems: 'flex-start' }}>
                                <Pill size={12} color="var(--purple)" style={{ flexShrink: 0, marginTop: 1 }} />
                                <span>{m.medicineName} — {m.dosage} · {m.frequency} · Qty: {m.quantity}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Review & Dispense */}
          {step === 2 && selectedRx && (
            <div>
              <div style={{ marginBottom: 14, padding: '10px 16px', background: 'var(--emerald-dim)', borderRadius: 10, fontSize: '0.82rem', color: 'var(--emerald)', fontWeight: 600 }}>
                ✅ Review medicines for <strong>{selectedRx.patientName}</strong> — adjust quantities if needed, then dispense
              </div>
              <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Prescription by </span>
                <strong>Dr. {selectedRx.doctorName}</strong>
                <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>· </span>
                <span>{selectedRx.diagnosis}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {dispenseItems.map((item, idx) => {
                  const med = medicines.find(m => m.id === item.medicineId);
                  const isLow = med && med.stock <= med.minStock;
                  const isOut = med && med.stock === 0;
                  return (
                    <div key={idx} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 14, border: `1px solid ${isOut ? 'var(--rose)' : 'var(--border)'}` }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                        <Pill size={14} color="var(--purple)" style={{ flexShrink: 0 }} />
                        <select className="form-select" style={{ flex: 3 }}
                          value={item.medicineId}
                          onChange={e => selectMedForItem(idx, e.target.value)}>
                          <option value="">Select medicine...</option>
                          {medicines.map(m => {
                            const stockLabel = m.stock === 0 ? ' ⛔ Out' : m.stock <= m.minStock ? ` ⚠️ Low(${m.stock})` : ` ✅(${m.stock})`;
                            return <option key={m.id} value={m.id}>{m.name}{stockLabel}</option>;
                          })}
                        </select>
                        {isOut && <span className="badge red">Out of Stock</span>}
                        {isLow && !isOut && <span className="badge yellow">Low</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Qty</label>
                          <input className="form-input" type="number" min={1}
                            value={item.qty}
                            onChange={e => updateItem(idx, 'qty', parseInt(e.target.value) || 1)} />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Unit Price (₹)</label>
                          <input className="form-input" value={item.unitPrice} readOnly style={{ background: '#f8faff' }} />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Total (₹)</label>
                          <input className="form-input"
                            value={((item.unitPrice || 0) * (item.qty || 1)).toFixed(2)} readOnly
                            style={{ background: '#f8faff', fontWeight: 700, color: 'var(--emerald)' }} />
                        </div>
                      </div>
                      {item.dosage && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                          💊 {item.dosage} · {item.frequency} · {item.duration}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ background: 'linear-gradient(135deg,var(--emerald-dim),var(--indigo-dim))', borderRadius: 12, padding: '14px 18px', border: '1px solid var(--border-active)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  <span>Items: {dispenseItems.length}</span><span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.2rem' }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--emerald)' }}>₹{subtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Invoice */}
          {step === 3 && (
            <div>
              <div style={{ marginBottom: 14, padding: '10px 16px', background: 'var(--emerald-dim)', borderRadius: 10, fontSize: '0.82rem', color: 'var(--emerald)', fontWeight: 600 }}>
                🧾 Medicines dispensed! Now create the invoice for <strong>{selectedRx?.patientName}</strong>
              </div>

              <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 10, fontSize: '0.9rem' }}>Invoice Items</div>
                {dispenseItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6, alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Pill size={12} color="var(--purple)" />
                      {item.medicineName} × {item.qty}
                      {item.dosage && <span style={{ color: 'var(--text-muted)' }}>({item.dosage})</span>}
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--emerald)' }}>₹{((item.unitPrice || 0) * (item.qty || 1)).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="form-grid cols-2" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Discount (₹)</label>
                  <input className="form-input" type="number" value={discount}
                    onChange={e => setDiscount(e.target.value)} min={0} />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                    <option value="cash">💵 Cash</option>
                    <option value="card">💳 Card</option>
                    <option value="upi">📱 UPI</option>
                    <option value="insurance">🏥 Insurance</option>
                  </select>
                </div>
              </div>

              <div style={{ background: 'linear-gradient(135deg,var(--indigo-dim),var(--violet-dim))', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border-active)', marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
                </div>
                {parseFloat(discount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.875rem', color: 'var(--rose)' }}>
                    <span>Discount</span><span>- ₹{(parseFloat(discount) || 0).toFixed(2)}</span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.3rem' }}>
                  <span>Total</span>
                  <span style={{ color: '#6366f1' }}>₹{finalAmount.toFixed(2)}</span>
                </div>
              </div>

              {createdInvoice && (
                <div style={{ padding: '12px 16px', background: 'var(--emerald-dim)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle size={18} color="var(--emerald)" />
                  <span style={{ color: 'var(--emerald)', fontWeight: 700, fontSize: '0.875rem' }}>
                    Invoice {createdInvoice.invoiceNumber} created!
                  </span>
                  <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}
                    onClick={() => printInvoice(createdInvoice)}>
                    <Printer size={13} /> Print PDF
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-secondary" onClick={step === 1 ? onClose : () => setStep(s => s - 1)}>
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step === 1 && (
              <button className="btn btn-primary" disabled={!selectedRx}
                onClick={() => setStep(2)}>
                Next: Review Medicines <ChevronRight size={15} />
              </button>
            )}
            {step === 2 && (
              <button className="btn btn-success" disabled={loading || dispenseItems.length === 0}
                onClick={handleDispense}
                style={{ background: '#10b981', borderColor: '#10b981', color: '#fff' }}>
                {loading ? <Activity size={15} className="spinning" /> : <CheckCircle size={15} />}
                {loading ? 'Dispensing...' : 'Confirm Dispense →'}
              </button>
            )}
            {step === 3 && (
              !createdInvoice ? (
                <button className="btn btn-primary" disabled={loading} onClick={handleCreateInvoice}>
                  {loading ? <Activity size={15} className="spinning" /> : <Receipt size={15} />}
                  {loading ? 'Creating...' : 'Create Invoice'}
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={onClose}>
                  <CheckCircle size={15} /> Done
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Add Medicine Modal ───────────────────────────────────────────────────────
function AddMedicineModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', brand: '', category: 'Antibiotic',
    manufacturer: '', unit: 'tablet', price: '',
    stock: '', minStock: '10', expiryDate: '', description: ''
  });
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const applyTemplate = (med) => {
    setForm(f => ({ ...f, name: med.name, category: med.category, unit: med.unit, price: String(med.price) }));
    setSelectedTemplate(med.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const fullName = form.brand ? `${form.name} (${form.brand})` : form.name;
      await api.post('/medicines', { ...form, name: fullName });
      toast.success('Medicine added!');
      onSaved(); onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setLoading(false); }
  };

  const filteredTemplate = REAL_MEDICINES.filter(m =>
    m.name.toLowerCase().includes(form.name.toLowerCase()) && form.name.length > 1
  ).slice(0, 5);

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">💊 Add Medicine</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid cols-2">
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Medicine Name *</label>
                <input className="form-input" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required placeholder="Type to search real medicines..." />
                {filteredTemplate.length > 0 && form.name.length > 1 && (
                  <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, marginTop: 4, boxShadow: 'var(--shadow)' }}>
                    {filteredTemplate.map(med => (
                      <div key={med.name} onClick={() => applyTemplate(med)}
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <strong>{med.name}</strong>
                          <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: '0.78rem' }}>Brands: {med.brands.join(', ')}</span>
                        </div>
                        <span className="badge indigo">{med.category}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Brand Name</label>
                <input className="form-input" value={form.brand}
                  onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                  placeholder="e.g. Crocin, Dolo 650..." />
                {selectedTemplate && (
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Common: </span>
                    {(REAL_MEDICINES.find(m => m.name === selectedTemplate)?.brands || []).map(b => (
                      <span key={b} onClick={() => setForm(f => ({ ...f, brand: b }))}
                        style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 99, background: 'var(--indigo-dim)', color: 'var(--indigo)', border: '1px solid var(--border-active)', cursor: 'pointer', marginRight: 4, fontWeight: 600 }}>
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Manufacturer</label>
                <input className="form-input" value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} placeholder="Cipla, Sun Pharma..." />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select className="form-select" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                  {['tablet', 'capsule', 'syrup (ml)', 'injection (ml)', 'inhaler', 'cream (g)', 'drops', 'vial', 'pcs'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Price per unit (₹) *</label>
                <input className="form-input" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required min={0} step="0.01" />
              </div>
              <div className="form-group">
                <label className="form-label">Initial Stock *</label>
                <input className="form-input" type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} required min={0} />
              </div>
              <div className="form-group">
                <label className="form-label">Min Stock Alert</label>
                <input className="form-input" type="number" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))} min={0} />
              </div>
              <div className="form-group">
                <label className="form-label">Expiry Date *</label>
                <input className="form-input" type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Description / Notes</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Usage notes, storage conditions..." />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Activity size={15} className="spinning" /> : <Plus size={15} />} Add Medicine
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StockModal({ medicine, onClose, onSaved }) {
  const [qty, setQty] = useState('');
  const [op, setOp] = useState('add');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.patch(`/medicines/${medicine.id}/stock`, { quantity: parseInt(qty), operation: op });
      toast.success('Stock updated!');
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3 className="modal-title">Update Stock — {medicine.name}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ padding: '12px 16px', background: 'var(--bg-hover)', borderRadius: 10, textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>CURRENT STOCK</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: medicine.stock <= medicine.minStock ? 'var(--rose)' : 'var(--emerald)' }}>{medicine.stock}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Min: {medicine.minStock}</div>
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Operation</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['add', 'Add Stock', TrendingUp], ['subtract', 'Remove', TrendingDown]].map(([val, lbl, Icon]) => (
                  <button key={val} type="button" onClick={() => setOp(val)} style={{
                    flex: 1, padding: '10px', borderRadius: 8, border: '1px solid',
                    borderColor: op === val ? (val === 'add' ? 'var(--emerald)' : 'var(--rose)') : 'var(--border)',
                    background: op === val ? (val === 'add' ? 'var(--green-dim)' : 'var(--red-dim)') : 'var(--bg-hover)',
                    color: op === val ? (val === 'add' ? 'var(--emerald)' : 'var(--rose)') : 'var(--text-secondary)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600,
                  }}>
                    <Icon size={14} /> {lbl}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input className="form-input" type="number" value={qty} onChange={e => setQty(e.target.value)} required min={1} placeholder="Enter quantity" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Activity size={15} className="spinning" /> : <Package size={15} />} Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── NEW: Expiry Calendar Modal ───────────────────────────────────────────────
function ExpiryCalendarModal({ medicines, onClose }) {
  const months = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(); d.setMonth(d.getMonth() + i);
    months.push({ label: d.toLocaleString('en-IN', { month: 'long', year: 'numeric' }), month: d.getMonth(), year: d.getFullYear() });
  }
  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">📅 Expiry Calendar — Next 6 Months</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
            {months.map(({ label, month, year }, idx) => {
              const meds = medicines.filter(m => {
                if (!m.expiryDate) return false;
                const d = new Date(m.expiryDate);
                return d.getMonth() === month && d.getFullYear() === year;
              });
              const color = idx === 0 ? '#f43f5e' : idx === 1 ? '#f59e0b' : '#10b981';
              const bg    = idx === 0 ? '#fff1f2' : idx === 1 ? '#fffbeb' : '#ecfdf5';
              return (
                <div key={label} style={{ borderRadius: 12, border: `1.5px solid ${color}30`, background: bg, padding: '14px 16px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color, marginBottom: 8 }}>{label}</div>
                  {meds.length === 0
                    ? <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>✅ No expiries</div>
                    : meds.map(m => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 6, padding: '5px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <span style={{ fontWeight: 600 }}>{m.name}</span>
                        <span style={{ color, fontWeight: 700 }}>{m.expiryDate}</span>
                      </div>
                    ))
                  }
                  {meds.length > 0 && <div style={{ marginTop: 6, fontSize: '0.7rem', color, fontWeight: 700 }}>{meds.length} medicine{meds.length > 1 ? 's' : ''} expiring</div>}
                </div>
              );
            })}
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

// ─── NEW: Purchase Order PDF Generator ───────────────────────────────────────
function generatePurchaseOrder(medicines) {
  const low = medicines.filter(m => m.stock <= m.minStock);
  if (low.length === 0) { toast.error('No medicines need restocking!'); return; }
  const w = window.open('', '_blank', 'width=900,height=700');
  const rows = low.map(m => `
    <tr>
      <td>${m.name}</td><td>${m.category}</td><td>${m.manufacturer || '—'}</td>
      <td style="color:#f43f5e;font-weight:700">${m.stock}</td>
      <td style="color:#10b981;font-weight:700">${m.minStock * 3}</td>
      <td>₹${(m.price * (m.minStock * 3)).toFixed(2)}</td>
    </tr>`).join('');
  const total = low.reduce((s, m) => s + (m.price * (m.minStock * 3)), 0);
  w.document.write(`<!DOCTYPE html><html><head><title>Purchase Order</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:sans-serif;padding:40px;color:#0f172a}
    h1{font-size:1.8rem;font-weight:900;color:#6366f1;margin-bottom:4px}.sub{color:#94a3b8;font-size:0.85rem;margin-bottom:30px}
    table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#6366f1;color:#fff;padding:12px 14px;text-align:left;font-size:0.8rem}
    td{padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:0.85rem}.total{text-align:right;margin-top:20px;font-size:1.1rem;font-weight:800;color:#6366f1}
    .badge{display:inline-block;padding:3px 10px;border-radius:99px;font-size:0.72rem;font-weight:700;background:#fff1f2;color:#f43f5e;margin-bottom:20px}
    @media print{body{padding:20px}}</style></head><body>
    <h1>🏥 Hospital Management System — Purchase Order</h1>
    <div class="sub">Generated: ${new Date().toLocaleString('en-IN')} &nbsp;|&nbsp; PO-${Date.now().toString().slice(-8)}</div>
    <div class="badge">⚠️ ${low.length} medicines need restocking</div>
    <table><thead><tr><th>Medicine</th><th>Category</th><th>Manufacturer</th><th>Current Stock</th><th>Order Qty</th><th>Est. Cost</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="total">Total Estimated Cost: ₹${total.toFixed(2)}</div>
    <script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
  toast.success('Purchase order generated!');
}

// ─── NEW: Patient Medicine History Modal ─────────────────────────────────────
function PatientHistoryModal({ onClose }) {
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/patients').then(r => setPatients(r.data)).catch(() => {}); }, []);

  const load = async (p) => {
    setSelected(p); setLoading(true); setSearch(p.name);
    try {
      const res = await api.get(`/prescriptions?patientId=${p.id}`);
      setHistory(res.data || []);
    } catch { setHistory([]); } finally { setLoading(false); }
  };

  const filtered = patients.filter(p => p.name?.toLowerCase().includes(search.toLowerCase())).slice(0, 5);

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">👤 Patient Medicine History</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Search Patient</label>
            <input className="form-input" placeholder="Type patient name..." value={search}
              onChange={e => { setSearch(e.target.value); setSelected(null); setHistory([]); }} />
            {search && !selected && filtered.length > 0 && (
              <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, marginTop: 4, boxShadow: 'var(--shadow)' }}>
                {filtered.map(p => (
                  <div key={p.id} onClick={() => load(p)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                    <strong>{p.name}</strong> <span style={{ color: 'var(--text-muted)' }}>· {p.patientId}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {loading && <div style={{ textAlign: 'center', padding: 20 }}><Activity size={20} className="spinning" /></div>}
          {selected && !loading && (
            history.length === 0
              ? <div className="empty-state" style={{ padding: '20px' }}><Pill size={32} /><h3>No prescription history found</h3></div>
              : history.map(rx => (
                <div key={rx.id} style={{ background: 'var(--bg-hover)', borderRadius: 12, padding: '14px 16px', marginBottom: 10, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div><span style={{ fontWeight: 700 }}>Dr. {rx.doctorName}</span> <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>· {rx.diagnosis}</span></div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rx.createdAt?.split('T')[0]}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(rx.medicines || []).map((m, i) => (
                      <span key={i} style={{ background: 'var(--indigo-dim)', color: 'var(--indigo)', padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 }}>
                        💊 {m.medicineName} · {m.dosage} · Qty:{m.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── EXTRA FEATURE 1: Edit Medicine Modal ────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function EditMedicineModal({ medicine, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: medicine.name || '',
    category: medicine.category || 'Antibiotic',
    manufacturer: medicine.manufacturer || '',
    unit: medicine.unit || 'tablet',
    price: String(medicine.price || ''),
    minStock: String(medicine.minStock || '10'),
    expiryDate: medicine.expiryDate || '',
    description: medicine.description || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/medicines/${medicine.id}`, {
        ...form,
        price: parseFloat(form.price),
        minStock: parseInt(form.minStock),
      });
      toast.success('Medicine updated successfully!');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update medicine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">✏️ Edit Medicine</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ marginBottom: 14, padding: '10px 16px', background: 'var(--indigo-dim)', borderRadius: 10, fontSize: '0.82rem', color: 'var(--indigo)', fontWeight: 600 }}>
              ✏️ Editing: <strong>{medicine.name}</strong> — to change stock quantity, use the Stock button on the table instead
            </div>
            <div className="form-grid cols-2">
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Medicine Name *</label>
                <input className="form-input" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Manufacturer</label>
                <input className="form-input" value={form.manufacturer}
                  onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))}
                  placeholder="Cipla, Sun Pharma..." />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select className="form-select" value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                  {['tablet', 'capsule', 'syrup (ml)', 'injection (ml)', 'inhaler', 'cream (g)', 'drops', 'vial', 'pcs'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Price per unit (₹) *</label>
                <input className="form-input" type="number" value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  required min={0} step="0.01" />
              </div>
              <div className="form-group">
                <label className="form-label">Min Stock Alert</label>
                <input className="form-input" type="number" value={form.minStock}
                  onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))} min={0} />
              </div>
              <div className="form-group">
                <label className="form-label">Expiry Date *</label>
                <input className="form-input" type="date" value={form.expiryDate}
                  onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Description / Notes</label>
                <textarea className="form-textarea" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Usage notes, storage conditions..." />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Activity size={15} className="spinning" /> : <Edit2 size={15} />} Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── EXTRA FEATURE 2: Delete Confirm Modal ───────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function DeleteConfirmModal({ medicine, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/medicines/${medicine.id}`);
      toast.success(`${medicine.name} deleted!`);
      onDeleted();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete medicine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: 'var(--rose)' }}>🗑️ Delete Medicine</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: 'var(--red-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <Trash2 size={28} color="var(--rose)" />
            </div>
            <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 8 }}>Are you sure?</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 6 }}>
              You are about to permanently delete:
            </div>
            <div style={{ fontWeight: 700, color: 'var(--rose)', fontSize: '0.95rem', marginBottom: 4 }}>
              {medicine.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14 }}>
              Stock: {medicine.stock} · Category: {medicine.category}
            </div>
            <div style={{ padding: '10px 14px', background: 'var(--red-dim)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--rose)', fontWeight: 600 }}>
              ⚠️ This action cannot be undone.
            </div>
          </div>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{ background: 'var(--rose)', borderColor: 'var(--rose)', color: '#fff' }}
            disabled={loading}
            onClick={handleDelete}>
            {loading ? <Activity size={15} className="spinning" /> : <Trash2 size={15} />}
            {loading ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── EXTRA FEATURE 3: Analytics Modal ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function AnalyticsModal({ medicines, onClose }) {
  const categories = [...new Set(medicines.map(m => m.category))].filter(Boolean);

  const catData = categories.map(cat => {
    const meds = medicines.filter(m => m.category === cat);
    const totalStock = meds.reduce((s, m) => s + (m.stock || 0), 0);
    const totalValue = meds.reduce((s, m) => s + ((m.stock || 0) * (m.price || 0)), 0);
    const lowCount = meds.filter(m => m.stock > 0 && m.stock <= m.minStock).length;
    const outCount = meds.filter(m => m.stock === 0).length;
    return { cat, count: meds.length, totalStock, totalValue, lowCount, outCount };
  }).sort((a, b) => b.totalValue - a.totalValue);

  const maxValue = Math.max(...catData.map(d => d.totalValue), 1);
  const totalInventoryValue = medicines.reduce((s, m) => s + ((m.stock || 0) * (m.price || 0)), 0);
  const totalItems = medicines.length;
  const outOfStockCount = medicines.filter(m => m.stock === 0).length;
  const avgPrice = totalItems > 0 ? medicines.reduce((s, m) => s + (m.price || 0), 0) / totalItems : 0;

  const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6'];

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">📊 Pharmacy Analytics</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">

          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total Inventory Value', value: `₹${totalInventoryValue.toFixed(0)}`, color: '#6366f1', bg: 'var(--indigo-dim)' },
              { label: 'Total Medicines',        value: totalItems,                           color: '#10b981', bg: 'var(--emerald-dim)' },
              { label: 'Out of Stock',           value: outOfStockCount,                      color: '#f43f5e', bg: 'var(--rose-dim)' },
              { label: 'Avg. Unit Price',        value: `₹${avgPrice.toFixed(2)}`,            color: '#f59e0b', bg: 'var(--amber-dim)' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{ background: bg, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color }}>{value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Category Bar Chart */}
          <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 12, color: 'var(--text-primary)' }}>
            📦 Inventory Value by Category
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {catData.map(({ cat, count, totalStock, totalValue, lowCount, outCount }, i) => (
              <div key={cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{cat}</span>
                    <span className="badge purple" style={{ fontSize: '0.68rem' }}>{count} meds</span>
                    {lowCount > 0 && <span className="badge yellow" style={{ fontSize: '0.68rem' }}>⚠️ {lowCount} low</span>}
                    {outCount > 0 && <span className="badge red" style={{ fontSize: '0.68rem' }}>🚫 {outCount} out</span>}
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '0.82rem', color: PALETTE[i % PALETTE.length] }}>₹{totalValue.toFixed(0)}</span>
                </div>
                <div style={{ height: 10, borderRadius: 99, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 99,
                    width: `${(totalValue / maxValue) * 100}%`,
                    background: PALETTE[i % PALETTE.length],
                    transition: 'width 0.6s ease',
                    minWidth: totalValue > 0 ? 6 : 0,
                  }} />
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>
                  Total stock units: {totalStock}
                </div>
              </div>
            ))}
          </div>

          {/* Stock Health */}
          <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 12 }}>🩺 Stock Health Overview</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              { label: '✅ Healthy Stock', count: medicines.filter(m => m.stock > m.minStock).length,                  color: '#10b981', bg: '#ecfdf5' },
              { label: '⚠️ Low Stock',    count: medicines.filter(m => m.stock > 0 && m.stock <= m.minStock).length,   color: '#f59e0b', bg: '#fffbeb' },
              { label: '🚫 Out of Stock', count: medicines.filter(m => m.stock === 0).length,                           color: '#f43f5e', bg: '#fff1f2' },
            ].map(({ label, count, color, bg }) => (
              <div key={label} style={{ background: bg, borderRadius: 10, padding: '12px 14px', textAlign: 'center', border: `1.5px solid ${color}30` }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color }}>{count}</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color, marginTop: 2 }}>{label}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {totalItems > 0 ? ((count / totalItems) * 100).toFixed(0) : 0}% of total
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── EXTRA FEATURE 4: Export CSV ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function exportMedicinesToCSV(medicines) {
  if (medicines.length === 0) { toast.error('No medicines to export!'); return; }
  const headers = ['Name', 'Category', 'Manufacturer', 'Unit', 'Price (Rs)', 'Stock', 'Min Stock', 'Expiry Date', 'Stock Status', 'Stock Value (Rs)'];
  const rows = medicines.map(m => {
    const stockStatus = m.stock === 0 ? 'Out of Stock' : m.stock <= m.minStock ? 'Low Stock' : 'In Stock';
    return [
      `"${(m.name || '').replace(/"/g, '""')}"`,
      `"${m.category || ''}"`,
      `"${m.manufacturer || ''}"`,
      `"${m.unit || ''}"`,
      (m.price || 0).toFixed(2),
      m.stock || 0,
      m.minStock || 0,
      `"${m.expiryDate || ''}"`,
      `"${stockStatus}"`,
      ((m.stock || 0) * (m.price || 0)).toFixed(2),
    ].join(',');
  });
  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pharmacy_inventory_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success(`Exported ${medicines.length} medicines to CSV!`);
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function PharmacyDashboard() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [stockModal, setStockModal] = useState(null);
  const [showDispenseFlow, setShowDispenseFlow] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  // original 3 feature states
  const [showCalendar, setShowCalendar] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // EXTRA FEATURE states
  const [editModal, setEditModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const load = async () => {
    try { const res = await api.get('/medicines'); setMedicines(res.data); }
    catch { toast.error('Failed to load medicines'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = medicines.filter(m => {
    const matchSearch = m.name?.toLowerCase().includes(search.toLowerCase()) || m.manufacturer?.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || m.category === catFilter;
    return matchSearch && matchCat;
  });

  const lowCount = medicines.filter(m => m.stock > 0 && m.stock <= m.minStock).length;
  const outCount = medicines.filter(m => m.stock === 0).length;
  const [statFilter, setStatFilter] = useState(null);

  const statDrillMeds = statFilter === 'total' ? filtered
    : statFilter === 'low' ? medicines.filter(m => m.stock > 0 && m.stock <= m.minStock)
    : statFilter === 'expiring' ? medicines.filter(m => { if (!m.expiryDate) return false; const days = Math.floor((new Date(m.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)); return days <= 90; })
    : statFilter === 'instock' ? medicines.filter(m => m.stock > 0)
    : null;
  const expiringCount = medicines.filter(m => { if (!m.expiryDate) return false; const days = Math.floor((new Date(m.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)); return days <= 90; }).length;

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">💊 Pharmacy</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
            {medicines.length} medicines
            {lowCount > 0 && <span style={{ color: 'var(--amber)', marginLeft: 8 }}>{lowCount} low stock</span>}
            {expiringCount > 0 && <span style={{ color: 'var(--rose)', marginLeft: 8 }}>{expiringCount} expiring soon</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* Original buttons — untouched */}
          <button className="btn btn-ghost btn-sm" onClick={() => setShowCalendar(true)}>
            <Calendar size={14} /> Expiry Calendar
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowHistory(true)}>
            <Users size={14} /> Patient History
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => generatePurchaseOrder(medicines)}>
            <FileText size={14} /> Purchase Order
          </button>
          {/* EXTRA FEATURE buttons */}
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAnalytics(true)}>
            <BarChart2 size={14} /> Analytics
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => exportMedicinesToCSV(medicines)}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowDispenseFlow(true)}>
            <ArrowRight size={15} /> Dispense Flow
          </button>
          <button className="btn btn-secondary" onClick={() => setShowAddModal(true)}>
            <Plus size={15} /> Add Medicine
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { key:'total',    label: 'Total Medicines', value: medicines.length,                      color: 'var(--violet)',  bg: 'var(--violet-dim)',  accent: 'linear-gradient(90deg,#8b5cf6,#a78bfa)' },
          { key:'low',      label: 'Low Stock',        value: lowCount,                              color: 'var(--amber)',   bg: 'var(--amber-dim)',   accent: 'linear-gradient(90deg,#f59e0b,#f97316)' },
          { key:'expiring', label: 'Expiring Soon',    value: expiringCount,                         color: 'var(--rose)',    bg: 'var(--rose-dim)',    accent: 'linear-gradient(90deg,#f43f5e,#fb7185)' },
          { key:'instock',  label: 'In Stock',         value: medicines.filter(m => m.stock > 0).length, color: 'var(--emerald)', bg: 'var(--emerald-dim)', accent: 'linear-gradient(90deg,#10b981,#059669)' },
        ].map(({ key, label, value, color, bg, accent }) => (
          <div key={key} className="stat-card" style={{ '--card-accent': accent, cursor: 'pointer', outline: statFilter === key ? `2px solid ${color}` : 'none' }}
            onClick={() => setStatFilter(statFilter === key ? null : key)}>
            <div className="stat-icon" style={{ background: bg }}><Pill size={22} color={color} /></div>
            <div className="stat-info">
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ color }}>{value}</div>
              {statFilter === key && <div style={{ fontSize: '0.65rem', color, fontWeight: 700, marginTop: 2 }}>▼ tap to collapse</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Stat drill-down table */}
      {statDrillMeds && (
        <div className="card" style={{ marginBottom: 16, border: '2px solid var(--border-active)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">
              {statFilter === 'total' ? '💊 All Medicines' : statFilter === 'low' ? '⚠️ Low Stock' : statFilter === 'expiring' ? '⏳ Expiring Soon' : '✅ In Stock'}
            </span>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setStatFilter(null)}>✕</button>
          </div>
          <div className="table-wrap">
            {statDrillMeds.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}><Pill size={30} /><p>No medicines in this category</p></div>
            ) : (
              <table>
                <thead><tr><th>Medicine</th><th>Category</th><th>Stock</th><th>Min Stock</th><th>Expiry</th><th>Status</th></tr></thead>
                <tbody>
                  {statDrillMeds.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 700 }}>{m.name}</td>
                      <td><span className="badge purple">{m.category}</span></td>
                      <td><span style={{ fontWeight: 800, color: m.stock === 0 ? '#f43f5e' : m.stock <= m.minStock ? '#f59e0b' : '#10b981', fontSize: '1rem' }}>{m.stock}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{m.minStock}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{m.expiryDate || '—'}</td>
                      <td><span className={`badge ${m.stock === 0 ? 'red' : m.stock <= m.minStock ? 'yellow' : 'green'}`}>{m.stock === 0 ? '🚫 Out' : m.stock <= m.minStock ? '⚠️ Low' : '✅ OK'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {!statDrillMeds && lowCount > 0 && (
        <div className="alert warning" style={{ marginBottom: 12 }}>
          <AlertTriangle size={16} /><span><strong>{lowCount} medicines</strong> are below minimum stock levels.</span>
        </div>
      )}
      {!statDrillMeds && expiringCount > 0 && (
        <div className="alert error" style={{ marginBottom: 16 }}>
          <AlertTriangle size={16} /><span><strong>{expiringCount} medicines</strong> are expiring within 90 days!</span>
        </div>
      )}

      {/* Dispense Flow Banner */}
      <div style={{
        background: 'linear-gradient(135deg,var(--indigo-dim),var(--violet-dim))',
        border: '1.5px solid var(--border-active)', borderRadius: 14, padding: '16px 20px',
        marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#6366f1', marginBottom: 4 }}>
            📋 Prescription → 💊 Dispense → 🧾 Invoice
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            3-step flow: pick a prescription, confirm medicines & qty, auto-generate invoice.
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowDispenseFlow(true)}>
          Start Dispense <ArrowRight size={14} />
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-bar">
          <Search size={15} />
          <input placeholder="Search medicines..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: 160 }}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}><Activity size={20} className="spinning" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><Pill size={40} /><h3>No medicines found</h3></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Medicine Name</th><th>Category</th><th>Manufacturer</th>
                  <th>Price</th><th>Stock</th><th>Expiry</th><th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const isLow = m.stock <= m.minStock;
                  const isOut = m.stock === 0;
                  const expiry = getExpiryStatus(m.expiryDate);
                  return (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 700 }}>{m.name}</td>
                      <td><span className="badge purple">{m.category}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{m.manufacturer || '—'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--emerald)' }}>₹{m.price?.toFixed(2)}</td>
                      <td>
                        <span style={{ fontWeight: 800, color: isOut ? 'var(--rose)' : isLow ? 'var(--amber)' : 'var(--emerald)', fontSize: '1rem' }}>{m.stock}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginLeft: 4 }}>/ min {m.minStock}</span>
                      </td>
                      <td>
                        <span className={expiry.className} style={{ fontSize: '0.82rem', fontWeight: expiry.status !== 'ok' ? 700 : 400 }}>
                          {expiry.status === 'expired' && '🚨 '}
                          {expiry.status === 'critical' && '⚠️ '}
                          {expiry.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {expiry.status === 'expired' && <span className="badge red">Expired</span>}
                          {expiry.status === 'critical' && <span className="badge yellow">Expiring</span>}
                          <span className={`badge ${isOut ? 'red' : isLow ? 'yellow' : 'green'}`}>
                            {isOut ? 'Out' : isLow ? 'Low' : 'OK'}
                          </span>
                        </div>
                      </td>
                      {/* EXTRA FEATURES: Edit + Delete added alongside original Stock button */}
                      <td>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setStockModal(m)} title="Update Stock">
                            <Package size={13} /> Stock
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setEditModal(m)}
                            title="Edit Medicine"
                            style={{ color: '#6366f1' }}>
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDeleteModal(m)}
                            title="Delete Medicine"
                            style={{ color: 'var(--rose)' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Original modals — untouched */}
      {showAddModal && <AddMedicineModal onClose={() => setShowAddModal(false)} onSaved={load} />}
      {stockModal && <StockModal medicine={stockModal} onClose={() => setStockModal(null)} onSaved={load} />}
      {showDispenseFlow && <DispenseFlowModal onClose={() => setShowDispenseFlow(false)} onSaved={load} />}
      {showCalendar && <ExpiryCalendarModal medicines={medicines} onClose={() => setShowCalendar(false)} />}
      {showHistory && <PatientHistoryModal onClose={() => setShowHistory(false)} />}
      {/* EXTRA FEATURE modals */}
      {editModal && <EditMedicineModal medicine={editModal} onClose={() => setEditModal(null)} onSaved={load} />}
      {deleteModal && <DeleteConfirmModal medicine={deleteModal} onClose={() => setDeleteModal(null)} onDeleted={load} />}
      {showAnalytics && <AnalyticsModal medicines={medicines} onClose={() => setShowAnalytics(false)} />}
    </div>
  );
}
