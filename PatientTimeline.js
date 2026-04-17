import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Calendar, FileText, Pill, Receipt, Activity, User, Heart, AlertTriangle, FlaskConical } from 'lucide-react';

const EVENT_TYPES = {
  appointment:  { icon: Calendar,      color: '#6366f1', bg: '#eef2ff',  label: 'Appointment'      },
  prescription: { icon: FileText,      color: '#8b5cf6', bg: '#f5f3ff',  label: 'Prescription'     },
  dispensation: { icon: Pill,          color: '#10b981', bg: '#ecfdf5',  label: 'Medicine Dispensed'},
  invoice:      { icon: Receipt,       color: '#f59e0b', bg: '#fffbeb',  label: 'Invoice'          },
  lab:          { icon: FlaskConical,  color: '#06b6d4', bg: '#ecfeff',  label: 'Lab Test'         },
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch { return dateStr; }
}

export default function PatientTimeline({ patientId, patientName }) {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [filter, setFilter]   = useState('all');

  useEffect(() => {
    if (!patientId) return;
    const load = async () => {
      try {
        // Fetch from REST API
        const [apptRes, rxRes, patRes] = await Promise.all([
          api.get('/appointments'),
          api.get('/prescriptions'),
          api.get(`/patients/${patientId}`),
        ]);

        const appointments = apptRes.data
          .filter(a => a.patientId === patientId)
          .map(a => ({ ...a, eventType: 'appointment', eventDate: a.createdAt || a.date }));

        const prescriptions = rxRes.data
          .filter(p => p.patientId === patientId)
          .map(p => ({ ...p, eventType: 'prescription', eventDate: p.createdAt }));

        // Fetch invoices from Firestore for this patient
        const invSnap = await getDocs(query(
          collection(db, 'invoices'),
          where('patientId', '==', patientId)
        ));
        const invoices = invSnap.docs.map(d => ({
          id: d.id, ...d.data(),
          eventType: 'invoice',
          eventDate: d.data().createdAt?.toDate
            ? d.data().createdAt.toDate().toISOString()
            : d.data().createdAt,
        }));

        // Fetch lab tests from Firestore for this patient
        const labSnap = await getDocs(query(
          collection(db, 'labTests'),
          where('patientId', '==', patientId)
        ));
        const labTests = labSnap.docs.map(d => ({
          id: d.id, ...d.data(),
          eventType: 'lab',
          eventDate: d.data().createdAt,
        }));

        const allEvents = [...appointments, ...prescriptions, ...invoices, ...labTests]
          .sort((a, b) => new Date(b.eventDate || 0) - new Date(a.eventDate || 0));

        setEvents(allEvents);
        setPatient(patRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [patientId]);

  const filteredEvents = filter === 'all' ? events : events.filter(e => e.eventType === filter);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <Activity size={20} className="spinning" />
      </div>
    );
  }

  return (
    <div>
      {/* Patient Summary Card */}
      {patient && (
        <div style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          borderRadius: 16, padding: '20px 24px', marginBottom: 24,
          color: '#fff', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.3rem', fontWeight: 800, flexShrink: 0,
          }}>
            {patient.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 4 }}>{patient.name}</div>
            <div style={{ opacity: 0.8, fontSize: '0.82rem', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>ID: {patient.patientId}</span>
              <span>{patient.age} yrs · {patient.gender}</span>
              {patient.bloodGroup && <span>🩸 {patient.bloodGroup}</span>}
              <span>📞 {patient.phone}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Visits',         value: events.filter(e => e.eventType === 'appointment').length  },
              { label: 'Prescriptions',  value: events.filter(e => e.eventType === 'prescription').length },
              { label: 'Lab Tests',      value: events.filter(e => e.eventType === 'lab').length          },
              { label: 'Invoices',       value: events.filter(e => e.eventType === 'invoice').length       },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,0.15)', borderRadius: 12,
                padding: '10px 16px', textAlign: 'center', minWidth: 70,
              }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{value}</div>
                <div style={{ fontSize: '0.62rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Allergies & Medical History */}
      {patient && (patient.allergies?.length > 0 || patient.medicalHistory) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {patient.allergies?.length > 0 && (
            <div className="card" style={{ border: '1px solid rgba(244,63,94,0.2)' }}>
              <div className="card-header" style={{ background: 'rgba(244,63,94,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#f43f5e' }}>
                  <AlertTriangle size={16} /> Known Allergies
                </div>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {patient.allergies.map(a => <span key={a} className="badge red">{a}</span>)}
                </div>
              </div>
            </div>
          )}
          {patient.medicalHistory && (
            <div className="card" style={{ border: '1px solid rgba(99,102,241,0.2)' }}>
              <div className="card-header" style={{ background: 'rgba(99,102,241,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--indigo)' }}>
                  <Heart size={16} /> Medical History
                </div>
              </div>
              <div className="card-body">
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {patient.medicalHistory}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Activity size={18} color="var(--indigo)" />
        <span style={{ fontWeight: 700, fontSize: '1rem', marginRight: 8 }}>Medical History Timeline</span>
        {['all', 'appointment', 'prescription', 'lab', 'invoice'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '0.72rem', padding: '3px 10px' }}>
            {f === 'all' ? `All (${events.length})`
              : f === 'appointment' ? `📅 Visits (${events.filter(e => e.eventType === 'appointment').length})`
              : f === 'prescription' ? `💊 Rx (${events.filter(e => e.eventType === 'prescription').length})`
              : f === 'lab' ? `🧪 Lab (${events.filter(e => e.eventType === 'lab').length})`
              : `🧾 Bills (${events.filter(e => e.eventType === 'invoice').length})`}
          </button>
        ))}
      </div>

      {filteredEvents.length === 0 ? (
        <div className="empty-state">
          <Activity size={40} />
          <h3>No events in this category</h3>
          <p>Events will appear here as the patient visits</p>
        </div>
      ) : (
        <div className="timeline">
          {filteredEvents.map((event, idx) => {
            const cfg = EVENT_TYPES[event.eventType] || EVENT_TYPES.appointment;
            const Icon = cfg.icon;
            return (
              <div key={event.id || idx} className="timeline-item">
                <div className="timeline-dot" style={{ background: cfg.color, boxShadow: `0 0 0 2px ${cfg.color}` }} />
                <div className="timeline-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: cfg.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon size={15} color={cfg.color} />
                    </div>
                    <div>
                      <div className="timeline-title">{cfg.label}</div>
                      <div className="timeline-date">{formatDate(event.eventDate)}</div>
                    </div>
                    <span className="badge" style={{ marginLeft: 'auto', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                      {event.status || 'completed'}
                    </span>
                  </div>

                  {event.eventType === 'appointment' && (
                    <div className="timeline-desc">
                      <strong>Doctor:</strong> {event.doctorName} &nbsp;·&nbsp;
                      <strong>Type:</strong> {event.type} &nbsp;·&nbsp;
                      <strong>Date:</strong> {event.date} at {event.time}
                      {event.doctorNotes && (
                        <div style={{ marginTop: 6, padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 8, fontSize: '0.78rem' }}>
                          📝 {event.doctorNotes}
                        </div>
                      )}
                    </div>
                  )}

                  {event.eventType === 'prescription' && (
                    <div className="timeline-desc">
                      <strong>Doctor:</strong> {event.doctorName} &nbsp;·&nbsp;
                      <strong>Diagnosis:</strong> {event.diagnosis}
                      {event.medicines?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                          {event.medicines.map((m, i) => (
                            <span key={i} style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'var(--violet-dim)', color: 'var(--violet)', borderRadius: 99, fontWeight: 600 }}>
                              {m.medicineName} {m.dosage}
                            </span>
                          ))}
                        </div>
                      )}
                      {event.followUpDate && (
                        <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--amber)', fontWeight: 600 }}>
                          📅 Follow-up: {event.followUpDate}
                        </div>
                      )}
                    </div>
                  )}

                  {event.eventType === 'lab' && (
                    <div className="timeline-desc">
                      <strong>Test:</strong> {event.testName} &nbsp;·&nbsp;
                      <strong>Type:</strong> {event.category || '—'} &nbsp;·&nbsp;
                      <strong>Price:</strong> ₹{event.price || 0}
                      <div style={{ marginTop: 4 }}>
                        <span className={`badge ${event.status === 'completed' ? 'green' : 'yellow'}`}>
                          {event.status === 'completed' ? '✓ Report Ready' : '⏳ Pending'}
                        </span>
                        {event.invoiceNo && (
                          <span style={{ marginLeft: 8, fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--indigo)' }}>
                            {event.invoiceNo}
                          </span>
                        )}
                      </div>
                      {event.resultText && (
                        <div style={{ marginTop: 6, padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 8, fontSize: '0.78rem', whiteSpace: 'pre-wrap' }}>
                          📋 {event.resultText}
                        </div>
                      )}
                    </div>
                  )}

                  {event.eventType === 'invoice' && (
                    <div className="timeline-desc">
                      <strong>Invoice:</strong> {event.invoiceNumber} &nbsp;·&nbsp;
                      <strong>Amount:</strong> <span style={{ color: '#10b981', fontWeight: 700 }}>₹{(event.finalAmount || 0).toLocaleString()}</span>
                      {event.discount > 0 && <span style={{ color: 'var(--rose)', marginLeft: 8 }}>(-₹{event.discount})</span>}
                      &nbsp;·&nbsp;<strong>Via:</strong> {event.paymentMethod}
                      {event.items?.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {event.items.map((it, i) => (
                            <span key={i} style={{ marginRight: 8 }}>• {it.description} ₹{it.amount}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
