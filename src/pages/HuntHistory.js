import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';

const G = {
  bg: '#161618', bg2: '#1c1c1f', sur: '#222226', card: '#26262a', lift: '#2c2c32',
  gold: '#c6f135', green: '#4ade80', red: '#f87171', purple: '#c084fc',
  t1: '#ffffff', t2: '#e8e8e8', t3: '#b0b0b0', t4: '#808080', bdr: '#333',
  display: 'Chakra Petch, sans-serif'
};

const fmt = n => '$' + n.toFixed(2);

const calculateSlotStats = hunts => {
  const stats = {};
  hunts.forEach(h => {
    if (!h.bonuses) return;
    h.bonuses.forEach(b => {
      const slot = b.slot || 'Unknown';
      if (!stats[slot]) stats[slot] = {name: slot, bonusCount: 0, multipliers: []};
      stats[slot].bonusCount++;
      const mult = b.multiplier ? parseFloat(b.multiplier) : 0;
      if (mult > 0) stats[slot].multipliers.push(mult);
    });
  });
  return stats;
};

const calculateMitchSlotStats = mitchHunts => calculateSlotStats(mitchHunts);
const calculateCdewSlotStats = cdewHunts => calculateSlotStats(cdewHunts);

const getFilteredSlots = (stats, filter) => {
  const slots = Object.values(stats);
  slots.sort((a, b) => {
    const avgA = a.multipliers.length ? a.multipliers.reduce((x, y) => x + y) / a.multipliers.length : 0;
    const avgB = b.multipliers.length ? b.multipliers.reduce((x, y) => x + y) / b.multipliers.length : 0;
    return filter === 'worst' ? avgA - avgB : avgB - avgA;
  });
  return filter === 'all' ? slots : slots.slice(0, 100);
};

