import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { ClipboardList, Search, Activity, RefreshCw } from 'lucide-react';

const ACTION_BADGES = {
  USER_CREATED: 'blue',
  PATIENT_REGISTERED: 'green',
  APPOINTMENT_CREATED: 'yellow',
  PRESCRIPTION_CREATED: 'purple',
  MEDICINE_ADDED: 'purple',
};

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/logs');
      setLogs(res.data);
    } catch { toast.error('Failed to load logs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = logs.filter(l =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.targetName?.toLowerCase().includes(search.toLowerCase()) ||
    l.performedByName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Activity Logs</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>System audit trail</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-bar">
            <Search size={15} />
            <input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-secondary" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}><Activity size={20} className="spinning" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><ClipboardList size={40} /><h3>No logs found</h3></div>
          ) : (
            <table>
              <thead><tr><th>Action</th><th>Target</th><th>Performed By</th><th>Timestamp</th></tr></thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id}>
                    <td><span className={`badge ${ACTION_BADGES[l.action] || 'gray'}`}>{l.action?.replace(/_/g, ' ')}</span></td>
                    <td style={{ fontWeight: 500 }}>{l.targetName || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{l.performedByName || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(l.timestamp).toLocaleString('en-IN')}
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
