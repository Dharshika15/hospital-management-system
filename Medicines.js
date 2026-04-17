import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Plus, Search, Pill, AlertTriangle, Activity, X, Package, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const CATEGORIES = ['Antibiotic', 'Analgesic', 'Antiviral', 'Antifungal', 'Cardiovascular', 'Diabetes', 'Vitamin', 'Supplement', 'Vaccine', 'Other'];

function MedicineModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', category: 'Antibiotic', manufacturer: '', unit: 'tablet',
    price: '', stock: '', minStock: '10', expiryDate: '', description: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/medicines', form);
      toast.success('Medicine added');
      onSaved(); onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">Add Medicine</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid cols-2">
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Medicine Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Amoxicillin 500mg" />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Manufacturer</label>
                <input className="form-input" value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} placeholder="Pharma company" />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select className="form-select" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                  {['tablet', 'capsule', 'syrup (ml)', 'injection (ml)', 'cream (g)', 'pcs'].map(u => <option key={u}>{u}</option>)}
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
                <label className="form-label">Expiry Date</label>
                <input className="form-input" type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
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
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch(`/medicines/${medicine.id}/stock`, { quantity: parseInt(qty), operation: op });
      toast.success('Stock updated');
      onSaved(); onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setLoading(false); }
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
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>CURRENT STOCK</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: medicine.stock <= medicine.minStock ? 'var(--red)' : 'var(--green)' }}>{medicine.stock}</div>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Operation</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['add', 'Add Stock', TrendingUp], ['subtract', 'Remove Stock', TrendingDown]].map(([val, lbl, Icon]) => (
                  <button key={val} type="button"
                    onClick={() => setOp(val)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8, border: '1px solid',
                      borderColor: op === val ? (val === 'add' ? 'var(--green)' : 'var(--red)') : 'var(--border)',
                      background: op === val ? (val === 'add' ? 'var(--green-dim)' : 'var(--red-dim)') : 'var(--bg-hover)',
                      color: op === val ? (val === 'add' ? 'var(--green)' : 'var(--red)') : 'var(--text-secondary)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 500
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

export default function Medicines() {
  const { userData } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [stockModal, setStockModal] = useState(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showLowStock, setShowLowStock] = useState(false);

  const canManage = ['admin', 'pharmacy'].includes(userData?.role);

  const load = async () => {
    try {
      const res = await api.get('/medicines');
      setMedicines(res.data);
    } catch { toast.error('Failed to load medicines'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = medicines.filter(m => {
    const matchSearch = m.name?.toLowerCase().includes(search.toLowerCase()) || m.manufacturer?.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || m.category === catFilter;
    const matchLow = !showLowStock || m.stock <= m.minStock;
    return matchSearch && matchCat && matchLow;
  });

  const lowCount = medicines.filter(m => m.stock <= m.minStock).length;

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Medicine Inventory</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>{medicines.length} medicines · {lowCount > 0 && <span style={{ color: 'var(--yellow)' }}>{lowCount} low stock</span>}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-bar">
            <Search size={15} />
            <input placeholder="Search medicines..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: 140 }}>
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <button className={`btn ${showLowStock ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setShowLowStock(!showLowStock)}>
            <AlertTriangle size={14} /> {showLowStock ? 'Show All' : 'Low Stock'}
          </button>
          {canManage && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={15} /> Add Medicine
            </button>
          )}
        </div>
      </div>

      {lowCount > 0 && (
        <div className="alert warning" style={{ marginBottom: 20 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span><strong>{lowCount} medicines</strong> are at or below minimum stock levels and require immediate restocking.</span>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}><Activity size={20} className="spinning" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><Pill size={40} /><h3>No medicines found</h3></div>
          ) : (
            <table>
              <thead>
                <tr><th>Name</th><th>Category</th><th>Manufacturer</th><th>Unit</th><th>Price</th><th>Stock</th><th>Expiry</th><th>Status</th>{canManage && <th>Actions</th>}</tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const isLow = m.stock <= m.minStock;
                  const isOut = m.stock === 0;
                  return (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600 }}>{m.name}</td>
                      <td><span className="badge purple">{m.category}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{m.manufacturer || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{m.unit}</td>
                      <td style={{ color: 'var(--green)' }}>₹{m.price?.toFixed(2)}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: isOut ? 'var(--red)' : isLow ? 'var(--yellow)' : 'var(--green)', fontSize: '0.95rem' }}>
                          {m.stock}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: 4 }}>/ min {m.minStock}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{m.expiryDate || '—'}</td>
                      <td><span className={`badge ${isOut ? 'red' : isLow ? 'yellow' : 'green'}`}>{isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}</span></td>
                      {canManage && (
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => setStockModal(m)}>
                            <Package size={13} /> Stock
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && <MedicineModal onClose={() => setShowModal(false)} onSaved={load} />}
      {stockModal && <StockModal medicine={stockModal} onClose={() => setStockModal(null)} onSaved={load} />}
    </div>
  );
}
