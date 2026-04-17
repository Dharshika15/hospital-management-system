// ─── DoctorRevenueReport.js ───────────────────────────────────────────────────
//
// A standalone page (or embeddable tab) showing doctor-wise revenue breakdown.
// Drop inside your Finance tabs or add as a new route /finance/doctors.
//
// Features:
//   • Revenue per doctor (bar chart + table)
//   • Date range filter (This Month / This Quarter / This Year / Custom)
//   • Avg invoice value, total consultations, top earner highlight
//   • CSV export of the report
//   • Drilldown: click a doctor to see their invoices list

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  TrendingUp, Download, Activity, Stethoscope,
  ChevronLeft, Receipt, Award, Users
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtINR = (v) => `₹${(v || 0).toLocaleString('en-IN')}`;

const DOCTOR_COLORS = [
  '#6366f1','#10b981','#f59e0b','#f43f5e','#0ea5e9',
  '#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16',
];

const DATE_PRESETS = [
  { label: 'This Month',   key: 'month' },
  { label: 'Last 3 Months', key: 'quarter' },
  { label: 'This Year',    key: 'year' },
  { label: 'Custom',       key: 'custom' },
];

function getPresetRange(key) {
  const now = new Date();
  let from = new Date();
  if (key === 'month')   { from = new Date(now.getFullYear(), now.getMonth(), 1); }
  if (key === 'quarter') { from = new Date(); from.setMonth(from.getMonth() - 3); from.setDate(1); }
  if (key === 'year')    { from = new Date(now.getFullYear(), 0, 1); }
  return { from: from.toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
}

function exportCSV(rows) {
  if (!rows.length) return toast.error('No data');
  const keys = ['doctor', 'consultations', 'totalRevenue', 'avgInvoice'];
  const header = ['Doctor', 'Consultations', 'Total Revenue (₹)', 'Avg Invoice (₹)'];
  const csv = [
    header.join(','),
    ...rows.map(r => keys.map(k => `"${(r[k] ?? '').toString()}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `doctor_revenue_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  toast.success('CSV downloaded');
}

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: '0.8rem' }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: <strong>{fmtINR(p.value)}</strong></div>
      ))}
    </div>
  );
};

