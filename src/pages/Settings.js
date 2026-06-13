import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, API } from '../api';

// ── Design tokens — matches Hub/HuntTracker ───────────────────────
const C = {
  bg:'#161618', sur:'#222226', card:'#26262a', lift:'#2c2c32',
  bdr:'rgba(255,255,255,0.15)', bb:'rgba(255,255,255,0.28)',
  gold:'#c6f135', green:'#4ade80', red:'#f87171',
  txt:'#ffffff', txt2:'#e8e8e8', label:'#b0b0b0', faint:'#808080',
  font:"'Chakra Petch',sans-serif",
};

const inp = {
  background: C.sur, border: `1px solid ${C.bdr}`, borderRadius: 4,
  padding: '0 14px', fontFamily: C.font, fontSize: 15, color: C.txt,
  width: '100%', height: 44, outline: 'none', boxSizing: 'border-box',
};

/* ── Slot autocomplete (reuses the API) ─────────────────────────── */
let _settingsSlotsCache = [];
let _settingsSlotsFetch = null;
function fetchSettingsSlots() {
  if (_settingsSlotsCache.length) return Promise.resolve(_settingsSlotsCache);
  if (_settingsSlotsFetch) return _settingsSlotsFetch;
  _settingsSlotsFetch = apiFetch('/api/slots/search?q=&limit=9999')
    .then(res => {
      if (Array.isArray(res)) {
        _settingsSlotsCache = res.map(s => ({
          name: s.name,
          thumb: s.thumb?.startsWith('/api/img-proxy') ? `${API}${s.thumb}` : s.thumb || null,
          slug: s.slug || null, provider: s.provider || null,
        }));
      }
      return _settingsSlotsCache;
    })
    .catch(() => []);
  return _settingsSlotsFetch;
}

