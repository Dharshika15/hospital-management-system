import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Calendar, X, Activity, Plus } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const DOC_COLORS = [
  { color: '#6366f1', bg: '#eef2ff' },
  { color: '#10b981', bg: '#f0fdf4' },
  { color: '#f59e0b', bg: '#fffbeb' },
  { color: '#f43f5e', bg: '#fff1f2' },
  { color: '#8b5cf6', bg: '#f5f3ff' },
  { color: '#06b6d4', bg: '#ecfeff' },
  { color: '#ec4899', bg: '#fdf2f8' },
  { color: '#f97316', bg: '#fff7ed' },
];

// Returns array of Date objects for all days in the given month/year
function getDaysInMonth(year, month) {
  const days = [];
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  // Pad start
  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

function toYMD(date) {
  return date.toISOString().split('T')[0];
}


export default function LeaveCalendar() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [doctors,     setDoctors]     = useState([]);
  const [leaveMap,    setLeaveMap]    = useState({}); // { 'doctorId': ['2025-04-10', ...] }
  const [selectedDay, setSelectedDay] = useState(null); // Date object
  const [filterDoc,   setFilterDoc]   = useState('all');

  const loadDoctors = async () => {
    try {
      const res = await api.get('/users?role=doctor');
      setDoctors(res.data);
    } catch {}
  };

  const loadLeaves = async (docs) => {
    const map = {};
    await Promise.all((docs || doctors).map(async d => {
      const id = d.uid || d.id;
      try {
        const snap = await getDoc(doc(db, 'doctorLeaves', id));
        map[id] = snap.exists() ? (snap.data().leaves || []).map(l => l.date) : [];
      } catch { map[id] = []; }
    }));
    setLeaveMap(map);
  };

  useEffect(() => {
    loadDoctors().then(() => {});
  }, []);

  useEffect(() => {
    if (doctors.length) loadLeaves(doctors);
  }, [doctors]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const days = getDaysInMonth(year, month);
  const today = toYMD(now);

  // color map per doctor
  const docColor = {};
  doctors.forEach((d, i) => { docColor[d.uid || d.id] = DOC_COLORS[i % DOC_COLORS.length]; });

  // For a given date string, which doctors are on leave?
  const leavesOnDate = (dateStr) => {
    return doctors.filter(d => {
      const id = d.uid || d.id;
      if (filterDoc !== 'all' && id !== filterDoc) return false;
      return (leaveMap[id] || []).includes(dateStr);
    });
  };

  // Doctors on leave for selected day
  const selectedStr = selectedDay ? toYMD(selectedDay) : null;
  const selectedLeaves = selectedStr ? leavesOnDate(selectedStr) : [];

  // Summary stats
  const thisMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const totalLeaveDays = doctors.reduce((sum, d) => {
    const id = d.uid || d.id;
    return sum + (leaveMap[id] || []).filter(dt => dt.startsWith(thisMonthStr)).length;
  }, 0);


  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">📅 Doctor Leave Calendar</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
            {totalLeaveDays} leave days this month
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="form-select" style={{ width: 180 }} value={filterDoc}
            onChange={e => setFilterDoc(e.target.value)}>
            <option value="all">All Doctors</option>
            {doctors.map(d => (
              <option key={d.uid || d.id} value={d.uid || d.id}>{d.name}</option>
            ))}
          </select>

        </div>
      </div>

      {/* Doctor Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {doctors.filter(d => filterDoc === 'all' || (d.uid || d.id) === filterDoc).map(d => {
          const id = d.uid || d.id;
          const c  = docColor[id] || DOC_COLORS[0];
          const monthLeaves = (leaveMap[id] || []).filter(dt => dt.startsWith(thisMonthStr)).length;
          return (
            <div key={id} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '5px 12px', borderRadius: 20,
              background: c.bg, border: `1.5px solid ${c.color}44`,
              fontSize: '0.78rem', fontWeight: 600, color: c.color,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
              {d.name}
              {monthLeaves > 0 && (
                <span style={{ background: c.color, color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: '0.68rem' }}>
                  {monthLeaves}d
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Calendar */}
        <div className="card">
          {/* Month Nav */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button className="btn btn-ghost btn-icon" onClick={prevMonth}><ChevronLeft size={18} /></button>
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>{MONTHS[month]} {year}</span>
            <button className="btn btn-ghost btn-icon" onClick={nextMonth}><ChevronRight size={18} /></button>
          </div>

          {/* Day Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '10px 16px 0' }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day Cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, padding: '4px 16px 16px' }}>
            {days.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} />;
              const dateStr   = toYMD(date);
              const isToday   = dateStr === today;
              const isSelected = selectedStr === dateStr;
              const onLeave   = leavesOnDate(dateStr);
              const isSunday  = date.getDay() === 0;

              return (
                <div key={dateStr}
                  onClick={() => setSelectedDay(date)}
                  style={{
                    minHeight: 64, borderRadius: 10, padding: '6px 5px',
                    cursor: 'pointer', position: 'relative',
                    background: isSelected ? 'var(--indigo-dim)' : isToday ? '#f0fdf4' : 'transparent',
                    border: isSelected ? '2px solid var(--indigo)' : isToday ? '2px solid #10b981' : '1px solid transparent',
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday ? '#f0fdf4' : 'transparent'; }}
                >
                  <div style={{
                    textAlign: 'center', fontSize: '0.8rem', fontWeight: isToday ? 800 : 600,
                    color: isToday ? '#10b981' : isSunday ? '#f43f5e' : 'var(--text-primary)',
                    marginBottom: 4,
                  }}>
                    {date.getDate()}
                  </div>
                  {/* Leave dots */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                    {onLeave.slice(0, 4).map(d => {
                      const id = d.uid || d.id;
                      const c  = docColor[id] || DOC_COLORS[0];
                      return (
                        <div key={id} title={d.name}
                          style={{ width: 7, height: 7, borderRadius: '50%', background: c.color }} />
                      );
                    })}
                    {onLeave.length > 4 && (
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: '7px' }}>+{onLeave.length - 4}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Selected Day Detail */}
          <div className="card" style={{ flex: 1 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                {selectedDay
                  ? selectedDay.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
                  : 'Select a day'}
              </div>
            </div>
            <div style={{ padding: '14px 18px' }}>
              {!selectedDay ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Click on any date to see leave details.</p>
              ) : selectedLeaves.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  <Calendar size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <p>All doctors available</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
                    On Leave ({selectedLeaves.length})
                  </div>
                  {selectedLeaves.map(d => {
                    const id = d.uid || d.id;
                    const c  = docColor[id] || DOC_COLORS[0];
                    const leaveEntry = (leaveMap[id] || []).find ? null : null;
                    return (
                      <div key={id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', borderRadius: 10,
                        background: c.bg, border: `1px solid ${c.color}44`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: c.color }}>{d.name}</div>
                            {d.specialty && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{d.specialty}</div>}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* This Month Summary */}
          <div className="card">
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.9rem' }}>
              {MONTHS[month]} Summary
            </div>
            <div style={{ padding: '10px 18px 14px' }}>
              {doctors.filter(d => filterDoc === 'all' || (d.uid || d.id) === filterDoc).map(d => {
                const id = d.uid || d.id;
                const c  = docColor[id] || DOC_COLORS[0];
                const count = (leaveMap[id] || []).filter(dt => dt.startsWith(thisMonthStr)).length;
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{d.name}</span>
                    </div>
                    <span style={{
                      padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700,
                      background: count > 0 ? c.bg : 'var(--bg-secondary)',
                      color: count > 0 ? c.color : 'var(--text-muted)',
                    }}>
                      {count > 0 ? `${count} day${count > 1 ? 's' : ''}` : 'No leaves'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
