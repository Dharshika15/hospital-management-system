import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import {
  Users, UserCheck, Calendar, DollarSign, Pill,
  TrendingUp, TrendingDown, Activity, AlertTriangle,
  FileText, Heart, Zap, Clock
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const mockRevenue = [
  { month: 'Aug', revenue: 42000, expenses: 28000 },
  { month: 'Sep', revenue: 51000, expenses: 31000 },
  { month: 'Oct', revenue: 47000, expenses: 29000 },
  { month: 'Nov', revenue: 58000, expenses: 34000 },
  { month: 'Dec', revenue: 63000, expenses: 38000 },
  { month: 'Jan', revenue: 72000, expenses: 41000 },
];

const mockApptTypes = [
  { name: 'General', value: 38 },
  { name: 'Specialist', value: 27 },
  { name: 'Emergency', value: 15 },
  { name: 'Follow-up', value: 20 },
];

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e'];

function StatCard({ icon: Icon, label, value, change, color, bg, accent }) {
  const isUp = change >= 0;
  return (
    <div className="stat-card" style={{ '--card-accent': accent || color }}>
      <div className="stat-icon" style={{ background: bg }}>
        <Icon size={24} color={color} />
      </div>
      <div className="stat-info">
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{ color }}>{value}</div>
        {change !== undefined && (
          <div className={`stat-change ${isUp ? 'up' : 'down'}`}>
            {isUp
              ? <TrendingUp size={12} style={{ display: 'inline', marginRight: 3 }} />
              : <TrendingDown size={12} style={{ display: 'inline', marginRight: 3 }} />}
            {Math.abs(change)}% vs last month
          </div>
        )}
      </div>
    </div>
  );
}

const TooltipStyle = {
  contentStyle: { background: '#fff', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, fontSize: 12, boxShadow: '0 4px 16px rgba(99,102,241,0.12)' },
  labelStyle: { color: '#0f172a', fontWeight: 700 },
};