function SlotAutocomplete({ value, onChange, onSelect, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen]               = useState(false);
  const [allSlots, setAllSlots]       = useState(_settingsSlotsCache);
  const allRef = { current: allSlots };

  useEffect(() => {
    fetchSettingsSlots().then(slots => {
      setAllSlots(slots);
      allRef.current = slots;
    });
  }, []);

  const search = useCallback(v => {
    if (v.length < 2) { setSuggestions([]); setOpen(false); return; }
    const q = v.toLowerCase();
    const pool = allRef.current.length ? allRef.current : allSlots;
    const filtered = pool.filter(s => s.name.toLowerCase().includes(q));
    filtered.sort((a,b) => {
      const as = a.name.toLowerCase().startsWith(q), bs = b.name.toLowerCase().startsWith(q);
      if (as && !bs) return -1; if (!as && bs) return 1;
      return a.name.localeCompare(b.name);
    });
    setSuggestions(filtered.slice(0, 10));
    setOpen(filtered.length > 0);
  }, [allSlots]);

  const pick = s => { onChange(s.name); onSelect(s); setSuggestions([]); setOpen(false); };

  return (
    <div style={{ position: 'relative' }}>
      <input value={value} onChange={e => { onChange(e.target.value); search(e.target.value); }}
        onFocus={() => search(value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => { if (e.key === 'Enter' && suggestions[0]) pick(suggestions[0]); }}
        placeholder={placeholder || 'Search slot…'}
        style={inp} />
      {open && suggestions.length > 0 && (
        <div style={{ position:'absolute', top:'calc(100% + 2px)', left:0, right:0,
          background: C.card, border:`1px solid ${C.bb}`, borderRadius:4,
          zIndex:60, maxHeight:220, overflowY:'auto' }}>
          {suggestions.map((s, i) => (
            <div key={i} onMouseDown={() => pick(s)}
              style={{ padding:'7px 12px', display:'flex', alignItems:'center', gap:10,
                fontFamily: C.font, fontSize:13, color:C.txt2, cursor:'pointer',
                borderBottom:`1px solid ${C.bdr}` }}
              onMouseEnter={e => e.currentTarget.style.background = C.lift}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {s.thumb
                ? <img src={s.thumb} width={36} height={27} style={{borderRadius:3,objectFit:'cover',flexShrink:0}} onError={e=>e.target.style.display='none'} alt="" />
                : <div style={{width:36,height:27,borderRadius:3,background:C.sur,flexShrink:0}}/>}
              <span>{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Settings page ─────────────────────────────────────────── */
export default function Settings({ user }) {
  const navigate = useNavigate();
  const [rainbetName,    setRainbetName]    = useState('');
  const [preferredSlots, setPreferredSlots] = useState(Array(8).fill(null)); // [{name,thumb,slug,provider}|null]
  const [slotInputs,     setSlotInputs]     = useState(Array(8).fill(''));
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [saved,          setSaved]          = useState(false);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    apiFetch('/api/settings')
      .then(data => {
        setRainbetName(data.rainbetName || '');
        const slots = Array(8).fill(null);
        const inputs = Array(8).fill('');
        (data.preferredSlots || []).forEach((s, i) => {
          if (s && i < 8) {
            slots[i] = s;
            inputs[i] = s.name || '';
          }
        });
        setPreferredSlots(slots);
        setSlotInputs(inputs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const setSlot = (i, slotObj) => {
    setPreferredSlots(prev => { const n=[...prev]; n[i]=slotObj; return n; });
  };
  const setInput = (i, v) => {
    setSlotInputs(prev => { const n=[...prev]; n[i]=v; return n; });
    if (!v.trim()) setSlot(i, null);
  };
  const clearSlot = i => { setSlot(i, null); setInput(i, ''); };

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          rainbetName,
          preferredSlots: preferredSlots.filter(Boolean),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch(e) {
      alert(e.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;
  if (loading) return (
    <div style={{background:C.bg,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:C.font,color:C.faint}}>
      Loading settings…
    </div>
  );

  return (
    <div style={{ background:C.bg, minHeight:'100vh', fontFamily:C.font, color:C.txt }}>
      <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{ background:C.sur, borderBottom:`1px solid ${C.bdr}`, padding:'14px 24px',
        display:'flex', alignItems:'center', gap:14 }}>
        <button onClick={() => navigate('/')} style={{ background:'transparent', border:'none',
          color:C.label, cursor:'pointer', fontFamily:C.font, fontSize:13, padding:'4px 8px',
          borderRadius:3, letterSpacing:'0.04em' }}
          onMouseEnter={e=>e.target.style.color=C.txt}
          onMouseLeave={e=>e.target.style.color=C.label}>
          ← Hub
        </button>
        <div style={{ width:1, height:18, background:C.bdr }}/>
        <span style={{ fontSize:16, fontWeight:700, letterSpacing:'0.06em', color:C.txt }}>Settings</span>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
          {user.avatar
            ? <img src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32`}
                width={28} height={28} style={{borderRadius:'50%'}} alt=""/>
            : <div style={{width:28,height:28,borderRadius:'50%',background:C.sur,border:`1px solid ${C.bdr}`}}/>}
          <span style={{ fontSize:13, color:C.label }}>{user.displayName || user.username}</span>
        </div>
      </div>

      <div style={{ maxWidth:640, margin:'0 auto', padding:'32px 20px', display:'flex', flexDirection:'column', gap:28 }}>

        {/* ── Rainbet Name ── */}
        <section style={{ background:C.card, border:`1px solid ${C.bdr}`, borderRadius:8, padding:24 }}>
          <div style={{ fontSize:13, fontWeight:700, letterSpacing:'0.1em', color:C.gold, marginBottom:6 }}>RAINBET ACCOUNT</div>
          <div style={{ fontSize:12, color:C.label, marginBottom:14, lineHeight:1.5 }}>
            Your Rainbet username. Used to match you to the leaderboard and for hunt tracking.
          </div>
          <input value={rainbetName} onChange={e => setRainbetName(e.target.value)}
            placeholder="Your Rainbet username"
            style={inp} />
        </section>

        {/* ── Preferred Slots ── */}
        <section style={{ background:C.card, border:`1px solid ${C.bdr}`, borderRadius:8, padding:24 }}>
          <div style={{ fontSize:13, fontWeight:700, letterSpacing:'0.1em', color:C.gold, marginBottom:6 }}>PREFERRED SLOT CALLS</div>
          <div style={{ fontSize:12, color:C.label, marginBottom:16, lineHeight:1.5 }}>
            Up to 8 slots. Whenever you're added to equity in a hunt, these will automatically be added to the slot call queue (no duplicates).
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {Array(8).fill(null).map((_, i) => {
              const slot = preferredSlots[i];
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:12, color:C.faint, fontWeight:700, width:18, textAlign:'right', flexShrink:0 }}>{i+1}</span>
                  {slot?.thumb
                    ? <img src={slot.thumb} width={44} height={33} style={{borderRadius:4,objectFit:'cover',flexShrink:0,border:`1px solid ${C.bdr}`}} onError={e=>e.target.style.display='none'} alt=""/>
                    : <div style={{width:44,height:33,borderRadius:4,background:C.sur,border:`1px solid ${C.bdr}`,flexShrink:0}}/>}
                  <div style={{ flex:1 }}>
                    <SlotAutocomplete
                      value={slotInputs[i]}
                      onChange={v => setInput(i, v)}
                      onSelect={s => setSlot(i, s)}
                      placeholder={`Slot ${i+1}…`}
                    />
                  </div>
                  {slot && (
                    <button onClick={() => clearSlot(i)} style={{ background:'transparent', border:'none',
                      color:C.label, cursor:'pointer', fontSize:16, padding:'0 4px', flexShrink:0 }}
                      title="Clear">×</button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Leaderboard ── */}
        <section style={{ background:C.card, border:`1px solid ${C.bdr}`, borderRadius:8, padding:24 }}>
          <div style={{ fontSize:13, fontWeight:700, letterSpacing:'0.1em', color:C.gold, marginBottom:6 }}>BEAN LEADERBOARD</div>
          <div style={{ fontSize:12, color:C.label, marginBottom:16, lineHeight:1.5 }}>
            View your current leaderboard position, weighted wager, and reward tiers on Bean's website.
            You must be logged in to beantwitch.com to see your personal stats.
          </div>
          <a href="https://beantwitch.com/rewards" target="_blank" rel="noopener noreferrer"
            style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 20px',
              background:'rgba(198,241,53,0.1)', border:`1px solid ${C.gold}`, borderRadius:5,
              color:C.gold, fontFamily:C.font, fontSize:13, fontWeight:700,
              textDecoration:'none', letterSpacing:'0.05em', transition:'background .15s' }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(198,241,53,0.2)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(198,241,53,0.1)'}>
            <span>🫘</span>
            View My Leaderboard Stats →
          </a>
          {rainbetName && (
            <div style={{ marginTop:14, display:'flex', alignItems:'center', gap:10 }}>
              <a href={`https://beantwitch.com/rewards`} target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 20px',
                  background:'rgba(26,157,90,0.1)', border:'1px solid rgba(26,157,90,0.5)', borderRadius:5,
                  color:'#4ade80', fontFamily:C.font, fontSize:13, fontWeight:700,
                  textDecoration:'none', letterSpacing:'0.05em', transition:'background .15s' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(26,157,90,0.2)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(26,157,90,0.1)'}>
                <span style={{fontSize:16,lineHeight:1}}>🎰</span>
                View Rainbet Profile ({rainbetName}) →
              </a>
            </div>
          )}
        </section>

        {/* ── Save button ── */}
        <button onClick={save} disabled={saving}
          style={{ height:48, background: saved ? C.green : C.gold, color:'#000',
            border:'none', borderRadius:5, fontFamily:C.font, fontSize:15, fontWeight:700,
            cursor: saving ? 'not-allowed' : 'pointer', letterSpacing:'0.06em',
            transition:'background .2s', opacity: saving ? 0.7 : 1 }}>
          {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
