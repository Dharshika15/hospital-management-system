import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Stethoscope, Search, Activity } from 'lucide-react';

const SPECIALTY_COLORS = {
  'General Medicine': 'blue', 'Cardiology': 'red', 'Orthopedics': 'yellow',
  'Pediatrics': 'green', 'Neurology': 'purple', 'Dermatology': 'purple',
  'ENT': 'blue', 'Gynecology': 'purple', 'Surgery': 'red',
};

export default function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/users?role=doctor')
      .then(r => setDoctors(r.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = doctors.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.specialty?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Doctors</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>{doctors.length} registered doctors</p>
        </div>
        <div className="search-bar">
          <Search size={15} />
          <input placeholder="Search doctors..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {loading ? (
          <div style={{ padding: 40, color: 'var(--text-muted)', gridColumn: '1/-1', textAlign: 'center' }}><Activity size={20} className="spinning" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}><Stethoscope size={40} /><h3>No doctors found</h3></div>
        ) : filtered.map(doc => (
          <div key={doc.uid || doc.id} className="card" style={{ padding: 0 }}>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18,
                background: 'var(--green-dim)', border: '2px solid var(--green)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', fontWeight: 800, color: 'var(--green)',
                fontFamily: 'var(--font-display)', marginBottom: 14
              }}>
                {(doc.name || 'D').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <h3 style={{ fontWeight: 700, marginBottom: 4 }}>{doc.name}</h3>
              {doc.specialty && (
                <span className={`badge ${SPECIALTY_COLORS[doc.specialty] || 'blue'}`} style={{ marginBottom: 12 }}>{doc.specialty}</span>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', marginTop: 8 }}>
                {doc.phone && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>📞 {doc.phone}</div>}
                {doc.email && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>✉️ {doc.email}</div>}
                {doc.licenseNumber && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>🪪 {doc.licenseNumber}</div>}
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', justifyContent: 'center' }}>
              <span className={`badge ${doc.status === 'active' ? 'green' : 'gray'}`}>{doc.status || 'active'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
