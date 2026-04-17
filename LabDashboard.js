import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, query, orderBy, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FlaskConical, Plus, X, Activity, Search, Upload, CheckCircle, FileText, Download, Receipt } from 'lucide-react';

// ─── Test catalogue ───────────────────────────────────────────────────────────
const LAB_TESTS = [
  { label: 'Blood Test', icon: '🩸', category: 'Blood', price: 150 },
  { label: 'CBC (Complete Blood Count)', icon: '🩸', category: 'Blood', price: 300 },
  { label: 'Blood Sugar (Fasting)', icon: '🩸', category: 'Blood', price: 80 },
  { label: 'HbA1c', icon: '🩸', category: 'Blood', price: 350 },
  { label: 'Lipid Profile', icon: '🩸', category: 'Blood', price: 400 },
  { label: 'Liver Function Test (LFT)', icon: '🧬', category: 'Blood', price: 500 },
  { label: 'Kidney Function Test (KFT)', icon: '🧬', category: 'Blood', price: 450 },
  { label: 'Thyroid Profile (T3/T4/TSH)', icon: '🧬', category: 'Blood', price: 600 },
  { label: 'Urine Routine Analysis', icon: '🧪', category: 'Urine', price: 100 },
  { label: 'Urine Culture', icon: '🧪', category: 'Urine', price: 250 },
  { label: 'Stool Routine', icon: '🔬', category: 'Stool', price: 150 },
  { label: 'X-Ray', icon: '🫁', category: 'Scan', price: 250 },
  { label: 'ECG', icon: '💓', category: 'Scan', price: 200 },
  { label: 'Ultrasound', icon: '🔊', category: 'Scan', price: 800 },
  { label: 'CT Scan', icon: '🧠', category: 'Scan', price: 3500 },
  { label: 'MRI', icon: '🧲', category: 'Scan', price: 5000 },
  { label: 'Echo (Echocardiogram)', icon: '❤️', category: 'Scan', price: 1200 },
  { label: 'Mammography', icon: '🫁', category: 'Scan', price: 1500 },
  { label: 'COVID-19 RT-PCR', icon: '🦠', category: 'Microbiology', price: 500 },
  { label: 'Blood Culture', icon: '🦠', category: 'Microbiology', price: 700 },
  { label: 'Widal Test', icon: '🦠', category: 'Microbiology', price: 200 },
  { label: 'Dengue NS1 Antigen', icon: '🦠', category: 'Microbiology', price: 600 },
  { label: 'Malaria Antigen', icon: '🦠', category: 'Microbiology', price: 350 },
  { label: 'Vitamin D3', icon: '🧬', category: 'Hormone', price: 700 },
  { label: 'Vitamin B12', icon: '🧬', category: 'Hormone', price: 600 },
  { label: 'Testosterone', icon: '🧬', category: 'Hormone', price: 800 },
];

const TEST_CATEGORIES = ['All', ...new Set(LAB_TESTS.map(t => t.category))];