export default function HuntHistory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [hunts, setHunts] = useState([]);
  const [slotStats, setSlotStats] = useState({});
  const [mitchSlotStats, setMitchSlotStats] = useState({});
  const [cdewSlotStats, setCdewSlotStats] = useState({});
  const [view, setView] = useState('your');
  const [yourFilter, setYourFilter] = useState('best');
  const [mitchFilter, setMitchFilter] = useState('best');
  const [cdewFilter, setCdewFilter] = useState('best');

  useEffect(() => {
    const loadData = async () => {
      try {
        const me = await apiFetch('/api/user');
        if (me) {
          setUser(me);
          const myHunts = await apiFetch('/api/my-hunts');
          if (myHunts) {
            setHunts(myHunts);
            setSlotStats(calculateSlotStats(myHunts));
          }
        }
      } catch (e) { console.error('Load user:', e); }

      try {
        const res = await apiFetch('/api/admin/mitch-hunts');
        if (res && res.hunts && res.hunts.length > 0) {
          setMitchSlotStats(calculateMitchSlotStats(res.hunts));
        } else {
          await apiFetch('/api/admin/fetch-and-import-mitch-hunts', {method: 'POST'});
          const retry = await apiFetch('/api/admin/mitch-hunts');
          if (retry && retry.hunts) setMitchSlotStats(calculateMitchSlotStats(retry.hunts));
        }
      } catch (e) { console.error('Load Mitch:', e); }

      try {
        const res = await apiFetch('/api/admin/cdew-hunts');
        if (res && res.hunts && res.hunts.length > 0) {
          setCdewSlotStats(calculateCdewSlotStats(res.hunts));
        } else {
          await apiFetch('/api/admin/fetch-and-import-cdew-hunts', {method: 'POST'});
          const retry = await apiFetch('/api/admin/cdew-hunts');
          if (retry && retry.hunts) setCdewSlotStats(calculateCdewSlotStats(retry.hunts));
        }
      } catch (e) { console.error('Load Cdew:', e); }

      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) return (
    <div style={{background:G.bg, minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:G.display, color:G.t1}}>
      Loading...
    </div>
  );

  return (
    <div style={{background:G.bg, minHeight:'100vh', color:G.t1, fontFamily:G.display, padding:'2rem'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem'}}>
        <h1 style={{margin:0, fontSize:'2rem', fontWeight:700}}>📊 Hunt History</h1>
        <button onClick={() => navigate('/hunt')} style={{padding:'8px 16px', background:G.gold, color:'#111111', border:'none', borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer'}}>← Back to Hunt</button>
      </div>

      <div style={{display:'flex', gap:'1rem', marginBottom:'2rem', flexWrap:'wrap'}}>
        {user && <button onClick={() => setView('your')} style={{padding:'10px 20px', background:view==='your'?G.gold:'transparent', color:view==='your'?'#111111':G.t1, border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer'}}>👤 Your Slots</button>}
        {Object.keys(mitchSlotStats).length > 0 && <button onClick={() => setView('mitch')} style={{padding:'10px 20px', background:view==='mitch'?G.gold:'transparent', color:view==='mitch'?'#111111':G.t1, border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer'}}>🍌 Mitch's Slots</button>}
        {Object.keys(cdewSlotStats).length > 0 && <button onClick={() => setView('cdew')} style={{padding:'10px 20px', background:view==='cdew'?G.gold:'transparent', color:view==='cdew'?'#111111':G.t1, border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer'}}>🎰 Cdew's Slots</button>}
        <button onClick={() => setView('all-hunts')} style={{padding:'10px 20px', background:view==='all-hunts'?G.gold:'transparent', color:view==='all-hunts'?'#111111':G.t1, border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer'}}>📋 All Hunts</button>
      </div>

      {view === 'your' && user && (
        <div>
          <div style={{display:'flex', gap:'0.8rem', marginBottom:'1.5rem', flexWrap:'wrap'}}>
            <button onClick={() => setYourFilter('best')} style={{padding:'8px 16px', background:yourFilter==='best'?G.gold:'transparent', color:yourFilter==='best'?'#111111':G.t1, border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer', fontSize:'0.9rem'}}>⭐ Best Slots</button>
            <button onClick={() => setYourFilter('worst')} style={{padding:'8px 16px', background:yourFilter==='worst'?G.gold:'transparent', color:yourFilter==='worst'?'#111111':G.t1, border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer', fontSize:'0.9rem'}}>💔 Worst Slots</button>
            <button onClick={() => setYourFilter('all')} style={{padding:'8px 16px', background:yourFilter==='all'?G.gold:'transparent', color:yourFilter==='all'?'#111111':G.t1, border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer', fontSize:'0.9rem'}}>📊 Full List</button>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'0.4rem'}}>
            {getFilteredSlots(slotStats, yourFilter).map((slot, i) => (
              <div key={i} style={{background:G.card, border:`1px solid ${G.bdr}`, borderRadius:3, padding:'0.5rem', display:'flex', flexDirection:'column', justifyContent:'space-between', minHeight:'70px'}}>
                <div><div style={{fontWeight:700, marginBottom:'0.3rem', fontSize:'0.8rem', lineHeight:1.1, overflow:'hidden', textOverflow:'ellipsis'}}>{slot.name}</div><div style={{fontSize:'0.75rem', color:G.t3}}>🎯 {slot.bonusCount}</div></div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:'0.3rem'}}>
                  <div style={{fontSize:'0.8rem', color:G.gold, fontWeight:700}}>{slot.multipliers.length > 0 ? (slot.multipliers.reduce((a,b)=>a+b,0)/slot.multipliers.length).toFixed(2) : 'N/A'}x</div>
                  <button onClick={() => alert(`Comparing ${slot.name} to your hunts...`)} style={{background:'none', border:'none', cursor:'pointer', fontSize:'1rem', padding:'0', lineHeight:1}}>🔄</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'mitch' && (
        <div>
          <div style={{display:'flex', gap:'0.8rem', marginBottom:'1.5rem', flexWrap:'wrap'}}>
            <button onClick={() => setMitchFilter('best')} style={{padding:'8px 16px', background:mitchFilter==='best'?G.gold:'transparent', color:mitchFilter==='best'?'#111111':G.t1, border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer', fontSize:'0.9rem'}}>⭐ Best Slots</button>
            <button onClick={() => setMitchFilter('worst')} style={{padding:'8px 16px', background:mitchFilter==='worst'?G.gold:'transparent', color:mitchFilter==='worst'?'#111111':G.t1, border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer', fontSize:'0.9rem'}}>💔 Worst Slots</button>
            <button onClick={() => setMitchFilter('all')} style={{padding:'8px 16px', background:mitchFilter==='all'?G.gold:'transparent', color:mitchFilter==='all'?'#111111':G.t1, border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer', fontSize:'0.9rem'}}>📊 Full List</button>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'0.4rem'}}>
            {getFilteredSlots(mitchSlotStats, mitchFilter).map((slot, i) => (
              <div key={i} style={{background:G.card, border:`1px solid ${G.bdr}`, borderRadius:3, padding:'0.5rem', display:'flex', flexDirection:'column', justifyContent:'space-between', minHeight:'70px'}}>
                <div><div style={{fontWeight:700, marginBottom:'0.3rem', fontSize:'0.8rem', lineHeight:1.1, overflow:'hidden', textOverflow:'ellipsis'}}>{slot.name}</div><div style={{fontSize:'0.75rem', color:G.t3}}>🎯 {slot.bonusCount}</div></div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:'0.3rem'}}>
                  <div style={{fontSize:'0.8rem', color:G.gold, fontWeight:700}}>{slot.multipliers.length > 0 ? (slot.multipliers.reduce((a,b)=>a+b,0)/slot.multipliers.length).toFixed(2) : 'N/A'}x</div>
                  <button onClick={() => alert(`Comparing ${slot.name} to your hunts...`)} style={{background:'none', border:'none', cursor:'pointer', fontSize:'1rem', padding:'0', lineHeight:1}}>🔄</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'cdew' && (
        <div>
          <div style={{display:'flex', gap:'0.8rem', marginBottom:'1.5rem', flexWrap:'wrap'}}>
            <button onClick={() => setCdewFilter('best')} style={{padding:'8px 16px', background:cdewFilter==='best'?G.gold:'transparent', color:cdewFilter==='best'?'#111111':G.t1, border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer', fontSize:'0.9rem'}}>⭐ Best Slots</button>
            <button onClick={() => setCdewFilter('worst')} style={{padding:'8px 16px', background:cdewFilter==='worst'?G.gold:'transparent', color:cdewFilter==='worst'?'#111111':G.t1, border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer', fontSize:'0.9rem'}}>💔 Worst Slots</button>
            <button onClick={() => setCdewFilter('all')} style={{padding:'8px 16px', background:cdewFilter==='all'?G.gold:'transparent', color:cdewFilter==='all'?'#111111':G.t1, border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer', fontSize:'0.9rem'}}>📊 Full List</button>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'0.4rem'}}>
            {getFilteredSlots(cdewSlotStats, cdewFilter).map((slot, i) => (
              <div key={i} style={{background:G.card, border:`1px solid ${G.bdr}`, borderRadius:3, padding:'0.5rem', display:'flex', flexDirection:'column', justifyContent:'space-between', minHeight:'70px'}}>
                <div><div style={{fontWeight:700, marginBottom:'0.3rem', fontSize:'0.8rem', lineHeight:1.1, overflow:'hidden', textOverflow:'ellipsis'}}>{slot.name}</div><div style={{fontSize:'0.75rem', color:G.t3}}>🎯 {slot.bonusCount}</div></div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:'0.3rem'}}>
                  <div style={{fontSize:'0.8rem', color:G.gold, fontWeight:700}}>{slot.multipliers.length > 0 ? (slot.multipliers.reduce((a,b)=>a+b,0)/slot.multipliers.length).toFixed(2) : 'N/A'}x</div>
                  <button onClick={() => alert(`Comparing ${slot.name} to your hunts...`)} style={{background:'none', border:'none', cursor:'pointer', fontSize:'1rem', padding:'0', lineHeight:1}}>🔄</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'all-hunts' && (
        <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
          {hunts.length === 0 && user === null ? (
            <div style={{textAlign:'center', padding:'2rem', color:G.t3}}>Login to see your hunt history</div>
          ) : hunts.length === 0 ? (
            <div style={{textAlign:'center', padding:'2rem', color:G.t3}}>No hunts yet</div>
          ) : (
            hunts.map((hunt, i) => (
              <div key={i} style={{background:G.card, border:`1px solid ${G.bdr}`, borderRadius:6, padding:'1.5rem', transition:'all 0.2s'}} onMouseEnter={e => e.currentTarget.style.background = G.lift} onMouseLeave={e => e.currentTarget.style.background = G.card}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:'1.1rem', fontWeight:700, marginBottom:'0.3rem'}}>Hunt from {new Date(hunt.createdAt).toLocaleDateString()}</div>
                    <div style={{fontSize:'0.85rem', color:G.t3}}>{hunt.bonuses?.length || 0} bonuses • {hunt.calls?.length || 0} calls • {hunt.equity?.length || 0} people</div>
                  </div>
                  <div style={{fontSize:'1.2rem', fontWeight:700, color:hunt.totalWinnings >= 0 ? G.green : G.red}}>{hunt.totalWinnings >= 0 ? '+' : ''}{fmt(hunt.totalWinnings || 0)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
