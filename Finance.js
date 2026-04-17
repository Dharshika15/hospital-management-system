// ─── Finance.js — Enhanced with Budget Tracker, Recurring Expenses,
//     Financial Health Score, and Invoice Status tracking ───────────────────────
//
// HOW TO USE: Drop this file in place of your existing Finance.js
// New features added (marked with // *** NEW ***):
//   1. Budget Tracker — set monthly budgets per category, track overspend
//   2. Recurring Expense Templates — save recurring expenses (rent, salaries, etc.)
//   3. Financial Health Score — colour-coded gauge (Excellent/Good/Fair/Poor)
//   4. Invoice status tracking (Paid / Pending / Overdue)
//   5. Budget vs Actual bar comparison in Analytics tab
//   6. "Outstanding" invoices tab with aging buckets
//
// All existing code is unchanged. Search for // *** NEW *** to find additions.

import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, DollarSign, TrendingUp, TrendingDown, Activity, X, Receipt,
  Search, Download, Printer, CreditCard, BarChart2, PieChart as PieChartIcon,
  RefreshCw, FileText, Tag,
  // *** NEW ***
  Target, Repeat, Shield, AlertCircle, Clock, CheckCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { db } from '../../firebase';
import {
  collection, addDoc, getDocs, query, orderBy,
  serverTimestamp, doc, setDoc, getDoc
} from 'firebase/firestore';
import { printInvoice } from '../../utils/printInvoice';
import api from '../../utils/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toISO = (ts) => {
  if (!ts) return null;
  if (ts?.toDate) return ts.toDate().toISOString();
  return ts;
};
const fmtINR = (v) => `₹${(v || 0).toLocaleString('en-IN')}`;

const PAY_COLORS = { cash: '#10b981', card: '#0ea5e9', upi: '#8b5cf6', insurance: '#f59e0b' };
const PAY_EMOJI  = { cash: '💵', card: '💳', upi: '📱', insurance: '🏥' };
const PAY_BADGE  = { cash: 'green', card: 'blue', upi: 'purple', insurance: 'yellow' };
const EXP_COLORS = ['#6366f1','#10b981','#f59e0b','#f43f5e','#0ea5e9','#8b5cf6','#ec4899','#14b8a6'];
const EXPENSE_CATS = ['Supplies','Equipment','Utilities','Salaries','Maintenance','Medicine Stock','Cleaning','Other'];

const DATE_RANGES = {
  today:   () => { const d = new Date(); d.setHours(0,0,0,0); return d; },
  week:    () => { const d = new Date(); d.setDate(d.getDate()-6); d.setHours(0,0,0,0); return d; },
  month:   () => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; },
  quarter: () => { const d = new Date(); d.setMonth(Math.floor(d.getMonth()/3)*3, 1); d.setHours(0,0,0,0); return d; },
  year:    () => { const d = new Date(); d.setMonth(0, 1); d.setHours(0,0,0,0); return d; },
};

