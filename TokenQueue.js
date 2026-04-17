import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import {
  collection, doc, onSnapshot, updateDoc, query, orderBy
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Clock, Zap, CheckCircle, Users, Activity, Volume2, VolumeX } from 'lucide-react';

// ===== ✅ AUDIO ANNOUNCEMENT HOOK =====
function useTokenAnnouncement() {
  const [audioEnabled, setAudioEnabled] = useState(true);
  // useRef-ல store பண்றோம் — re-render-ல stale ஆகாது
  const audioEnabledRef = useRef(true);

  // audioEnabled state மாறும்போது ref-யும் sync பண்ணு
  const setAudio = (val) => {
    audioEnabledRef.current = val;
    setAudioEnabled(val);
  };

  const announce = (tokenNumber, patientName) => {
    if (!audioEnabledRef.current) return;
    if (!window.speechSynthesis) return;

    const voices = window.speechSynthesis.getVoices();
    // Microsoft David — offline voice, responds correctly to rate changes in Edge
    const preferred = voices.find(v => v.name === 'Microsoft David - English (United States)')
      || voices.find(v => v.localService && v.lang.startsWith('en'))
      || voices[0];

    // Part 1: Token number — fast
    window._tokenU1 = new SpeechSynthesisUtterance(`Token number ${tokenNumber}.`);
    window._tokenU1.voice = preferred;
    window._tokenU1.rate = 1.8;
    window._tokenU1.pitch = 1;
    window._tokenU1.volume = 1;

    // Part 2: Patient name + instruction — slightly slower
    window._tokenU2 = new SpeechSynthesisUtterance(`${patientName}, please proceed to the consultation room.`);
    window._tokenU2.voice = preferred;
    window._tokenU2.rate = 1.4;
    window._tokenU2.pitch = 1;
    window._tokenU2.volume = 1;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(window._tokenU1);
    window.speechSynthesis.speak(window._tokenU2);
  };

  return { audioEnabled, setAudioEnabled: setAudio, announce };
}