function AdminDashboard({ summary }) {
  return (
    <>
      <div className="stat-grid">
        <StatCard icon={DollarSign} label="Today's Revenue" value={`₹${(summary.todayRevenue || 0).toLocaleString()}`} change={12} color="#10b981" bg="#ecfdf5" accent="linear-gradient(90deg,#10b981,#059669)" />
        <StatCard icon={TrendingUp} label="Monthly Revenue" value={`₹${(summary.monthRevenue || 0).toLocaleString()}`} change={8} color="#6366f1" bg="#eef2ff" accent="linear-gradient(90deg,#6366f1,#8b5cf6)" />
        <StatCard icon={Activity} label="Net Profit" value={`₹${((summary.monthRevenue || 0) - (summary.monthExpenses || 0)).toLocaleString()}`} change={5} color="#8b5cf6" bg="#f5f3ff" accent="linear-gradient(90deg,#8b5cf6,#ec4899)" />
        <StatCard icon={TrendingDown} label="Expenses" value={`₹${(summary.monthExpenses || 0).toLocaleString()}`} change={-3} color="#f43f5e" bg="#fff1f2" accent="linear-gradient(90deg,#f43f5e,#fb7185)" />
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <span className="card-title">📈 Revenue vs Expenses</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last 6 months</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={mockRevenue}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.07)" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...TooltipStyle} formatter={v => [`₹${v.toLocaleString()}`, '']} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revGrad)" strokeWidth={2.5} name="Revenue" />
                <Area type="monotone" dataKey="expenses" stroke="#f43f5e" fill="url(#expGrad)" strokeWidth={2.5} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">🏥 Appointment Types</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>This month</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={mockApptTypes} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" strokeWidth={0}>
                  {mockApptTypes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip {...TooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#475569' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}

function DoctorDashboard({ appointments }) {
  const today = new Date().toISOString().split('T')[0];
  const todayAppts = appointments.filter(a => a.date === today);
  const pending = todayAppts.filter(a => a.status === 'scheduled').length;
  const completed = todayAppts.filter(a => a.status === 'completed').length;

  return (
    <>
      <div className="stat-grid">
        <StatCard icon={Calendar} label="Today's Appointments" value={todayAppts.length} color="#6366f1" bg="#eef2ff" accent="linear-gradient(90deg,#6366f1,#8b5cf6)" />
        <StatCard icon={Clock} label="Pending" value={pending} color="#f59e0b" bg="#fffbeb" accent="linear-gradient(90deg,#f59e0b,#f97316)" />
        <StatCard icon={Activity} label="Completed Today" value={completed} color="#10b981" bg="#ecfdf5" accent="linear-gradient(90deg,#10b981,#059669)" />
        <StatCard icon={FileText} label="Total Appointments" value={appointments.length} color="#8b5cf6" bg="#f5f3ff" accent="linear-gradient(90deg,#8b5cf6,#ec4899)" />
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">📅 Today's Schedule</span>
          <span className="badge indigo">{todayAppts.length} appointments</span>
        </div>
        <div className="table-wrap">
          {todayAppts.length === 0 ? (
            <div className="empty-state">
              <Calendar size={40} />
              <h3>No appointments today</h3>
              <p>Enjoy your free day!</p>
            </div>
          ) : (
            <table>
              <thead><tr><th>Patient</th><th>Time</th><th>Type</th><th>Status</th></tr></thead>
              <tbody>
                {todayAppts.map(a => (
                  <tr key={a.id}>
                    <td>{a.patientName}</td>
                    <td><span style={{ fontWeight: 700, color: 'var(--indigo)' }}>{a.time}</span></td>
                    <td><span className="badge indigo">{a.type}</span></td>
                    <td><span className={`badge ${a.status === 'completed' ? 'green' : a.status === 'cancelled' ? 'red' : 'yellow'}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

function PharmacyDashboard({ medicines }) {
  const [activeFilter, setActiveFilter] = useState(null);
  const lowStock = medicines.filter(m => m.stock <= m.minStock && m.stock > 0);
  const outOfStock = medicines.filter(m => m.stock === 0);
  const healthy = medicines.filter(m => m.stock > m.minStock);

  const drillMeds = activeFilter === 'low' ? lowStock
    : activeFilter === 'out' ? outOfStock
    : activeFilter === 'healthy' ? healthy
    : activeFilter === 'total' ? medicines
    : null;

  const drillLabel = activeFilter === 'low' ? 'Low Stock Medicines'
    : activeFilter === 'out' ? 'Out of Stock Medicines'
    : activeFilter === 'healthy' ? 'Healthy Stock Medicines'
    : 'All Medicines';

  return (
    <>
      <div className="stat-grid">
        {[
          { key: 'total',   icon: Pill,          label: 'Total Medicines', value: medicines.length,  color: '#8b5cf6', bg: '#f5f3ff', accent: 'linear-gradient(90deg,#8b5cf6,#a78bfa)' },
          { key: 'low',     icon: AlertTriangle, label: 'Low Stock',       value: lowStock.length,   color: '#f59e0b', bg: '#fffbeb', accent: 'linear-gradient(90deg,#f59e0b,#f97316)' },
          { key: 'out',     icon: Activity,      label: 'Out of Stock',    value: outOfStock.length, color: '#f43f5e', bg: '#fff1f2', accent: 'linear-gradient(90deg,#f43f5e,#fb7185)' },
          { key: 'healthy', icon: Heart,         label: 'Healthy Stock',   value: healthy.length,    color: '#10b981', bg: '#ecfdf5', accent: 'linear-gradient(90deg,#10b981,#059669)' },
        ].map(({ key, icon: Icon, label, value, color, bg, accent }) => (
          <div key={key} className="stat-card"
            style={{ '--card-accent': accent, cursor: 'pointer', outline: activeFilter === key ? `2px solid ${color}` : 'none' }}
            onClick={() => setActiveFilter(activeFilter === key ? null : key)}>
            <div className="stat-icon" style={{ background: bg }}><Icon size={24} color={color} /></div>
            <div className="stat-info">
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ color }}>{value}</div>
              {activeFilter === key && <div style={{ fontSize: '0.65rem', color, fontWeight: 700, marginTop: 2 }}>tap again to collapse</div>}
            </div>
          </div>
        ))}
      </div>

      {drillMeds && (
        <div className="card" style={{ marginBottom: 20, border: '2px solid var(--border-active)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">{drillLabel}</span>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setActiveFilter(null)}>✕</button>
          </div>
          <div className="table-wrap">
            {drillMeds.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}><Pill size={30} /><p>No medicines in this category</p></div>
            ) : (
              <table>
                <thead>
                  <tr><th>Medicine</th><th>Category</th><th>Stock</th><th>Min Stock</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {drillMeds.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 700 }}>{m.name}</td>
                      <td><span className="badge purple">{m.category}</span></td>
                      <td><span style={{ fontWeight: 800, color: m.stock === 0 ? '#f43f5e' : m.stock <= m.minStock ? '#f59e0b' : '#10b981', fontSize: '1rem' }}>{m.stock}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{m.minStock}</td>
                      <td><span className={`badge ${m.stock === 0 ? 'red' : m.stock <= m.minStock ? 'yellow' : 'green'}`}>{m.stock === 0 ? 'Out' : m.stock <= m.minStock ? 'Low' : 'OK'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {!drillMeds && lowStock.length > 0 && (
        <div className="alert warning" style={{ marginBottom: 20 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span><strong>{lowStock.length} medicines</strong> are below minimum stock levels.</span>
        </div>
      )}

      {!drillMeds && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Low Stock Alerts</span>
            <span className="badge yellow">{lowStock.length} items</span>
          </div>
          <div className="table-wrap">
            {lowStock.length === 0 ? (
              <div className="empty-state"><Pill size={40} /><h3>All stocks are healthy!</h3></div>
            ) : (
              <table>
                <thead><tr><th>Medicine</th><th>Category</th><th>Stock</th><th>Min Stock</th><th>Status</th></tr></thead>
                <tbody>
                  {lowStock.map(m => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td><span className="badge purple">{m.category}</span></td>
                      <td><span style={{ fontWeight: 800, color: m.stock === 0 ? '#f43f5e' : '#f59e0b', fontSize: '1rem' }}>{m.stock}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{m.minStock}</td>
                      <td><span className={`badge ${m.stock === 0 ? 'red' : 'yellow'}`}>{m.stock === 0 ? 'Out of Stock' : 'Low'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ReceptionistDashboard({ appointments, patients }) {
  const [activeFilter, setActiveFilter] = useState(null);
  const today = new Date().toISOString().split('T')[0];
  const todayAppts = appointments.filter(a => a.date === today);
  const registeredToday = patients.filter(p => p.createdAt?.startsWith(today));
  const scheduledToday = todayAppts.filter(a => a.status === 'scheduled');

  const drillContent = () => {
    if (!activeFilter) return null;
    if (activeFilter === 'todayAppt') return { title: "📅 Today's Appointments", rows: todayAppts, type: 'appt' };
    if (activeFilter === 'totalPatient') return { title: '👥 All Patients', rows: patients, type: 'patient' };
    if (activeFilter === 'regToday') return { title: '✅ Registered Today', rows: registeredToday, type: 'patient' };
    if (activeFilter === 'scheduled') return { title: '⚡ Scheduled Today', rows: scheduledToday, type: 'appt' };
    return null;
  };
  const drill = drillContent();

  return (
    <>
      <div className="stat-grid">
        {[
          { key:'todayAppt',    icon:Calendar,  label:"Today's Appointments", value:todayAppts.length,       color:'#6366f1', bg:'#eef2ff', accent:'linear-gradient(90deg,#6366f1,#8b5cf6)' },
          { key:'totalPatient', icon:Users,     label:'Total Patients',        value:patients.length,         color:'#10b981', bg:'#ecfdf5', accent:'linear-gradient(90deg,#10b981,#059669)' },
          { key:'regToday',     icon:UserCheck, label:'Registered Today',      value:registeredToday.length,  color:'#f59e0b', bg:'#fffbeb', accent:'linear-gradient(90deg,#f59e0b,#f97316)' },
          { key:'scheduled',    icon:Zap,       label:'Scheduled Today',       value:scheduledToday.length,   color:'#8b5cf6', bg:'#f5f3ff', accent:'linear-gradient(90deg,#8b5cf6,#ec4899)' },
        ].map(({key, icon:Icon, label, value, color, bg, accent}) => (
          <div key={key} className="stat-card" style={{'--card-accent': accent, cursor:'pointer', outline: activeFilter===key ? `2px solid ${color}` : 'none'}}
            onClick={()=>setActiveFilter(activeFilter===key ? null : key)}>
            <div className="stat-icon" style={{background:bg}}><Icon size={24} color={color}/></div>
            <div className="stat-info">
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{color}}>{value}</div>
              {activeFilter===key && <div style={{fontSize:'0.65rem',color,fontWeight:700,marginTop:2}}>▼ tap to collapse</div>}
            </div>
          </div>
        ))}
      </div>

      {drill && (
        <div className="card" style={{marginBottom:20,border:'2px solid var(--border-active)'}}>
          <div className="card-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span className="card-title">{drill.title}</span>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>setActiveFilter(null)}>✕</button>
          </div>
          <div className="table-wrap">
            {drill.rows.length === 0 ? (
              <div className="empty-state" style={{padding:24}}><Calendar size={30}/><p>No records found</p></div>
            ) : drill.type === 'appt' ? (
              <table>
                <thead><tr><th>Patient</th><th>Doctor</th><th>Time</th><th>Type</th><th>Fee</th><th>Status</th></tr></thead>
                <tbody>
                  {drill.rows.map(a => (
                    <tr key={a.id}>
                      <td style={{fontWeight:700}}>{a.patientName}</td>
                      <td style={{color:'var(--text-secondary)'}}>{a.doctorName}</td>
                      <td><span style={{fontWeight:700,color:'var(--indigo)'}}>{a.time}</span></td>
                      <td><span className="badge indigo">{a.type}</span></td>
                      <td style={{color:'var(--emerald)',fontWeight:700}}>₹{(a.fee||0).toLocaleString()}</td>
                      <td><span className={`badge ${a.status==='completed'?'green':a.status==='cancelled'?'red':'yellow'}`}>{a.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table>
                <thead><tr><th>Patient</th><th>ID</th><th>Phone</th><th>Gender</th><th>Registered</th></tr></thead>
                <tbody>
                  {drill.rows.map(p => (
                    <tr key={p.id}>
                      <td style={{fontWeight:700}}>{p.name}</td>
                      <td><span style={{fontFamily:'monospace',fontSize:'0.75rem',color:'var(--indigo)',background:'var(--indigo-dim)',padding:'2px 7px',borderRadius:5}}>{p.patientId}</span></td>
                      <td style={{color:'var(--text-secondary)'}}>{p.phone||'—'}</td>
                      <td><span className="badge gray">{p.gender||'—'}</span></td>
                      <td style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>{p.createdAt?.split('T')[0]||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {!drill && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📅 Today's Appointments</span>
            <span className="badge indigo">{todayAppts.length} scheduled</span>
          </div>
          <div className="table-wrap">
            {todayAppts.length === 0 ? (
              <div className="empty-state"><Calendar size={40} /><h3>No appointments today</h3><p>Schedule appointments from the Appointments page</p></div>
            ) : (
              <table>
                <thead><tr><th>Patient</th><th>Doctor</th><th>Time</th><th>Type</th><th>Fee</th><th>Status</th></tr></thead>
                <tbody>
                  {todayAppts.map(a => (
                    <tr key={a.id}>
                      <td>{a.patientName}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{a.doctorName}</td>
                      <td><span style={{ fontWeight: 700, color: 'var(--indigo)' }}>{a.time}</span></td>
                      <td><span className="badge indigo">{a.type}</span></td>
                      <td style={{ color: 'var(--emerald)', fontWeight: 700 }}>₹{(a.fee || 0).toLocaleString()}</td>
                      <td><span className={`badge ${a.status === 'completed' ? 'green' : a.status === 'cancelled' ? 'red' : 'yellow'}`}>{a.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </>
  );
}
function LabDashboardUI() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'labTests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setTests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const testsToday = tests.filter(t => t.date === today);
  const reportsGenerated = tests.filter(t => t.status === 'completed');
  const pending = tests.filter(t => t.status === 'pending');
  const uniquePatients = [...new Set(tests.map(t => t.patientId).filter(Boolean))];

  const drillMap = {
    testsToday:  { title: "🧪 Tests Today",        rows: testsToday },
    reports:     { title: "📄 Reports Generated",  rows: reportsGenerated },
    pending:     { title: "⏳ Pending Tests",       rows: pending },
    patients:    { title: "👥 Total Patients",      rows: tests.filter((t,i,arr)=>arr.findIndex(x=>x.patientId===t.patientId)===i) },
  };
  const drill = activeFilter ? drillMap[activeFilter] : null;

  return (
    <>
      <div className="stat-grid">
        {[
          { key:'testsToday', icon:Activity, label:'Tests Today',       value: loading?'—':testsToday.length,         color:'#06b6d4', bg:'#ecfeff', accent:'linear-gradient(90deg,#06b6d4,#0ea5e9)' },
          { key:'reports',    icon:FileText, label:'Reports Generated', value: loading?'—':reportsGenerated.length,   color:'#10b981', bg:'#ecfdf5', accent:'linear-gradient(90deg,#10b981,#059669)' },
          { key:'pending',    icon:Clock,    label:'Pending Tests',     value: loading?'—':pending.length,            color:'#f59e0b', bg:'#fffbeb', accent:'linear-gradient(90deg,#f59e0b,#f97316)' },
          { key:'patients',   icon:Users,    label:'Total Patients',    value: loading?'—':uniquePatients.length,     color:'#6366f1', bg:'#eef2ff', accent:'linear-gradient(90deg,#6366f1,#8b5cf6)' },
        ].map(({key, icon:Icon, label, value, color, bg, accent}) => (
          <div key={key} className="stat-card" style={{'--card-accent': accent, cursor:'pointer', outline: activeFilter===key ? `2px solid ${color}` : 'none'}}
            onClick={()=>setActiveFilter(activeFilter===key ? null : key)}>
            <div className="stat-icon" style={{background:bg}}><Icon size={24} color={color}/></div>
            <div className="stat-info">
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{color}}>{value}</div>
              {activeFilter===key && <div style={{fontSize:'0.65rem',color,fontWeight:700,marginTop:2}}>▼ tap to collapse</div>}
            </div>
          </div>
        ))}
      </div>

      {drill && (
        <div className="card" style={{marginBottom:20,border:'2px solid var(--border-active)'}}>
          <div className="card-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span className="card-title">{drill.title}</span>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>setActiveFilter(null)}>✕</button>
          </div>
          <div className="table-wrap">
            {drill.rows.length === 0 ? (
              <div className="empty-state" style={{padding:24}}><Activity size={30}/><p>No records found</p></div>
            ) : (
              <table>
                <thead><tr><th>Invoice</th><th>Patient</th><th>Test</th><th>Type</th><th>Price</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {drill.rows.map(t => (
                    <tr key={t.id}>
                      <td><span style={{fontFamily:'monospace',fontSize:'0.75rem',color:'#6366f1',background:'var(--indigo-dim)',padding:'2px 7px',borderRadius:5}}>{t.invoiceNo||'—'}</span></td>
                      <td style={{fontWeight:700}}>{t.patientName}</td>
                      <td>{t.testName}</td>
                      <td><span className={`badge ${t.category==='Scan'?'purple':'blue'}`}>{t.category||'—'}</span></td>
                      <td style={{color:'var(--emerald)',fontWeight:700}}>₹{t.price||0}</td>
                      <td><span className={`badge ${t.status==='completed'?'green':'yellow'}`}>{t.status==='completed'?'✓ Done':'⏳ Pending'}</span></td>
                      <td style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>{t.date||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {!drill && (
        <div className="card">
          <div className="card-header"><span className="card-title">🧪 Lab Overview</span></div>
          <div className="card-body">
            <p style={{ color: 'var(--text-muted)' }}>Tap a stat card above to view details. Manage tests, upload reports, and monitor diagnostics from the Lab page.</p>
          </div>
        </div>
      )}
    </>
  );
}

export default function Dashboard() {
  const { userData } = useAuth();
  const role = userData?.role;
  const [data, setData] = useState({ summary: {}, appointments: [], medicines: [], patients: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const fetches = [
          role === 'admin' ? api.get('/finance/summary').then(r => r.data) : Promise.resolve({}),
          ['admin', 'doctor', 'receptionist'].includes(role) ? api.get('/appointments').then(r => r.data) : Promise.resolve([]),
          ['admin', 'pharmacy'].includes(role) ? api.get('/medicines').then(r => r.data) : Promise.resolve([]),
          ['admin', 'receptionist'].includes(role) ? api.get('/patients').then(r => r.data) : Promise.resolve([]),
        ];
        const [summary, appointments, medicines, patients] = await Promise.all(fetches);
        setData({ summary, appointments, medicines, patients });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (role) load();
  }, [role]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const greetingEmoji = () => {
    const h = new Date().getHours();
    if (h < 12) return '☀️';
    if (h < 17) return '👋';
    return '🌙';
  };

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
        borderRadius: 20,
        padding: '24px 28px',
        marginBottom: 28,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
      }}>
        <div style={{ position: 'absolute', right: -20, top: -20, opacity: 0.1 }}>
          <Activity size={160} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.7rem', fontWeight: 900, fontFamily: "'Outfit',sans-serif", letterSpacing: '-0.5px', marginBottom: 6 }}>
            {greeting()}, {userData?.name?.split(' ')[0]} {greetingEmoji()}
          </h2>
          <p style={{ opacity: 0.85, fontSize: '0.9rem' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Role', value: userData?.role?.toUpperCase(), icon: '🎭' },
            { label: 'System', value: 'Online', icon: '🟢' },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', borderRadius: 12, padding: '10px 18px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: '1rem', marginBottom: 2 }}>{icon} {value}</div>
              <div style={{ fontSize: '0.62rem', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)', padding: '60px 0', justifyContent: 'center', flexDirection: 'column' }}>
          <Activity size={32} className="spinning" color="var(--indigo)" />
          <p>Loading your dashboard...</p>
        </div>
      ) : (
        <>
          {role === 'admin' && <AdminDashboard summary={data.summary} />}
          {role === 'doctor' && <DoctorDashboard appointments={data.appointments} />}
          {role === 'pharmacy' && <PharmacyDashboard medicines={data.medicines} />}
          {role === 'receptionist' && <ReceptionistDashboard appointments={data.appointments} patients={data.patients} />}
          {role === 'lab' && <LabDashboardUI />}
        </>
      )}
    </div>
  );
}