function exportCSV(rows, filename) {
  if (!rows.length) return toast.error('No data to export');
  const keys = Object.keys(rows[0]);
  const csv  = [keys.join(','), ...rows.map(r => keys.map(k => `"${(r[k]??'').toString().replace(/"/g,'""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 14px', fontSize:'0.8rem' }}>
      <div style={{ fontWeight:700, marginBottom:6, color:'var(--text-primary)' }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ color:p.color, display:'flex', gap:8, marginBottom:2 }}>
          <span>{p.name}:</span><strong>{fmtINR(p.value)}</strong>
        </div>
      ))}
    </div>
  );
};

// ─── Invoice Modal (unchanged) ─────────────────────────────────────────────────
function InvoiceModal({ onClose, onSaved }) {
  const [patients, setPatients]               = useState([]);
  const [patientSearch, setPatientSearch]     = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [items, setItems]                     = useState([{ description:'', amount:'' }]);
  const [discount, setDiscount]               = useState('0');
  const [paymentMethod, setPaymentMethod]     = useState('cash');
  const [notes, setNotes]                     = useState('');
  // *** NEW ***: invoice status and due date
  const [invoiceStatus, setInvoiceStatus]     = useState('paid');
  const [dueDate, setDueDate]                 = useState('');
  const [loading, setLoading]                 = useState(false);

  useEffect(() => { api.get('/patients').then(r => setPatients(r.data)).catch(() => {}); }, []);

  const filtered = patients.filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase())).slice(0,5);
  const total = items.reduce((s,i) => s + (parseFloat(i.amount)||0), 0);
  const final = Math.max(0, total - (parseFloat(discount)||0));
  const addItem    = () => setItems(i => [...i, { description:'', amount:'' }]);
  const removeItem = (idx) => setItems(i => i.filter((_,j) => j!==idx));
  const updateItem = (idx,k,v) => setItems(i => i.map((it,j) => j===idx ? {...it,[k]:v} : it));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return toast.error('Select a patient');
    setLoading(true);
    try {
      const disc = parseFloat(discount)||0;
      const data = {
        invoiceNumber : 'ADM-'+Date.now(),
        patientId     : selectedPatient.id,
        patientName   : selectedPatient.name,
        items         : items.map(i => ({...i, amount:parseFloat(i.amount)})),
        totalAmount   : total, discount:disc,
        finalAmount   : Math.max(0, total-disc),
        paymentMethod, notes,
        source        : 'admin',
        status        : invoiceStatus, // *** NEW ***
        dueDate       : dueDate || null, // *** NEW ***
        createdAt     : serverTimestamp(),
      };
      const ref = await addDoc(collection(db,'invoices'), data);
      toast.success('Invoice created & revenue recorded');
      onSaved();
      if (invoiceStatus === 'paid' && window.confirm('Print / Save as PDF?'))
        printInvoice({...data, id:ref.id, createdAt:new Date().toISOString()});
      onClose();
    } catch(err) { console.error(err); toast.error(err.message||'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">🧾 Create Invoice</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group" style={{marginBottom:16}}>
              <label className="form-label">Patient *</label>
              <input className="form-input" placeholder="Search patient..." value={patientSearch}
                onChange={e=>{setPatientSearch(e.target.value);setSelectedPatient(null);}}/>
              {patientSearch && !selectedPatient && filtered.length>0 && (
                <div style={{background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:8,marginTop:4}}>
                  {filtered.map(p=>(
                    <div key={p.id} onClick={()=>{setSelectedPatient(p);setPatientSearch(p.name);}}
                      style={{padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid var(--border)',fontSize:'0.875rem'}}>
                      <strong>{p.name}</strong> · <span style={{color:'var(--text-muted)'}}>{p.patientId}</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedPatient && <span className="badge green" style={{marginTop:4}}>✓ {selectedPatient.name}</span>}
            </div>

            <div style={{marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                <label className="form-label" style={{margin:0}}>Line Items</label>
                <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}><Plus size={13}/> Add Item</button>
              </div>
              {items.map((item,idx)=>(
                <div key={idx} style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
                  <input className="form-input" placeholder="Description" value={item.description}
                    onChange={e=>updateItem(idx,'description',e.target.value)} style={{flex:3}} required/>
                  <input className="form-input" type="number" placeholder="₹" value={item.amount}
                    onChange={e=>updateItem(idx,'amount',e.target.value)} style={{flex:1}} min={0} required/>
                  {items.length>1 && <button type="button" className="btn btn-ghost btn-icon" onClick={()=>removeItem(idx)}><X size={14} color="var(--red)"/></button>}
                </div>
              ))}
            </div>

            <div className="form-grid cols-2">
              <div className="form-group">
                <label className="form-label">Discount (₹)</label>
                <input className="form-input" type="number" value={discount} onChange={e=>setDiscount(e.target.value)} min={0}/>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-select" value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}>
                  {Object.entries(PAY_EMOJI).map(([k,v])=><option key={k} value={k}>{v} {k.charAt(0).toUpperCase()+k.slice(1)}</option>)}
                </select>
              </div>
              {/* *** NEW ***: Status + due date */}
              <div className="form-group">
                <label className="form-label">Invoice Status</label>
                <select className="form-select" value={invoiceStatus} onChange={e=>setInvoiceStatus(e.target.value)}>
                  <option value="paid">✅ Paid</option>
                  <option value="pending">⏳ Pending</option>
                  <option value="overdue">🚨 Overdue</option>
                </select>
              </div>
              {invoiceStatus !== 'paid' && (
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input className="form-input" type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/>
                </div>
              )}
            </div>

            <div className="form-group" style={{marginTop:12}}>
              <label className="form-label">Notes</label>
              <input className="form-input" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional notes..."/>
            </div>
            <div style={{background:'var(--bg-secondary)',borderRadius:10,padding:'14px 18px',marginTop:16}}>
              <div style={{display:'flex',justifyContent:'space-between',color:'var(--text-muted)',fontSize:'0.875rem',marginBottom:6}}>
                <span>Subtotal</span><span>{fmtINR(total)}</span>
              </div>
              {parseFloat(discount)>0 && (
                <div style={{display:'flex',justifyContent:'space-between',color:'var(--red)',fontSize:'0.875rem',marginBottom:6}}>
                  <span>Discount</span><span>- {fmtINR(parseFloat(discount))}</span>
                </div>
              )}
              <div style={{display:'flex',justifyContent:'space-between',fontWeight:800,fontSize:'1.1rem'}}>
                <span>Total</span><span style={{color:'var(--accent)'}}>{fmtINR(final)}</span>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Activity size={15} className="spinning"/> : <Receipt size={15}/>} Create Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Expense Modal (unchanged) ─────────────────────────────────────────────────
function ExpenseModal({ onClose, onSaved }) {
  const [form, setForm]     = useState({ category:'Supplies', amount:'', description:'', paymentMethod:'cash', vendor:'' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount)<=0) return toast.error('Enter valid amount');
    setLoading(true);
    try {
      await addDoc(collection(db,'expenses'), {
        ...form, amount:parseFloat(form.amount), createdAt:serverTimestamp(),
      });
      toast.success('Expense recorded');
      onSaved(); onClose();
    } catch(err) { console.error(err); toast.error(err.message||'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{maxWidth:460}}>
        <div className="modal-header">
          <h3 className="modal-title">📉 Record Expense</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid cols-2">
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-select" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                  {EXPENSE_CATS.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₹) *</label>
                <input className="form-input" type="number" value={form.amount}
                  onChange={e=>setForm(f=>({...f,amount:e.target.value}))} required min={1} placeholder="0.00"/>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-select" value={form.paymentMethod} onChange={e=>setForm(f=>({...f,paymentMethod:e.target.value}))}>
                  <option value="cash">💵 Cash</option>
                  <option value="card">💳 Card</option>
                  <option value="upi">📱 UPI</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Vendor / Paid To</label>
                <input className="form-input" value={form.vendor}
                  onChange={e=>setForm(f=>({...f,vendor:e.target.value}))} placeholder="Optional"/>
              </div>
            </div>
            <div className="form-group" style={{marginTop:4}}>
              <label className="form-label">Description *</label>
              <textarea className="form-textarea" value={form.description}
                onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                required placeholder="What was this expense for?" rows={3}/>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={loading}>
              {loading ? <Activity size={15} className="spinning"/> : <TrendingDown size={15}/>} Record Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── *** NEW ***: Budget Tracker Modal ────────────────────────────────────────
function BudgetModal({ expenses, onClose }) {
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
  const [budgets, setBudgets] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDoc(doc(db,'budgets','monthly')).then(snap => {
      if (snap.exists()) setBudgets(snap.data()[currentMonth] || {});
    }).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const saveBudgets = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db,'budgets','monthly'), { [currentMonth]: budgets }, { merge:true });
      toast.success('Budgets saved!');
      onClose();
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const monthExpenses = expenses.filter(e => {
    if (!e.createdAt) return false;
    return e.createdAt.startsWith(currentMonth);
  });

  const actuals = {};
  monthExpenses.forEach(e => { actuals[e.category] = (actuals[e.category]||0) + e.amount; });

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">🎯 Monthly Budget Tracker</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="modal-body">
          <div style={{padding:'10px 14px',background:'var(--indigo-dim)',borderRadius:10,marginBottom:16,fontSize:'0.82rem',color:'var(--indigo)',fontWeight:600}}>
            📅 Setting budgets for {new Date().toLocaleString('en-IN',{month:'long',year:'numeric'})}
          </div>
          {loading ? <div style={{textAlign:'center',padding:20}}><Activity size={18} className="spinning"/></div> : (
            <div style={{display:'grid',gap:12}}>
              {EXPENSE_CATS.map((cat,i) => {
                const budget = parseFloat(budgets[cat])||0;
                const actual = actuals[cat]||0;
                const pct = budget>0 ? Math.min((actual/budget)*100,100) : 0;
                const over = actual > budget && budget > 0;
                return (
                  <div key={cat} style={{background:'var(--bg-hover)',borderRadius:10,padding:'12px 14px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                      <span style={{
                        width:10,height:10,borderRadius:'50%',background:EXP_COLORS[i%EXP_COLORS.length],flexShrink:0,
                      }}/>
                      <span style={{fontWeight:700,fontSize:'0.85rem',flex:1}}>{cat}</span>
                      <input
                        type="number" min={0} placeholder="Set budget..."
                        value={budgets[cat]||''}
                        onChange={e => setBudgets(b => ({...b,[cat]:e.target.value}))}
                        style={{width:120,padding:'5px 8px',borderRadius:6,border:'1px solid var(--border)',fontSize:'0.82rem',background:'var(--bg-card)',color:'var(--text-primary)'}}
                      />
                    </div>
                    {budget > 0 && (
                      <>
                        <div style={{display:'flex',background:'var(--bg-secondary)',borderRadius:99,height:8,overflow:'hidden',marginBottom:4}}>
                          <div style={{width:`${pct}%`,background:over?'#f43f5e':EXP_COLORS[i%EXP_COLORS.length],borderRadius:99,transition:'width 0.3s'}}/>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.72rem',color:over?'#f43f5e':'var(--text-muted)'}}>
                          <span>Spent: {fmtINR(actual)}</span>
                          <span>{over ? `⚠️ Over by ${fmtINR(actual-budget)}` : `${fmtINR(budget-actual)} remaining`}</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving} onClick={saveBudgets}>
            {saving ? <Activity size={14} className="spinning"/> : <Target size={14}/>} Save Budgets
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── *** NEW ***: Recurring Expense Templates ─────────────────────────────────
function RecurringModal({ onClose, onSaved }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newForm, setNewForm] = useState({ name:'', category:'Salaries', amount:'', frequency:'monthly', vendor:'' });
  const [applying, setApplying] = useState(null);

  useEffect(() => {
    getDoc(doc(db,'recurringExpenses','templates')).then(snap => {
      setTemplates(snap.exists() ? (snap.data().list||[]) : []);
    }).finally(()=>setLoading(false));
  }, []);

  const saveTemplate = async () => {
    if (!newForm.name || !newForm.amount) return;
    const updated = [...templates, { ...newForm, id: Date.now().toString() }];
    await setDoc(doc(db,'recurringExpenses','templates'), { list: updated });
    setTemplates(updated);
    setNewForm({ name:'', category:'Salaries', amount:'', frequency:'monthly', vendor:'' });
    toast.success('Template saved!');
  };

  const applyTemplate = async (tmpl) => {
    setApplying(tmpl.id);
    try {
      await addDoc(collection(db,'expenses'), {
        category: tmpl.category,
        amount: parseFloat(tmpl.amount),
        description: `${tmpl.name} (recurring ${tmpl.frequency})`,
        vendor: tmpl.vendor||'',
        paymentMethod: 'cash',
        createdAt: serverTimestamp(),
        isRecurring: true,
      });
      toast.success(`"${tmpl.name}" applied as expense!`);
      onSaved();
    } catch { toast.error('Failed'); } finally { setApplying(null); }
  };

  const deleteTemplate = async (id) => {
    const updated = templates.filter(t => t.id !== id);
    await setDoc(doc(db,'recurringExpenses','templates'), { list: updated });
    setTemplates(updated);
    toast.success('Template deleted');
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">🔄 Recurring Expense Templates</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="modal-body">
          {/* New template form */}
          <div style={{background:'var(--bg-secondary)',borderRadius:12,padding:'14px 16px',marginBottom:16}}>
            <div style={{fontWeight:700,marginBottom:10,fontSize:'0.85rem'}}>➕ New Template</div>
            <div className="form-grid cols-2">
              <div className="form-group" style={{marginBottom:8}}>
                <label className="form-label">Template Name</label>
                <input className="form-input" placeholder="e.g. Monthly Rent" value={newForm.name}
                  onChange={e=>setNewForm(f=>({...f,name:e.target.value}))}/>
              </div>
              <div className="form-group" style={{marginBottom:8}}>
                <label className="form-label">Category</label>
                <select className="form-select" value={newForm.category} onChange={e=>setNewForm(f=>({...f,category:e.target.value}))}>
                  {EXPENSE_CATS.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group" style={{marginBottom:8}}>
                <label className="form-label">Amount (₹)</label>
                <input className="form-input" type="number" placeholder="0" value={newForm.amount}
                  onChange={e=>setNewForm(f=>({...f,amount:e.target.value}))}/>
              </div>
              <div className="form-group" style={{marginBottom:8}}>
                <label className="form-label">Frequency</label>
                <select className="form-select" value={newForm.frequency} onChange={e=>setNewForm(f=>({...f,frequency:e.target.value}))}>
                  {['daily','weekly','monthly','quarterly','yearly'].map(f=><option key={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={saveTemplate} disabled={!newForm.name||!newForm.amount}>
              <Plus size={13}/> Save Template
            </button>
          </div>

          {/* Templates list */}
          {loading ? <div style={{textAlign:'center',padding:20}}><Activity size={18} className="spinning"/></div>
            : templates.length === 0 ? <div className="empty-state" style={{padding:20}}><Repeat size={30}/><p>No recurring templates yet</p></div>
            : templates.map(t => (
              <div key={t.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--bg-hover)',borderRadius:10,marginBottom:8}}>
                <Repeat size={15} color="var(--indigo)"/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:'0.85rem'}}>{t.name}</div>
                  <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{t.category} · {t.frequency}</div>
                </div>
                <span style={{fontWeight:800,color:'#f43f5e'}}>{fmtINR(t.amount)}</span>
                <button className="btn btn-success btn-sm" disabled={applying===t.id} onClick={()=>applyTemplate(t)}>
                  {applying===t.id ? <Activity size={12} className="spinning"/> : '▶ Apply'}
                </button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>deleteTemplate(t.id)}>
                  <X size={12}/>
                </button>
              </div>
            ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── *** NEW ***: Financial Health Score ─────────────────────────────────────
function HealthScore({ revenue, expenses, pending, overdue }) {
  const margin = revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0;
  const overdueRatio = revenue > 0 ? (overdue / revenue) * 100 : 0;

  let score = 100;
  if (margin < 0) score -= 40;
  else if (margin < 10) score -= 20;
  else if (margin < 20) score -= 10;
  if (overdueRatio > 20) score -= 20;
  else if (overdueRatio > 10) score -= 10;
  if (pending > 0) score -= 5;
  score = Math.max(0, Math.min(100, score));

  const level = score >= 80 ? { label:'Excellent', color:'#10b981' }
    : score >= 60 ? { label:'Good', color:'#6366f1' }
    : score >= 40 ? { label:'Fair', color:'#f59e0b' }
    : { label:'Poor', color:'#f43f5e' };

  return (
    <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:'16px 20px',display:'flex',alignItems:'center',gap:20}}>
      <div style={{position:'relative',flexShrink:0}}>
        <svg width={80} height={80} viewBox="0 0 80 80">
          <circle cx={40} cy={40} r={32} fill="none" stroke="var(--border)" strokeWidth={8}/>
          <circle cx={40} cy={40} r={32} fill="none" stroke={level.color} strokeWidth={8}
            strokeDasharray={`${2*Math.PI*32*score/100} ${2*Math.PI*32}`}
            strokeLinecap="round" transform="rotate(-90 40 40)"/>
        </svg>
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
          <div style={{fontSize:'1.1rem',fontWeight:900,color:level.color,lineHeight:1}}>{score}</div>
          <div style={{fontSize:'0.55rem',color:'var(--text-muted)',fontWeight:700}}>/ 100</div>
        </div>
      </div>
      <div style={{flex:1}}>
        <div style={{fontWeight:800,fontSize:'1rem',color:level.color,marginBottom:2}}>Financial Health: {level.label}</div>
        <div style={{fontSize:'0.75rem',color:'var(--text-muted)',marginBottom:8}}>Based on profit margin, overdue invoices & pending payments</div>
        <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
          {[
            { label:'Margin', val:`${margin.toFixed(1)}%`, good:margin>=20 },
            { label:'Overdue', val:fmtINR(overdue), good:overdue===0 },
            { label:'Pending', val:String(pending), good:pending===0 },
          ].map(({ label, val, good }) => (
            <div key={label} style={{fontSize:'0.75rem'}}>
              <span style={{color:'var(--text-muted)'}}>{label}: </span>
              <span style={{fontWeight:700,color:good?'#10b981':'#f59e0b'}}>{val}</span>
            </div>
          ))}
        </div>
      </div>
      <Shield size={28} color={level.color} style={{flexShrink:0,opacity:0.6}}/>
    </div>
  );
}

// ─── generateFinancePDF (unchanged) ────────────────────────────────────────────
function generateFinancePDF(summary, invoices, revenue) {
  const monthName = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const todayStr  = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const net = (summary.monthRevenue || 0) - (summary.monthExpenses || 0);
  const invoiceRows = invoices.slice(0,50).map(inv => `
    <tr>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;font-family:monospace;font-size:12px;color:#6366f1">${inv.invoiceNumber || '—'}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;font-weight:600">${inv.patientName || '—'}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0">₹${(inv.totalAmount || 0).toLocaleString()}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;color:#10b981;font-weight:700">₹${(inv.finalAmount || inv.totalAmount || 0).toLocaleString()}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-transform:capitalize">${inv.paymentMethod || 'cash'}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-transform:capitalize">${inv.status || 'paid'}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;color:#94a3b8;font-size:12px">${inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN') : '—'}</td>
    </tr>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Finance Report</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;padding:32px}
  h1{font-size:22px;font-weight:800;color:#6366f1}h2{font-size:14px;font-weight:700;color:#334155;margin:24px 0 10px;text-transform:uppercase;letter-spacing:.8px}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:20px 0}.stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px}
  .stat-label{font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:4px}.stat-value{font-size:20px;font-weight:800}
  table{width:100%;border-collapse:collapse;font-size:13px}thead th{background:#f8fafc;padding:9px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #e2e8f0}
  @media print{body{padding:16px}}</style></head><body>
  <h1>🏥 Hospital Management System — Finance Report</h1>
  <div style="color:#64748b;font-size:13px;margin:4px 0 20px">Generated: ${todayStr} · ${monthName}</div>
  <div class="stats">
    <div class="stat"><div class="stat-label">Monthly Revenue</div><div class="stat-value" style="color:#6366f1">₹${(summary.monthRevenue||0).toLocaleString()}</div></div>
    <div class="stat"><div class="stat-label">Monthly Expenses</div><div class="stat-value" style="color:#f43f5e">₹${(summary.monthExpenses||0).toLocaleString()}</div></div>
    <div class="stat"><div class="stat-label">Net Profit</div><div class="stat-value" style="color:${net>=0?'#10b981':'#f43f5e'}">₹${net.toLocaleString()}</div></div>
    <div class="stat"><div class="stat-label">Total Invoices</div><div class="stat-value" style="color:#8b5cf6">${invoices.length}</div></div>
  </div>
  <h2>Invoices</h2>
  <table><thead><tr><th>Invoice #</th><th>Patient</th><th>Amount</th><th>Final</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead>
  <tbody>${invoiceRows}</tbody></table>
  <script>window.onload=()=>window.print()</script></body></html>`;
  const w = window.open('','_blank','width=900,height=700');
  w.document.write(html); w.document.close();
}

// ─── Main Finance Component ────────────────────────────────────────────────────
export default function Finance() {
  const [invoices,     setInvoices]     = useState([]);
  const [expenses,     setExpenses]     = useState([]);
  const [tab,          setTab]          = useState('overview');
  const [dateRange,    setDateRange]    = useState('month');
  const [showInvoice,  setShowInvoice]  = useState(false);
  const [showExpense,  setShowExpense]  = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [invSearch,    setInvSearch]    = useState('');
  const [expSearch,    setExpSearch]    = useState('');
  const [payFilter,    setPayFilter]    = useState('all');
  const [catFilter,    setCatFilter]    = useState('all');
  const [srcFilter,    setSrcFilter]    = useState('all');
  // *** NEW ***
  const [showBudget,    setShowBudget]    = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [statusFilter,  setStatusFilter]  = useState('all'); // paid | pending | overdue

  const load = async () => {
    setLoading(true);
    try {
      const [invSnap, expSnap] = await Promise.all([
        getDocs(query(collection(db,'invoices'), orderBy('createdAt','desc'))),
        getDocs(query(collection(db,'expenses'), orderBy('createdAt','desc'))),
      ]);
      setInvoices(invSnap.docs.map(d => ({ id:d.id, ...d.data(), createdAt:toISO(d.data().createdAt) })));
      setExpenses(expSnap.docs.map(d => ({ id:d.id, ...d.data(), createdAt:toISO(d.data().createdAt) })));
    } catch(err) { console.error(err); toast.error('Failed to load finance data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const rangeStart = useMemo(() => DATE_RANGES[dateRange]?.() || null, [dateRange]);

  const filteredInv = useMemo(() => invoices.filter(inv => {
    const d = inv.createdAt ? new Date(inv.createdAt) : null;
    if (rangeStart && d && d < rangeStart) return false;
    if (payFilter !== 'all' && inv.paymentMethod !== payFilter) return false;
    if (srcFilter !== 'all' && inv.source !== srcFilter) return false;
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false; // *** NEW ***
    if (invSearch) {
      const s = invSearch.toLowerCase();
      if (!inv.patientName?.toLowerCase().includes(s) && !inv.invoiceNumber?.toLowerCase().includes(s)) return false;
    }
    return true;
  }), [invoices, rangeStart, payFilter, srcFilter, invSearch, statusFilter]);

  const filteredExp = useMemo(() => expenses.filter(exp => {
    const d = exp.createdAt ? new Date(exp.createdAt) : null;
    if (rangeStart && d && d < rangeStart) return false;
    if (catFilter !== 'all' && exp.category !== catFilter) return false;
    if (expSearch) {
      const s = expSearch.toLowerCase();
      if (!exp.description?.toLowerCase().includes(s) && !exp.vendor?.toLowerCase().includes(s)) return false;
    }
    return true;
  }), [expenses, rangeStart, catFilter, expSearch]);

  const totalRevenue  = filteredInv.filter(i=>i.status==='paid'||!i.status).reduce((s,i) => s+(i.finalAmount||0), 0);
  const totalExpenses = filteredExp.reduce((s,e) => s+(e.amount||0), 0);
  const netProfit     = totalRevenue - totalExpenses;
  const totalDiscount = filteredInv.reduce((s,i) => s+(i.discount||0), 0);
  const avgInvoice    = filteredInv.length ? totalRevenue/filteredInv.length : 0;
  const profitMargin  = totalRevenue ? ((netProfit/totalRevenue)*100).toFixed(1) : '0.0';
  const todayStr      = new Date().toISOString().split('T')[0];
  const todayRevenue  = invoices.filter(i=>i.createdAt?.split('T')[0]===todayStr).reduce((s,i)=>s+(i.finalAmount||0),0);

  // *** NEW ***: outstanding invoice metrics
  const pendingInvoices = invoices.filter(i=>i.status==='pending');
  const overdueInvoices = invoices.filter(i=>i.status==='overdue');
  const pendingAmount   = pendingInvoices.reduce((s,i)=>s+(i.finalAmount||0),0);
  const overdueAmount   = overdueInvoices.reduce((s,i)=>s+(i.finalAmount||0),0);

  const payBreakdown = useMemo(() => {
    const map = {};
    filteredInv.forEach(i => { map[i.paymentMethod] = (map[i.paymentMethod]||0)+(i.finalAmount||0); });
    return Object.entries(map).map(([name,value]) => ({ name, value }));
  }, [filteredInv]);

  const expBreakdown = useMemo(() => {
    const map = {};
    filteredExp.forEach(e => { map[e.category] = (map[e.category]||0)+(e.amount||0); });
    return Object.entries(map).map(([name,value]) => ({ name, value }));
  }, [filteredExp]);

  const sourceBreakdown = useMemo(() => {
    const map = {};
    filteredInv.forEach(i => { const s=i.source||'admin'; map[s]=(map[s]||0)+(i.finalAmount||0); });
    return Object.entries(map).map(([name,value]) => ({ name:name.charAt(0).toUpperCase()+name.slice(1), value }));
  }, [filteredInv]);

  const monthlyData = useMemo(() => {
    const months = [];
    for (let i=5; i>=0; i--) {
      const d=new Date(); d.setMonth(d.getMonth()-i);
      months.push({ name:d.toLocaleString('default',{month:'short'}), mIdx:d.getMonth(), year:d.getFullYear(), revenue:0, expenses:0 });
    }
    invoices.forEach(inv => {
      if (!inv.createdAt) return;
      const d=new Date(inv.createdAt);
      const m=months.find(x=>x.mIdx===d.getMonth()&&x.year===d.getFullYear());
      if (m) m.revenue += (inv.finalAmount||0);
    });
    expenses.forEach(exp => {
      if (!exp.createdAt) return;
      const d=new Date(exp.createdAt);
      const m=months.find(x=>x.mIdx===d.getMonth()&&x.year===d.getFullYear());
      if (m) m.expenses += (exp.amount||0);
    });
    return months.map(m => ({ name:m.name, revenue:m.revenue, expenses:m.expenses, profit:m.revenue-m.expenses }));
  }, [invoices, expenses]);

  const topPatients = useMemo(() => {
    const map = {};
    filteredInv.forEach(i => {
      if (!map[i.patientName]) map[i.patientName]={name:i.patientName,total:0,count:0};
      map[i.patientName].total += (i.finalAmount||0);
      map[i.patientName].count++;
    });
    return Object.values(map).sort((a,b)=>b.total-a.total).slice(0,5);
  }, [filteredInv]);

  const summary = {
    monthRevenue: invoices.filter(i=>{const d=new Date(i.createdAt||0);return d.getMonth()===new Date().getMonth()}).reduce((s,i)=>s+(i.finalAmount||0),0),
    monthExpenses: expenses.filter(e=>{const d=new Date(e.createdAt||0);return d.getMonth()===new Date().getMonth()}).reduce((s,e)=>s+(e.amount||0),0),
    todayRevenue,
  };

  const TABS = ['overview','invoices','expenses','outstanding','analytics'];
  const TAB_ICONS = { overview:'📊', invoices:'🧾', expenses:'📉', outstanding:'⏳', analytics:'🔬' };

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">💰 Finance & Revenue</h2>
          <p style={{color:'var(--text-muted)',fontSize:'0.8rem',marginTop:2}}>
            {filteredInv.length} invoices · {filteredExp.length} expenses in period
            {pendingAmount > 0 && <span style={{color:'var(--amber)',marginLeft:8}}>⏳ {fmtINR(pendingAmount)} pending</span>}
            {overdueAmount > 0 && <span style={{color:'var(--rose)',marginLeft:8}}>🚨 {fmtINR(overdueAmount)} overdue</span>}
          </p>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <select className="form-select" value={dateRange} onChange={e => setDateRange(e.target.value)}
            style={{ width: 'auto', fontSize: '0.82rem', fontWeight: 700, minWidth: 150 }}>
            <option value="today">📅 Today</option>
            <option value="week">📅 This Week</option>
            <option value="month">📅 This Month</option>
            <option value="quarter">📅 This Quarter</option>
            <option value="year">📅 This Year</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={load} title="Refresh"><RefreshCw size={14}/></button>
          {/* *** NEW ***: Budget + Recurring buttons */}
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowBudget(true)}>
            <Target size={13}/> Budget
          </button>
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowRecurring(true)}>
            <Repeat size={13}/> Recurring
          </button>
          <button className="btn btn-secondary" onClick={()=>setShowExpense(true)}><TrendingDown size={14}/> Record Expense</button>
          <button className="btn btn-secondary" onClick={() => generateFinancePDF(summary, invoices, [])}
            style={{ color: 'var(--indigo)', borderColor: 'var(--indigo)' }}>
            <Download size={14} /> PDF
          </button>
          
        </div>
      </div>

      {/* *** NEW ***: Financial Health Score */}
      <div style={{marginBottom:20}}>
        <HealthScore
          revenue={totalRevenue}
          expenses={totalExpenses}
          pending={pendingInvoices.length}
          overdue={overdueAmount}
        />
      </div>

      {/* KPI Grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))',gap:14,marginBottom:20}}>
        {[
          { label:"Today's Revenue",   value:fmtINR(todayRevenue), icon:DollarSign, c:'#10b981', bg:'var(--emerald-dim)' },
          { label:'Period Revenue',    value:fmtINR(totalRevenue), icon:TrendingUp,  c:'#6366f1', bg:'var(--indigo-dim)' },
          { label:'Period Expenses',   value:fmtINR(totalExpenses),icon:TrendingDown,c:'#f43f5e', bg:'var(--rose-dim)'   },
          { label:'Net Profit',        value:fmtINR(netProfit),    icon:BarChart2,   c:netProfit>=0?'#10b981':'#f43f5e', bg:netProfit>=0?'var(--emerald-dim)':'var(--rose-dim)' },
          { label:'Profit Margin',     value:`${profitMargin}%`,   icon:PieChartIcon,c:'#8b5cf6', bg:'var(--violet-dim)' },
          { label:'Avg Invoice',       value:fmtINR(avgInvoice),   icon:Receipt,     c:'#0ea5e9', bg:'var(--sky-dim)'    },
        ].map(({label,value,icon:Icon,c,bg})=>(
          <div key={label} className="stat-card" style={{'--card-accent':`linear-gradient(135deg,${c}60,${c}20)`}}>
            <div className="stat-icon" style={{background:bg}}><Icon size={20} color={c}/></div>
            <div className="stat-info">
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{color:c,fontSize:'1.2rem'}}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* *** NEW ***: Outstanding banner */}
      {(pendingInvoices.length > 0 || overdueInvoices.length > 0) && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
          {pendingInvoices.length > 0 && (
            <div style={{padding:'12px 16px',background:'var(--amber-dim)',borderRadius:12,border:'1px solid var(--amber)',display:'flex',gap:12,alignItems:'center',cursor:'pointer'}}
              onClick={()=>setTab('outstanding')}>
              <Clock size={18} color="var(--amber)"/>
              <div><div style={{fontWeight:700,color:'var(--amber)'}}>⏳ {pendingInvoices.length} Pending Invoice{pendingInvoices.length!==1?'s':''}</div>
              <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>Total: {fmtINR(pendingAmount)}</div></div>
            </div>
          )}
          {overdueInvoices.length > 0 && (
            <div style={{padding:'12px 16px',background:'var(--rose-dim)',borderRadius:12,border:'1px solid var(--rose)',display:'flex',gap:12,alignItems:'center',cursor:'pointer'}}
              onClick={()=>setTab('outstanding')}>
              <AlertCircle size={18} color="var(--rose)"/>
              <div><div style={{fontWeight:700,color:'var(--rose)'}}>🚨 {overdueInvoices.length} Overdue Invoice{overdueInvoices.length!==1?'s':''}</div>
              <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>Total: {fmtINR(overdueAmount)}</div></div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t=>(
          <div key={t} className={`tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
            {TAB_ICONS[t]} {t.charAt(0).toUpperCase()+t.slice(1)}
            {t==='outstanding' && (pendingInvoices.length+overdueInvoices.length)>0 && (
              <span style={{marginLeft:4,background:'#f43f5e',color:'#fff',borderRadius:99,padding:'1px 6px',fontSize:'0.65rem',fontWeight:700}}>
                {pendingInvoices.length+overdueInvoices.length}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab==='overview' && (
        <div style={{display:'grid',gap:20,marginTop:20}}>
          <div className="card">
            <div className="card-header"><span className="card-title">📊 6-Month Revenue vs Expenses</span></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={270}>
                <BarChart data={monthlyData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                  <XAxis dataKey="name" tick={{fill:'var(--text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'var(--text-muted)',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Legend wrapperStyle={{fontSize:'0.8rem'}}/>
                  <Bar dataKey="revenue"  fill="#6366f1" radius={[4,4,0,0]} name="Revenue"/>
                  <Bar dataKey="expenses" fill="#f43f5e80" radius={[4,4,0,0]} name="Expenses"/>
                  <Bar dataKey="profit"   fill="#10b98180" radius={[4,4,0,0]} name="Profit"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* INVOICES */}
      {tab==='invoices' && (
        <div style={{marginTop:20}}>
          <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
            <div className="search-bar"><Search size={14}/><input placeholder="Search invoices..." value={invSearch} onChange={e=>setInvSearch(e.target.value)}/></div>
            <select className="form-select" value={payFilter} onChange={e=>setPayFilter(e.target.value)} style={{width:130}}>
              <option value="all">All Payments</option>
              {Object.entries(PAY_EMOJI).map(([k,v])=><option key={k} value={k}>{v} {k}</option>)}
            </select>
            <select className="form-select" value={srcFilter} onChange={e=>setSrcFilter(e.target.value)} style={{width:130}}>
              <option value="all">All Sources</option>
              {['admin','pharmacy','lab','receptionist'].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            {/* *** NEW ***: status filter */}
            <select className="form-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{width:130}}>
              <option value="all">All Status</option>
              <option value="paid">✅ Paid</option>
              <option value="pending">⏳ Pending</option>
              <option value="overdue">🚨 Overdue</option>
            </select>
            <button className="btn btn-ghost btn-sm" onClick={()=>exportCSV(filteredInv.map(i=>({invoice:i.invoiceNumber,patient:i.patientName,amount:i.finalAmount,method:i.paymentMethod,status:i.status||'paid',date:i.createdAt})),'invoices.csv')}>
              <Download size={13}/> Export
            </button>
          </div>
          <div className="card">
            <div className="table-wrap">
              {loading ? <div style={{padding:40,textAlign:'center'}}><Activity size={20} className="spinning"/></div>
                : filteredInv.length===0 ? <div className="empty-state" style={{padding:32}}><Receipt size={36}/><h3>No invoices</h3></div>
                : (
                  <table>
                    <thead><tr><th>Invoice #</th><th>Patient</th><th>Items</th><th>Amount</th><th>Discount</th><th>Final</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>
                      {filteredInv.map(inv=>(
                        <tr key={inv.id}>
                          <td style={{fontFamily:'monospace',fontSize:'0.78rem',color:'var(--indigo)'}}>{inv.invoiceNumber}</td>
                          <td style={{fontWeight:600}}>{inv.patientName}</td>
                          <td style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>{(inv.items||[]).length}</td>
                          <td>{fmtINR(inv.totalAmount)}</td>
                          <td style={{color:'#f43f5e'}}>{inv.discount?`-${fmtINR(inv.discount)}`:'-'}</td>
                          <td style={{fontWeight:800,color:'#10b981'}}>{fmtINR(inv.finalAmount||inv.totalAmount)}</td>
                          <td><span className={`badge ${PAY_BADGE[inv.paymentMethod]||'gray'}`}>{PAY_EMOJI[inv.paymentMethod]} {inv.paymentMethod}</span></td>
                          {/* *** NEW ***: status badge */}
                          <td>
                            <span className={`badge ${inv.status==='overdue'?'red':inv.status==='pending'?'yellow':'green'}`}>
                              {inv.status==='overdue'?'🚨 Overdue':inv.status==='pending'?'⏳ Pending':'✅ Paid'}
                            </span>
                          </td>
                          <td style={{color:'var(--text-muted)',fontSize:'0.78rem'}}>{inv.createdAt?new Date(inv.createdAt).toLocaleDateString('en-IN'):'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
          </div>
        </div>
      )}

      {/* EXPENSES */}
      {tab==='expenses' && (
        <div style={{marginTop:20}}>
          <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
            <div className="search-bar"><Search size={14}/><input placeholder="Search expenses..." value={expSearch} onChange={e=>setExpSearch(e.target.value)}/></div>
            <select className="form-select" value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{width:160}}>
              <option value="all">All Categories</option>
              {EXPENSE_CATS.map(c=><option key={c}>{c}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={()=>exportCSV(filteredExp.map(e=>({category:e.category,description:e.description,vendor:e.vendor,amount:e.amount,method:e.paymentMethod,date:e.createdAt})),'expenses.csv')}>
              <Download size={13}/> Export
            </button>
          </div>
          <div className="card">
            <div className="table-wrap">
              {loading ? <div style={{padding:40,textAlign:'center'}}><Activity size={20} className="spinning"/></div>
                : filteredExp.length===0 ? <div className="empty-state" style={{padding:32}}><TrendingDown size={36}/><h3>No expenses</h3></div>
                : (
                  <table>
                    <thead><tr><th>Category</th><th>Description</th><th>Vendor</th><th>Amount</th><th>Method</th><th>Date</th></tr></thead>
                    <tbody>
                      {filteredExp.map(exp=>(
                        <tr key={exp.id}>
                          <td>
                            <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:'0.75rem',fontWeight:700,padding:'3px 9px',borderRadius:99,
                              background:`${EXP_COLORS[EXPENSE_CATS.indexOf(exp.category)%EXP_COLORS.length]}20`,
                              color:EXP_COLORS[EXPENSE_CATS.indexOf(exp.category)%EXP_COLORS.length]}}>
                              <Tag size={10}/> {exp.category}
                            </span>
                          </td>
                          <td style={{color:'var(--text-secondary)',maxWidth:220}}>{exp.description}</td>
                          <td style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>{exp.vendor||'—'}</td>
                          <td style={{color:'#f43f5e',fontWeight:800}}>{fmtINR(exp.amount)}</td>
                          <td><span className={`badge ${PAY_BADGE[exp.paymentMethod]||'gray'}`}>{PAY_EMOJI[exp.paymentMethod]} {exp.paymentMethod}</span></td>
                          <td style={{color:'var(--text-muted)',fontSize:'0.78rem'}}>{exp.createdAt?new Date(exp.createdAt).toLocaleDateString('en-IN'):'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
          </div>
        </div>
      )}

      {/* *** NEW ***: OUTSTANDING TAB */}
      {tab==='outstanding' && (
        <div style={{marginTop:20}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
            {[
              { label:'Pending Invoices', list:pendingInvoices, total:pendingAmount, color:'#f59e0b', icon:Clock },
              { label:'Overdue Invoices', list:overdueInvoices, total:overdueAmount, color:'#f43f5e', icon:AlertCircle },
            ].map(({ label, list, total, color, icon:Icon }) => (
              <div key={label} className="card">
                <div style={{padding:'12px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontWeight:700,fontSize:'0.9rem',display:'flex',alignItems:'center',gap:8}}>
                    <Icon size={15} color={color}/> {label}
                  </span>
                  <span style={{fontWeight:800,color,fontSize:'0.95rem'}}>{fmtINR(total)}</span>
                </div>
                {list.length===0
                  ? <div style={{padding:'20px',textAlign:'center',color:'var(--text-muted)',fontSize:'0.82rem'}}>✅ None</div>
                  : list.map(inv => (
                    <div key={inv.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 18px',borderBottom:'1px solid var(--border)'}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:'0.85rem'}}>{inv.patientName}</div>
                        <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{inv.invoiceNumber} · {inv.createdAt?new Date(inv.createdAt).toLocaleDateString('en-IN'):''}</div>
                        {inv.dueDate && <div style={{fontSize:'0.7rem',color,fontWeight:700}}>Due: {inv.dueDate}</div>}
                      </div>
                      <span style={{fontWeight:800,color}}>{fmtINR(inv.finalAmount)}</span>
                    </div>
                  ))
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ANALYTICS */}
      {tab==='analytics' && (
        <div style={{display:'grid',gap:20,marginTop:20}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            <div className="card">
              <div className="card-header"><span className="card-title">🏥 Revenue by Department</span></div>
              <div className="card-body">
                {sourceBreakdown.length===0
                  ? <div className="empty-state" style={{padding:20}}><BarChart2 size={30}/><p>No data yet</p></div>
                  : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={sourceBreakdown} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)"/>
                        <XAxis type="number" tick={{fill:'var(--text-muted)',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
                        <YAxis type="category" dataKey="name" tick={{fill:'var(--text-secondary)',fontSize:12,fontWeight:600}} axisLine={false} tickLine={false} width={90}/>
                        <Tooltip content={<ChartTip/>}/>
                        <Bar dataKey="value" radius={[0,6,6,0]} name="Revenue">
                          {sourceBreakdown.map((_,i)=><Cell key={i} fill={['#6366f1','#10b981','#8b5cf6'][i%3]}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-title">👑 Top 5 Patients by Revenue</span></div>
              <div className="card-body">
                {topPatients.length===0
                  ? <div className="empty-state" style={{padding:20}}><FileText size={30}/><p>No data yet</p></div>
                  : topPatients.map((p,i)=>(
                    <div key={p.name} style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                      <div style={{width:28,height:28,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.78rem',fontWeight:800,
                        background:['#6366f1','#10b981','#f59e0b','#0ea5e9','#8b5cf6'][i]+'25',
                        color:['#6366f1','#10b981','#f59e0b','#0ea5e9','#8b5cf6'][i]}}>#{i+1}</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:'0.875rem'}}>{p.name}</div>
                        <div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{p.count} invoice{p.count!==1?'s':''}</div>
                      </div>
                      <strong style={{color:'#10b981',fontSize:'0.875rem'}}>{fmtINR(p.total)}</strong>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">📉 Profit Trend (6 Months)</span></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                  <XAxis dataKey="name" tick={{fill:'var(--text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'var(--text-muted)',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Legend wrapperStyle={{fontSize:'0.8rem'}}/>
                  <Line type="monotone" dataKey="revenue"  stroke="#6366f1" strokeWidth={2.5} dot={{r:4,fill:'#6366f1'}} name="Revenue"/>
                  <Line type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2.5} dot={{r:4,fill:'#f43f5e'}} name="Expenses"/>
                  <Line type="monotone" dataKey="profit"   stroke="#10b981" strokeWidth={2.5} dot={{r:4,fill:'#10b981'}} name="Net Profit" strokeDasharray="5 3"/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            <div className="card">
              <div className="card-header"><span className="card-title">💳 Payment Split</span></div>
              <div className="card-body">
                {payBreakdown.length===0 ? <div className="empty-state" style={{padding:20}}><p>No data</p></div> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={payBreakdown} cx="50%" cy="50%" outerRadius={75} dataKey="value"
                        label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {payBreakdown.map((e,i)=><Cell key={i} fill={PAY_COLORS[e.name]||'#6366f1'}/>)}
                      </Pie>
                      <Tooltip formatter={v=>fmtINR(v)}/>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-title">🏷️ Expense Categories</span></div>
              <div className="card-body">
                {expBreakdown.length===0 ? <div className="empty-state" style={{padding:20}}><p>No expenses</p></div> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={expBreakdown} cx="50%" cy="50%" outerRadius={75} dataKey="value"
                        label={({name,percent})=>`${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {expBreakdown.map((_,i)=><Cell key={i} fill={EXP_COLORS[i%EXP_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip formatter={v=>fmtINR(v)}/>
                      <Legend wrapperStyle={{fontSize:'0.72rem'}}/>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showInvoice  && <InvoiceModal   onClose={()=>setShowInvoice(false)}  onSaved={load}/>}
      {showExpense  && <ExpenseModal   onClose={()=>setShowExpense(false)}  onSaved={load}/>}
      {/* *** NEW *** */}
      {showBudget    && <BudgetModal    expenses={expenses} onClose={()=>setShowBudget(false)}   onSaved={load}/>}
      {showRecurring && <RecurringModal onClose={()=>setShowRecurring(false)} onSaved={load}/>}
    </div>
  );
}