// ─── PDF Result Generator ─────────────────────────────────────────────────────
function generateResultPDF(test) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Lab Result - ${test.testName}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 32px; color: #1a1a2e; }
    .header { text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 24px; }
    .header h1 { color: #6366f1; font-size: 1.8rem; margin: 0 0 4px; }
    .header p { color: #64748b; margin: 0; font-size: 0.9rem; }
    .badge { display: inline-block; padding: 3px 12px; border-radius: 99px; font-size: 0.75rem; font-weight: 700; background: #dcfce7; color: #16a34a; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .info-box { background: #f8faff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; }
    .info-label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 4px; }
    .info-value { font-size: 0.95rem; font-weight: 600; }
    .result-box { background: #f8faff; border: 1.5px solid #6366f1; border-radius: 12px; padding: 20px 24px; margin: 20px 0; }
    .result-label { font-size: 0.78rem; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 12px; }
    .result-text { font-family: 'Courier New', monospace; font-size: 0.88rem; white-space: pre-wrap; line-height: 1.8; color: #1e293b; }
    .footer { margin-top: 40px; text-align: center; font-size: 0.75rem; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    .invoice-section { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 16px 20px; margin-top: 20px; }
    .invoice-row { display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 6px; }
    .invoice-total { display: flex; justify-content: space-between; font-weight: 800; font-size: 1.1rem; border-top: 1px solid #fed7aa; padding-top: 10px; margin-top: 6px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏥 Lab Test Result</h1>
    <p>Invoice No: ${test.invoiceNo || 'N/A'} &nbsp;|&nbsp; Date: ${test.date || new Date().toLocaleDateString('en-IN')}</p>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Patient Name</div>
      <div class="info-value">${test.patientName}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Test Name</div>
      <div class="info-value">${test.testName}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Category</div>
      <div class="info-value">${test.category || '—'}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Status</div>
      <div class="info-value"><span class="badge">✓ Completed</span></div>
    </div>
    <div class="info-box">
      <div class="info-label">Performed By</div>
      <div class="info-value">${test.createdBy || 'Lab Technician'}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Completed At</div>
      <div class="info-value">${test.completedAt ? new Date(test.completedAt).toLocaleString('en-IN') : '—'}</div>
    </div>
  </div>

  <div class="result-box">
    <div class="result-label">📋 Test Results</div>
    <div class="result-text">${test.resultText || 'No results entered.'}</div>
  </div>

  <div class="invoice-section">
    <strong style="display:block; margin-bottom:10px;">🧾 Lab Invoice</strong>
    <div class="invoice-row"><span>${test.testName}</span><span>₹${test.price || 0}</span></div>
    <div class="invoice-total"><span>Total Paid</span><span style="color:#f97316;">₹${test.price || 0}</span></div>
    <div style="font-size:0.75rem; color:#92400e; margin-top:8px;">Payment: ${test.paymentMethod || 'cash'} &nbsp;|&nbsp; Invoice: ${test.invoiceNo || 'N/A'}</div>
  </div>

  <div class="footer">
    This is a computer-generated lab report. &nbsp;|&nbsp; Generated on ${new Date().toLocaleString('en-IN')}
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Lab_Result_${test.patientName}_${test.testName}_${test.date}.html`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Result PDF downloaded!');
}

// ─── New Test Modal ───────────────────────────────────────────────────────────
function NewTestModal({ onClose }) {
  const { userData } = useAuth();
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [catFilter, setCatFilter] = useState('All');
  const [testSearch, setTestSearch] = useState('');
  const [selectedTests, setSelectedTests] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/patients').then(r => setPatients(r.data)).catch(() => {}); }, []);

  const filteredPatients = patients.filter(p =>
    p.name?.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.patientId?.toLowerCase().includes(patientSearch.toLowerCase())
  ).slice(0, 6);

  const filteredTests = LAB_TESTS.filter(t => {
    const matchCat = catFilter === 'All' || t.category === catFilter;
    const matchSearch = t.label.toLowerCase().includes(testSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  const toggleTest = (test) => {
    setSelectedTests(prev =>
      prev.find(t => t.label === test.label)
        ? prev.filter(t => t.label !== test.label)
        : [...prev, test]
    );
  };

  const total = selectedTests.reduce((s, t) => s + (t.price || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return toast.error('Select a patient');
    if (selectedTests.length === 0) return toast.error('Select at least one test');
    setLoading(true);
    try {
      const invoiceNo = 'LAB-' + Date.now().toString().slice(-8);
      for (const t of selectedTests) {
        await addDoc(collection(db, 'labTests'), {
          patientId: selectedPatient.id,
          patientName: selectedPatient.name,
          testName: t.label,
          category: t.category,
          price: t.price,
          status: 'pending',
          invoiceNo,
          paymentMethod,
          notes,
          createdBy: userData?.name || '',
          createdAt: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0],
          resultText: '',
        });
      }
      // Create lab invoice in finance
      await api.post('/finance/invoice', {
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        items: selectedTests.map(t => ({ description: t.label, amount: t.price })),
        totalAmount: total,
        discount: 0,
        paymentMethod,
        notes,
        invoiceType: 'lab',
        source: 'lab',
      }).catch(() => {});
      toast.success(`${selectedTests.length} test(s) registered & invoice created!`);
      onClose();
    } catch { toast.error('Failed to register tests'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">🧪 Register Lab Tests</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Patient */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Patient *</label>
              <input className="form-input" placeholder="Search by name or patient ID..."
                value={patientSearch}
                onChange={e => { setPatientSearch(e.target.value); setSelectedPatient(null); }} />
              {patientSearch && !selectedPatient && filteredPatients.length > 0 && (
                <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, marginTop: 4, boxShadow: 'var(--shadow)' }}>
                  {filteredPatients.map(p => (
                    <div key={p.id} onClick={() => { setSelectedPatient(p); setPatientSearch(p.name); }}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                      <strong>{p.name}</strong> <span style={{ color: 'var(--text-muted)' }}>· {p.patientId} · {p.age}y</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedPatient && <span className="badge green" style={{ marginTop: 6 }}>✓ {selectedPatient.name}</span>}
            </div>

            {/* Test category filter + search */}
            <div style={{ marginBottom: 12 }}>
              <label className="form-label">Select Tests *</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <select className="form-select" style={{ width: 'auto', minWidth: 140 }}
                  value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                  {TEST_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <div className="search-bar" style={{ flex: 1, minWidth: 140 }}>
                  <Search size={14} />
                  <input placeholder="Search test name..." value={testSearch}
                    onChange={e => setTestSearch(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
                {filteredTests.map(t => {
                  const sel = selectedTests.find(s => s.label === t.label);
                  return (
                    <div key={t.label} onClick={() => toggleTest(t)} style={{
                      padding: '10px 12px', borderRadius: 10, cursor: 'pointer', position: 'relative',
                      border: `1.5px solid ${sel ? '#6366f1' : 'var(--border)'}`,
                      background: sel ? 'var(--indigo-dim)' : 'var(--bg-hover)',
                      transition: 'all 0.15s',
                    }}>
                      <div style={{ fontSize: '1rem', marginBottom: 4 }}>{t.icon}</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: sel ? '#6366f1' : 'var(--text-primary)', lineHeight: 1.3, marginBottom: 2 }}>{t.label}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>₹{t.price}</div>
                      {sel && (
                        <div style={{ position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CheckCircle size={11} color="#fff" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment & Notes */}
            <div className="form-grid cols-2" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value="cash">💵 Cash</option>
                  <option value="card">💳 Card</option>
                  <option value="upi">📱 UPI</option>
                  <option value="insurance">🏥 Insurance</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input className="form-input" placeholder="Special instructions..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>

            {/* Selected tests summary */}
            {selectedTests.length > 0 && (
              <div style={{ background: 'linear-gradient(135deg,var(--indigo-dim),var(--violet-dim))', borderRadius: 12, padding: '14px 18px', border: '1px solid var(--border-active)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  {selectedTests.length} test(s) selected
                </div>
                {selectedTests.map(t => (
                  <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                    <span>{t.icon} {t.label}</span>
                    <span style={{ fontWeight: 700 }}>₹{t.price}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem' }}>
                  <span>Total</span>
                  <span style={{ color: '#6366f1' }}>₹{total}</span>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: 180, justifyContent: 'center' }}>
              {loading ? <Activity size={15} className="spinning" /> : <FlaskConical size={15} />}
              {loading ? 'Registering...' : `Register${selectedTests.length > 0 ? ` (${selectedTests.length})` : ''} & Invoice`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Upload Result Modal ──────────────────────────────────────────────────────
function UploadResultModal({ test, onClose }) {
  const [resultText, setResultText] = useState(test.resultText || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!resultText.trim()) return toast.error('Enter result');
    setLoading(true);
    try {
      await updateDoc(doc(db, 'labTests', test.id), {
        status: 'completed',
        resultText,
        completedAt: new Date().toISOString(),
      });
      toast.success('Result saved!');
      onClose();
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h3 className="modal-title">📋 Upload Result — {test.testName}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--indigo-dim)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700 }}>{test.patientName}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {test.testName} · {test.category} · {test.date} · Invoice: {test.invoiceNo}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Result / Report *</label>
            <textarea className="form-textarea" rows={8}
              placeholder={`Enter test results...\n\nExample:\nParameter: Value (Reference Range)\nHemoglobin: 13.5 g/dL (12-17 g/dL)\nWBC: 7.2 x10³/µL (4.5-11 x10³/µL)\n...`}
              value={resultText}
              onChange={e => setResultText(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '0.82rem' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? <Activity size={15} className="spinning" /> : <Upload size={15} />} Save & Complete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View Result Modal ────────────────────────────────────────────────────────
function ViewResultModal({ test, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h3 className="modal-title">📋 {test.testName} — Result</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>{test.patientName}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {test.date} · Invoice: {test.invoiceNo}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span className="badge green">✓ Completed</span>
              <span className="badge purple">₹{test.price}</span>
            </div>
          </div>

          <div style={{ background: '#f8faff', border: '1px solid var(--border)', borderRadius: 10, padding: 16, fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.8, minHeight: 100, marginBottom: 16 }}>
            {test.resultText || 'No result entered.'}
          </div>

          {test.completedAt && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right', marginBottom: 8 }}>
              Completed: {new Date(test.completedAt).toLocaleString('en-IN')}
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => generateResultPDF(test)}>
            <Download size={15} /> Download Result PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LabDashboard() {
  const { userData } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [uploadModal, setUploadModal] = useState(null);
  const [viewModal, setViewModal] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [statFilter, setStatFilter] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'labTests'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      setTests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const filtered = tests.filter(t => {
    const ms = t.patientName?.toLowerCase().includes(search.toLowerCase()) ||
      t.testName?.toLowerCase().includes(search.toLowerCase()) ||
      t.invoiceNo?.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === 'all' || t.status === statusFilter;
    const mc = catFilter === 'all' || t.category?.toLowerCase() === catFilter.toLowerCase();
    return ms && mst && mc;
  });

  const pending = tests.filter(t => t.status === 'pending').length;
  const completed = tests.filter(t => t.status === 'completed').length;
  const todayRevenue = tests
    .filter(t => t.date === new Date().toISOString().split('T')[0])
    .reduce((s, t) => s + (t.price || 0), 0);

  const canUpload = ['lab', 'admin'].includes(userData?.role);

  // Get unique categories from current tests
  const testCategories = ['all', ...new Set(tests.map(t => t.category).filter(Boolean))];

  const today = new Date().toISOString().split("T")[0];
  const testsToday = tests.filter(t => t.date === today);
  const reportsGenerated = tests.filter(t => t.status === "completed");
  const pendingTests = tests.filter(t => t.status === "pending");
  const uniquePatients = [...new Set(tests.map(t => t.patientId).filter(Boolean))];

  const statDrillRows = statFilter === "testsToday" ? testsToday
    : statFilter === "reports" ? reportsGenerated
    : statFilter === "pending" ? pendingTests
    : statFilter === "patients" ? tests.filter((t,i,arr)=>arr.findIndex(x=>x.patientId===t.patientId)===i)
    : null;
  const statDrillTitle = statFilter === "testsToday" ? "🧪 Tests Today"
    : statFilter === "reports" ? "📄 Reports Generated"
    : statFilter === "pending" ? "⏳ Pending Tests"
    : statFilter === "patients" ? "👥 Patient Records"
    : "";

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">🧪 Lab & Diagnostics</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
            {tests.length} total tests
            {pending > 0 && <span style={{ color: 'var(--amber)', marginLeft: 6 }}>· {pending} pending</span>}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          <Plus size={15} /> Register Test
        </button>
      </div>

      {/* Stat cards */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { key: 'testsToday', label: 'Tests Today',       value: testsToday.length,        color: 'var(--indigo)',  bg: 'var(--indigo-dim)',  accent: 'linear-gradient(90deg,#6366f1,#8b5cf6)' },
          { key: 'reports',    label: 'Reports Generated', value: reportsGenerated.length,  color: 'var(--emerald)', bg: 'var(--emerald-dim)', accent: 'linear-gradient(90deg,#10b981,#059669)' },
          { key: 'pending',    label: 'Pending Tests',     value: pendingTests.length,      color: 'var(--amber)',   bg: 'var(--amber-dim)',   accent: 'linear-gradient(90deg,#f59e0b,#f97316)' },
          { key: 'patients',   label: 'Total Patients',    value: uniquePatients.length,    color: 'var(--violet)',  bg: 'var(--violet-dim)',  accent: 'linear-gradient(90deg,#8b5cf6,#ec4899)' },
        ].map(({ key, label, value, color, bg, accent }) => (
          <div key={key} className="stat-card" style={{ '--card-accent': accent, cursor: 'pointer', outline: statFilter === key ? `2px solid ${color}` : 'none' }}
            onClick={() => setStatFilter(statFilter === key ? null : key)}>
            <div className="stat-icon" style={{ background: bg }}><FlaskConical size={22} color={color} /></div>
            <div className="stat-info">
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ color, fontSize: typeof value === 'string' ? '1.3rem' : '1.8rem' }}>{value}</div>
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
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setStatFilter(null)}>✕</button>
          </div>
          <div className="table-wrap">
            {statDrillRows.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}><FlaskConical size={30} /><p>No records found</p></div>
            ) : (
              <table>
                <thead><tr><th>Invoice</th><th>Patient</th><th>Test</th><th>Type</th><th>Price</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {statDrillRows.map(t => (
                    <tr key={t.id}>
                      <td><span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#6366f1', background: 'var(--indigo-dim)', padding: '2px 7px', borderRadius: 5 }}>{t.invoiceNo || '—'}</span></td>
                      <td style={{ fontWeight: 700 }}>{t.patientName}</td>
                      <td>{t.testName}</td>
                      <td><span className={`badge ${t.category === 'Scan' ? 'purple' : 'blue'}`}>{t.category || '—'}</span></td>
                      <td style={{ color: 'var(--emerald)', fontWeight: 700 }}>₹{t.price || 0}</td>
                      <td><span className={`badge ${t.status === 'completed' ? 'green' : 'yellow'}`}>{t.status === 'completed' ? '✓ Done' : '⏳ Pending'}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t.date || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={15} />
          <input placeholder="Search patient, test, invoice..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 140 }}>
          <option value="all">All Status</option>
          <option value="pending">⏳ Pending</option>
          <option value="completed">✓ Completed</option>
        </select>
        <select className="form-select" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: 160 }}>
          <option value="all">All Types</option>
          {testCategories.filter(c => c !== 'all').map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><Activity size={20} className="spinning" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><FlaskConical size={40} /><h3>No tests found</h3></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Invoice</th><th>Patient</th><th>Test</th><th>Type</th>
                  <th>Price</th><th>Payment</th><th>Status</th><th>Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#6366f1', background: 'var(--indigo-dim)', padding: '2px 7px', borderRadius: 5 }}>
                        {t.invoiceNo}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{t.patientName}</td>
                    <td style={{ fontWeight: 500 }}>{t.testName}</td>
                    <td>
                      <span className={`badge ${t.category === 'Scan' ? 'purple' : 'blue'}`}>
                        {t.category || '—'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--emerald)', fontWeight: 700 }}>₹{t.price}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{t.paymentMethod || '—'}</td>
                    <td>
                      <span className={`badge ${t.status === 'completed' ? 'green' : 'yellow'}`}>
                        {t.status === 'completed' ? '✓ Done' : '⏳ Pending'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t.date}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {t.status === 'pending' && canUpload && (
                          <button className="btn btn-sm btn-success" onClick={() => setUploadModal(t)}
                            style={{ background: '#10b981', borderColor: '#10b981', color: '#fff' }}>
                            <Upload size={12} /> Upload
                          </button>
                        )}
                        {t.status === 'completed' && (
                          <>
                            <button className="btn btn-sm btn-ghost" onClick={() => setViewModal(t)}>
                              <FileText size={12} /> View
                            </button>
                            <button className="btn btn-sm btn-ghost" onClick={() => generateResultPDF(t)}
                              title="Download PDF Report">
                              <Download size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showNew && <NewTestModal onClose={() => setShowNew(false)} />}
      {uploadModal && <UploadResultModal test={uploadModal} onClose={() => setUploadModal(null)} />}
      {viewModal && <ViewResultModal test={viewModal} onClose={() => setViewModal(null)} />}
    </div>
  );
}