// ─── Invoice Drilldown for one doctor ─────────────────────────────────────────
function DoctorDrilldown({ doctor, invoices, onBack }) {
  return (
    <div>
      <button className="btn btn-secondary" style={{ marginBottom: 18 }} onClick={onBack}>
        <ChevronLeft size={14} /> Back to Report
      </button>
      <div className="section-header">
        <div>
          <h3 style={{ fontWeight: 800, fontSize: '1rem' }}>
            Invoices — {doctor}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {invoices.length} invoices · {fmtINR(invoices.reduce((s, i) => s + (i.finalAmount || 0), 0))} total
          </p>
        </div>
      </div>
      <div className="card">
        <div className="table-wrap">
          {invoices.length === 0 ? (
            <div className="empty-state"><Receipt size={32} /><p>No invoices</p></div>
          ) : (
            <table>
              <thead>
                <tr><th>Invoice #</th><th>Patient</th><th>Amount</th><th>Method</th><th>Date</th></tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{inv.invoiceNumber || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{inv.patientName}</td>
                    <td style={{ fontWeight: 700, color: '#10b981' }}>{fmtINR(inv.finalAmount)}</td>
                    <td>
                      <span className={`badge ${
                        inv.paymentMethod === 'cash' ? 'green' :
                        inv.paymentMethod === 'card' ? 'blue' :
                        inv.paymentMethod === 'upi' ? 'purple' : 'yellow'
                      }`}>{inv.paymentMethod || '—'}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function DoctorRevenueReport() {
  const [doctors, setDoctors] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [drillDoc, setDrillDoc] = useState(null); // doctor name for drilldown

  useEffect(() => {
    const load = async () => {
      try {
        const [docRes, invSnap] = await Promise.all([
          api.get('/users?role=doctor'),
          getDocs(query(collection(db, 'invoices'), orderBy('createdAt', 'desc'))),
        ]);
        setDoctors(docRes.data);
        setAllInvoices(invSnap.docs.map(d => {
          const data = d.data();
          return {
            ...data, id: d.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          };
        }));
      } catch (err) {
        toast.error('Failed to load data');
      } finally { setLoading(false); }
    };
    load();
  }, []);

  // Determine date range
  const { from, to } = useMemo(() => {
    if (preset === 'custom' && customFrom && customTo) return { from: customFrom, to: customTo };
    return getPresetRange(preset);
  }, [preset, customFrom, customTo]);

  // Filter invoices by date range
  const filteredInvoices = useMemo(() => {
    const fromD = new Date(from + 'T00:00:00');
    const toD   = new Date(to   + 'T23:59:59');
    return allInvoices.filter(inv => {
      if (!inv.createdAt) return false;
      const d = new Date(inv.createdAt);
      return d >= fromD && d <= toD;
    });
  }, [allInvoices, from, to]);

  // Group invoices by doctor (via performedByName or doctorName field)
  const reportRows = useMemo(() => {
    const map = {};

    // Bucket invoices per doctor name
    filteredInvoices.forEach(inv => {
      const name = inv.doctorName || inv.performedByName || 'Unassigned';
      if (!map[name]) map[name] = { doctor: name, consultations: 0, totalRevenue: 0, invoices: [] };
      map[name].consultations++;
      map[name].totalRevenue += (inv.finalAmount || 0);
      map[name].invoices.push(inv);
    });

    return Object.values(map)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .map(r => ({ ...r, avgInvoice: r.consultations ? Math.round(r.totalRevenue / r.consultations) : 0 }));
  }, [filteredInvoices]);

  const totalRevenue   = reportRows.reduce((s, r) => s + r.totalRevenue, 0);
  const totalConsults  = reportRows.reduce((s, r) => s + r.consultations, 0);
  const topEarner      = reportRows[0];

  // Drilldown view
  if (drillDoc) {
    const row = reportRows.find(r => r.doctor === drillDoc);
    return <DoctorDrilldown doctor={drillDoc} invoices={row?.invoices || []} onBack={() => setDrillDoc(null)} />;
  }

  return (
    <div>
      {/* Header */}
      <div className="section-header" style={{ marginBottom: 20 }}>
        <div>
          <h2 className="section-title">👨‍⚕️ Doctor Revenue Report</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
            Revenue breakdown per doctor
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Date preset tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-secondary)', borderRadius: 10, padding: 4 }}>
            {DATE_PRESETS.map(p => (
              <button key={p.key} onClick={() => setPreset(p.key)}
                style={{
                  padding: '6px 12px', border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.78rem', transition: 'all 0.15s',
                  background: preset === p.key ? 'var(--accent)' : 'transparent',
                  color: preset === p.key ? '#fff' : 'var(--text-muted)',
                }}>
                {p.label}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <>
              <input type="date" className="form-input" style={{ width: 150 }} value={customFrom}
                onChange={e => setCustomFrom(e.target.value)} />
              <input type="date" className="form-input" style={{ width: 150 }} value={customTo}
                onChange={e => setCustomTo(e.target.value)} />
            </>
          )}
          <button className="btn btn-secondary" onClick={() => exportCSV(reportRows)}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Activity size={22} className="spinning" />
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            {[
              { label: 'Total Revenue', value: fmtINR(totalRevenue), color: 'var(--emerald)', bg: 'var(--emerald-dim)', icon: TrendingUp },
              { label: 'Consultations', value: totalConsults, color: 'var(--indigo)', bg: 'var(--indigo-dim)', icon: Receipt },
              { label: 'Avg per Invoice', value: fmtINR(totalConsults ? Math.round(totalRevenue / totalConsults) : 0), color: 'var(--violet)', bg: 'var(--violet-dim)', icon: Activity },
              { label: 'Top Earner', value: topEarner?.doctor || '—', color: 'var(--yellow)', bg: 'var(--yellow-dim)', icon: Award },
            ].map(({ label, value, color, bg, icon: Icon }) => (
              <div key={label} className="stat-card">
                <div className="stat-icon" style={{ background: bg }}><Icon size={22} color={color} /></div>
                <div className="stat-info">
                  <div className="stat-label">{label}</div>
                  <div className="stat-value" style={{ color, fontSize: label === 'Top Earner' ? '0.85rem' : undefined }}>{value}</div>
                </div>
              </div>
            ))}
          </div>

          {reportRows.length === 0 ? (
            <div className="card">
              <div className="empty-state" style={{ padding: 60 }}>
                <Stethoscope size={40} />
                <h3>No revenue data</h3>
                <p>No invoices found for the selected period</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 20 }}>
              {/* Bar Chart */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Revenue by Doctor</span>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={reportRows} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="doctor"
                        tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 600 }}
                        axisLine={false} tickLine={false}
                        tickFormatter={v => v.split(' ')[0]} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
                        tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="totalRevenue" radius={[6, 6, 0, 0]} name="Revenue" maxBarSize={56}>
                        {reportRows.map((_, i) => <Cell key={i} fill={DOCTOR_COLORS[i % DOCTOR_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Table */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Detailed Breakdown</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    Click a row to see invoices
                  </span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th><th>Doctor</th><th>Consultations</th>
                        <th>Total Revenue</th><th>Avg Invoice</th><th>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportRows.map((row, i) => {
                        const share = totalRevenue ? ((row.totalRevenue / totalRevenue) * 100).toFixed(1) : 0;
                        const color = DOCTOR_COLORS[i % DOCTOR_COLORS.length];
                        return (
                          <tr key={row.doctor}
                            onClick={() => setDrillDoc(row.doctor)}
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                            <td>
                              <div style={{ width: 26, height: 26, borderRadius: 8, background: color + '22',
                                color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 800, fontSize: '0.78rem' }}>
                                {i + 1}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700 }}>{row.doctor}</div>
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>{row.consultations}</td>
                            <td style={{ fontWeight: 800, color: '#10b981' }}>{fmtINR(row.totalRevenue)}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{fmtINR(row.avgInvoice)}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                                  <div style={{ width: `${share}%`, height: '100%', borderRadius: 4, background: color, transition: 'width 0.5s' }} />
                                </div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color, minWidth: 36 }}>{share}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