export default function TokenQueue() {
  const [tokens, setTokens] = useState([]);
  const [statFilter, setStatFilter] = useState(null);
  const { audioEnabled, setAudioEnabled, announce } = useTokenAnnouncement(); // ✅

  useEffect(() => {
    const q = query(collection(db, 'tokens'), orderBy('createdAt'));
    return onSnapshot(q, snap => {
      const today = new Date().toDateString();
      const todayTokens = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(t => t.createdAt && new Date(t.createdAt).toDateString() === today);
      setTokens(todayTokens);
    });
  }, []);

  const callToken = async (t) => {
    announce(t.tokenNumber, t.patientName); // 🔊 BEFORE await — user gesture context
    toast.success(`🔔 Calling Token #${t.tokenNumber} — ${t.patientName}`);
    await updateDoc(doc(db, 'tokens', t.id), { status: 'called' });
  };

  const completeToken = async (t) => {
    await updateDoc(doc(db, 'tokens', t.id), { status: 'done' });
    toast.success(`Completed ${t.tokenNumber}`);
  };

  const waiting = tokens.filter(t => t.status === 'waiting');
  const active  = tokens.filter(t => t.status === 'called');
  const done    = tokens.filter(t => t.status === 'done');

  const statDrillRows = statFilter === 'waiting'  ? waiting
    : statFilter === 'active'   ? active
    : statFilter === 'done'     ? done
    : statFilter === 'total'    ? tokens
    : null;

  const statDrillTitle = statFilter === 'waiting' ? '⏳ Waiting Tokens'
    : statFilter === 'active'  ? '🔔 Now Being Served'
    : statFilter === 'done'    ? '✅ Completed Tokens'
    : statFilter === 'total'   ? '🎫 All Tokens'
    : '';

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">🎫 Token Queue</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
            {tokens.length} tokens today · {waiting.length} waiting
          </p>
        </div>

        {/* ✅ Audio toggle button */}
        <button
          className={`btn ${audioEnabled ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => {
            setAudioEnabled(prev => !prev);
            toast(audioEnabled ? '🔇 Announcements muted' : '🔊 Announcements enabled', { icon: audioEnabled ? '🔇' : '🔊' });
          }}
          title={audioEnabled ? 'Mute announcements' : 'Enable announcements'}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {audioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          {audioEnabled ? 'Audio On' : 'Audio Off'}
        </button>
      </div>

      {/* ✅ Audio status banner */}
      <div style={{
        marginBottom: 16,
        padding: '10px 16px',
        borderRadius: 10,
        background: audioEnabled ? 'var(--emerald-dim)' : 'var(--amber-dim)',
        border: `1px solid ${audioEnabled ? 'var(--emerald)' : 'var(--amber)'}`,
        fontSize: '0.82rem',
        fontWeight: 600,
        color: audioEnabled ? 'var(--emerald)' : 'var(--amber)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        {audioEnabled
          ? '🔊 Audio announcements are ON — patients will be called out loud when you press "Call"'
          : '🔇 Audio announcements are OFF — press "Audio Off" to re-enable'}
      </div>

      {/* Stat Cards */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          { key: 'waiting', label: 'Waiting',    value: waiting.length, icon: Clock,       color: 'var(--amber)',   bg: 'var(--amber-dim)',   accent: 'linear-gradient(90deg,#f59e0b,#f97316)' },
          { key: 'active',  label: 'Now Serving',value: active.length,  icon: Activity,    color: 'var(--indigo)',  bg: 'var(--indigo-dim)',  accent: 'linear-gradient(90deg,#6366f1,#8b5cf6)' },
          { key: 'done',    label: 'Completed',  value: done.length,    icon: CheckCircle, color: 'var(--emerald)', bg: 'var(--emerald-dim)', accent: 'linear-gradient(90deg,#10b981,#059669)' },
          { key: 'total',   label: 'Total Today', value: tokens.length,  icon: Users,       color: 'var(--violet)',  bg: 'var(--violet-dim)',  accent: 'linear-gradient(90deg,#8b5cf6,#ec4899)' },
        ].map(({ key, label, value, icon: Icon, color, bg, accent }) => (
          <div key={key} className="stat-card"
            style={{ '--card-accent': accent, cursor: 'pointer', outline: statFilter === key ? `2px solid ${color}` : 'none' }}
            onClick={() => setStatFilter(statFilter === key ? null : key)}>
            <div className="stat-icon" style={{ background: bg }}><Icon size={22} color={color} /></div>
            <div className="stat-info">
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ color }}>{value}</div>
              {statFilter === key && <div style={{ fontSize: '0.65rem', color, fontWeight: 700, marginTop: 2 }}>▼ tap to collapse</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Stat drill-down table */}
      {statDrillRows && (
        <div className="card" style={{ marginBottom: 20, border: '2px solid var(--border-active)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">{statDrillTitle}</span>
            <span className="badge indigo">{statDrillRows.length}</span>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setStatFilter(null)}>✕</button>
          </div>
          <div className="table-wrap">
            {statDrillRows.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}><Clock size={30} /><p>No tokens in this category</p></div>
            ) : (
              <table>
                <thead>
                  <tr><th>Token #</th><th>Patient</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {statDrillRows.map(t => (
                    <tr key={t.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 800, color: 'var(--indigo)', background: 'var(--indigo-dim)', padding: '3px 10px', borderRadius: 6 }}>
                          #{t.tokenNumber}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{t.patientName}</td>
                      <td>
                        <span className={`badge ${t.status === 'done' ? 'green' : t.status === 'called' ? 'blue' : 'yellow'}`}>
                          {t.status === 'done' ? '✅ Done' : t.status === 'called' ? '🔔 Serving' : '⏳ Waiting'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {t.status === 'waiting' && (
                            <button className="btn btn-sm btn-primary" onClick={() => callToken(t)}>
                              <Zap size={12} /> Call
                            </button>
                          )}
                          {t.status === 'called' && (
                            <button className="btn btn-sm btn-success" onClick={() => completeToken(t)}
                              style={{ background: '#10b981', borderColor: '#10b981', color: '#fff' }}>
                              <CheckCircle size={12} /> Done
                            </button>
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
      )}

      {/* Active — Now Serving */}
      {!statDrillRows && active.length > 0 && (
        <div className="card" style={{ marginBottom: 20, border: '2px solid var(--indigo-dim)' }}>
          <div className="card-header">
            <span className="card-title">🔔 Now Serving</span>
            <span className="badge blue">{active.length}</span>
          </div>
          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {active.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--indigo-dim)', borderRadius: 12, border: '1.5px solid var(--border-active)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 900, color: 'var(--indigo)' }}>#{t.tokenNumber}</span>
                  <div>
                    <div style={{ fontWeight: 700 }}>{t.patientName}</div>
                    <span className="badge blue" style={{ marginTop: 2 }}>🔔 Serving</span>
                  </div>
                </div>
                <button className="btn btn-success btn-sm" onClick={() => completeToken(t)}
                  style={{ background: '#10b981', borderColor: '#10b981', color: '#fff' }}>
                  <CheckCircle size={14} /> Mark Done
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waiting Queue */}
      {!statDrillRows && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title"><Clock size={16} style={{ display: 'inline', marginRight: 6 }} />Waiting Queue</span>
            <span className="badge yellow">{waiting.length}</span>
          </div>
          {waiting.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <Clock size={36} />
              <h3>Queue is empty</h3>
              <p style={{ color: 'var(--text-muted)' }}>No patients waiting right now.</p>
            </div>
          ) : (
            <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {waiting.map((t, idx) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--amber-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: 'var(--amber)' }}>
                      {idx + 1}
                    </div>
                    <span style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)' }}>#{t.tokenNumber}</span>
                    <div style={{ fontWeight: 700 }}>{t.patientName}</div>
                  </div>
                  {/* ✅ Call button triggers audio announcement */}
                  <button className="btn btn-primary btn-sm" onClick={() => callToken(t)}>
                    <Zap size={13} /> {audioEnabled ? '🔊 Call' : 'Call'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Done */}
      {!statDrillRows && done.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title"><CheckCircle size={15} style={{ display: 'inline', marginRight: 6 }} />Completed Today</span>
            <span className="badge green">{done.length}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Token #</th><th>Patient</th><th>Status</th></tr></thead>
              <tbody>
                {done.map(t => (
                  <tr key={t.id}>
                    <td><span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--emerald)' }}>#{t.tokenNumber}</span></td>
                    <td style={{ fontWeight: 600 }}>{t.patientName}</td>
                    <td><span className="badge green">✅ Done</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
