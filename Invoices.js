import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Receipt, Search, Activity, DollarSign, Plus, X, Printer, TrendingUp } from 'lucide-react';
import { printInvoice } from '../../utils/printInvoice';
import { db } from '../../firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, where } from 'firebase/firestore';

function InvoiceModal({ onClose, onSaved }) {
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [items, setItems] = useState([{ description: '', amount: '' }]);
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false); // prevent double-submit

  useEffect(() => { api.get('/patients').then(r => setPatients(r.data)).catch(() => {}); }, []);

  const filtered = patients.filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase())).slice(0, 5);
  const total = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const final = Math.max(0, total - (parseFloat(discount) || 0));

  const addItem = () => setItems(i => [...i, { description: '', amount: '' }]);
  const removeItem = (idx) => setItems(i => i.filter((_, j) => j !== idx));
  const updateItem = (idx, key, val) => setItems(i => i.map((item, j) => j === idx ? { ...item, [key]: val } : item));

  const quickAdd = (desc, amt) => setItems(i => [...i.filter(x => x.description || x.amount), { description: desc, amount: String(amt) }]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return toast.error('Select a patient');
    if (submittingRef.current) return; // prevent double-submit
    submittingRef.current = true;
    setLoading(true);
    try {
      const discountVal = parseFloat(discount) || 0;
      const finalAmount = Math.max(0, total - discountVal);
      // Idempotency key: patient + amount + minute — prevents duplicate on refresh
      const idempotencyKey = `REC-${selectedPatient.id}-${finalAmount}-${Math.floor(Date.now() / 60000)}`;

      // Check if invoice with same idempotency key already exists in last 2 minutes
      const recentSnap = await getDocs(query(
        collection(db, 'invoices'),
        where('idempotencyKey', '==', idempotencyKey)
      ));
      if (!recentSnap.empty) {
        toast.error('Invoice already created — please wait before retrying');
        return;
      }

      const invoiceNumber = 'REC-' + Date.now();
      const invoiceData = {
        invoiceNumber,
        idempotencyKey,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        items: items.map(i => ({ ...i, amount: parseFloat(i.amount) })),
        totalAmount: total,
        discount: discountVal,
        finalAmount,
        paymentMethod,
        notes,
        source: 'receptionist',
        status: 'paid',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'invoices'), invoiceData);
      toast.success('Invoice created!');
      onSaved();
      if (window.confirm('Invoice created! Print / Save as PDF?')) {
        printInvoice({ ...invoiceData, id: docRef.id, createdAt: new Date().toISOString() });
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">🧾 Create Invoice</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Patient *</label>
              <input className="form-input" placeholder="Search patient by name or ID..." value={patientSearch}
                onChange={e => { setPatientSearch(e.target.value); setSelectedPatient(null); }} />
              {patientSearch && !selectedPatient && filtered.length > 0 && (
                <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 10, marginTop: 4, boxShadow: 'var(--shadow)' }}>
                  {filtered.map(p => (
                    <div key={p.id} onClick={() => { setSelectedPatient(p); setPatientSearch(p.name); }}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                      <strong>{p.name}</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>· {p.patientId}</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedPatient && <span className="badge green" style={{ marginTop: 6 }}>✓ {selectedPatient.name}</span>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <label className="form-label" style={{ margin: 0 }}>Line Items *</label>
                <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}><Plus size={13} /> Add Item</button>
              </div>

              {/* Quick Add Buttons */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Quick add:</span>
                {[['Consultation', 500], ['Lab Test', 300], ['X-Ray', 400], ['Medicine', 200], ['Nursing', 150], ['ECG', 350]].map(([d, a]) => (
                  <button key={d} type="button" onClick={() => quickAdd(d, a)}
                    style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: 99, background: 'var(--indigo-dim)', border: '1px solid var(--border-active)', color: 'var(--indigo)', cursor: 'pointer', fontWeight: 600 }}>
                    + {d} ₹{a}
                  </button>
                ))}
              </div>

              {items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input className="form-input" placeholder="Description" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} style={{ flex: 3 }} required />
                  <input className="form-input" type="number" placeholder="₹" value={item.amount} onChange={e => updateItem(idx, 'amount', e.target.value)} style={{ flex: 1 }} min={0} required />
                  {items.length > 1 && <button type="button" className="btn btn-danger btn-icon" onClick={() => removeItem(idx)}><X size={14} /></button>}
                </div>
              ))}
            </div>

            <div className="form-grid cols-2" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Discount (₹)</label>
                <input className="form-input" type="number" value={discount} onChange={e => setDiscount(e.target.value)} min={0} />
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

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Notes (optional)</label>
              <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes..." />
            </div>

            {/* Summary */}
            <div style={{ background: 'linear-gradient(135deg,var(--indigo-dim),var(--violet-dim))', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border-active)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Invoice Summary</div>
              {items.filter(i => i.description && i.amount).map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <span>{item.description}</span><span>₹{(parseFloat(item.amount) || 0).toLocaleString()}</span>
                </div>
              ))}
              <div className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                <span>Subtotal</span><span>₹{total.toFixed(2)}</span>
              </div>
              {parseFloat(discount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--rose)', marginBottom: 6 }}>
                  <span>Discount</span><span>- ₹{(parseFloat(discount) || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.3rem', fontFamily: 'var(--font-display)' }}>
                <span style={{ color: 'var(--text-primary)' }}>Total</span>
                <span style={{ color: 'var(--indigo)' }}>₹{final.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: 160, justifyContent: 'center' }}>
              {loading ? <Activity size={15} className="spinning" /> : <Receipt size={15} />}
              {loading ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [statFilter, setStatFilter] = useState(null);

  const load = async () => {
    try {
      const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => {
        const doc = d.data();
        return {
          id: d.id,
          ...doc,
          // Convert Firestore Timestamp to ISO string for display
          createdAt: doc.createdAt?.toDate ? doc.createdAt.toDate().toISOString() : doc.createdAt,
        };
      });
      setInvoices(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = invoices.filter(inv =>
    inv.patientName?.toLowerCase().includes(search.toLowerCase()) ||
    inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = invoices.reduce((s, inv) => s + (inv.finalAmount || 0), 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRevenue = invoices.filter(inv => inv.createdAt && inv.createdAt.split('T')[0] === todayStr).reduce((s, inv) => s + (inv.finalAmount || 0), 0);

  const payBadge = m => ({ cash: 'green', card: 'blue', upi: 'purple', insurance: 'yellow' }[m] || 'gray');
  const payEmoji = m => ({ cash: '💵', card: '💳', upi: '📱', insurance: '🏥' }[m] || '💰');

  const statDrillRows = statFilter === 'total' ? invoices
    : statFilter === 'today' ? invoices.filter(inv => inv.createdAt && inv.createdAt.split('T')[0] === todayStr)
    : statFilter === 'revenue' ? invoices
    : statFilter === 'paid' ? invoices.filter(i => i.status === 'paid')
    : null;
  const statDrillTitle = statFilter === 'total' ? '🧾 All Invoices'
    : statFilter === 'today' ? "💰 Today's Invoices"
    : statFilter === 'revenue' ? '📊 Revenue Invoices'
    : statFilter === 'paid' ? '✅ Paid Invoices'
    : '';

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Invoices</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>{invoices.length} total invoices</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-bar"><Search size={15} /><input placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Receipt size={15} /> Create Invoice
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          { key: 'total',   label: 'Total Invoices',   value: invoices.length,                           color: 'var(--indigo)',  bg: 'var(--indigo-dim)',  accent: 'linear-gradient(90deg,#6366f1,#8b5cf6)' },
          { key: 'today',   label: "Today's Revenue",  value: `₹${todayRevenue.toLocaleString()}`,        color: 'var(--emerald)', bg: 'var(--emerald-dim)', accent: 'linear-gradient(90deg,#10b981,#059669)' },
          { key: 'revenue', label: 'Total Revenue',    value: `₹${totalRevenue.toLocaleString()}`,        color: 'var(--violet)',  bg: 'var(--violet-dim)',  accent: 'linear-gradient(90deg,#8b5cf6,#ec4899)' },
          { key: 'paid',    label: 'Paid',             value: invoices.filter(i => i.status === 'paid').length, color: 'var(--sky)', bg: 'var(--sky-dim)',  accent: 'linear-gradient(90deg,#0ea5e9,#38bdf8)' },
        ].map(({ key, label, value, color, bg, accent }) => (
          <div key={key} className="stat-card" style={{ '--card-accent': accent, cursor: 'pointer', outline: statFilter === key ? `2px solid ${color}` : 'none' }}
            onClick={() => setStatFilter(statFilter === key ? null : key)}>
            <div className="stat-icon" style={{ background: bg }}><TrendingUp size={22} color={color} /></div>
            <div className="stat-info">
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ color, fontSize: typeof value === 'string' && value.length > 6 ? '1.3rem' : '1.8rem' }}>{value}</div>
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
              <div className="empty-state" style={{ padding: 24 }}><Receipt size={30} /><p>No invoices in this category</p></div>
            ) : (
              <table>
                <thead><tr><th>Invoice #</th><th>Patient</th><th>Total</th><th>Discount</th><th>Final</th><th>Payment</th><th>Date</th></tr></thead>
                <tbody>
                  {statDrillRows.map(inv => (
                    <tr key={inv.id}>
                      <td><span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#6366f1', background: 'var(--indigo-dim)', padding: '2px 7px', borderRadius: 5 }}>{inv.invoiceNumber}</span></td>
                      <td style={{ fontWeight: 700 }}>{inv.patientName}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>₹{(inv.totalAmount || 0).toLocaleString()}</td>
                      <td style={{ color: 'var(--rose)' }}>{inv.discount > 0 ? `- ₹${inv.discount.toLocaleString()}` : '—'}</td>
                      <td style={{ color: '#10b981', fontWeight: 800 }}>₹{(inv.finalAmount || 0).toLocaleString()}</td>
                      <td><span className={`badge ${payBadge(inv.paymentMethod)}`}>{payEmoji(inv.paymentMethod)} {inv.paymentMethod}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{inv.createdAt?.split('T')[0] || '—'}</td>
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
            <div className="empty-state">
              <Receipt size={40} />
              <h3>No invoices found</h3>
              <p>Create your first invoice using the button above</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>Invoice #</th><th>Patient</th><th>Items</th><th>Total</th><th>Discount</th><th>Final</th><th>Payment</th><th>Date</th><th>Print</th></tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id}>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--indigo)', fontWeight: 700, background: 'var(--indigo-dim)', padding: '3px 8px', borderRadius: 6 }}>{inv.invoiceNumber}</span></td>
                    <td style={{ fontWeight: 700 }}>{inv.patientName}</td>
                    <td><span className="badge gray">{(inv.items || []).length} item(s)</span></td>
                    <td style={{ color: 'var(--text-secondary)' }}>₹{(inv.totalAmount || 0).toLocaleString()}</td>
                    <td style={{ color: 'var(--rose)', fontWeight: 600 }}>{inv.discount > 0 ? `- ₹${inv.discount}` : '—'}</td>
                    <td style={{ color: 'var(--emerald)', fontWeight: 800, fontSize: '0.95rem' }}>₹{(inv.finalAmount || 0).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${payBadge(inv.paymentMethod)}`}>
                        {payEmoji(inv.paymentMethod)} {inv.paymentMethod}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Print / Save PDF" onClick={() => printInvoice(inv)}>
                        <Printer size={15} color="var(--indigo)" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && <InvoiceModal onClose={() => setShowModal(false)} onSaved={load} />}
    </div>
  );
}
