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
      const rawSlot = b.slot || 'Unknown';
      // Normalize for deduplication: lowercase, trim, normalize connectors
      let normalized = rawSlot
        .toLowerCase()
        .trim()
        .replace(/\s*&\s*/g, ' and ') // Convert & to ' and '
        .replace(/[^\w\s]/g, ' ')     // Replace remaining punctuation with spaces
        .replace(/\s+/g, ' ')          // Normalize multiple spaces to single space
        .trim();
      
      // Normalize plurals: remove trailing 's' from last word to catch variants
      const words = normalized.split(' ');
      if (words.length > 0 && words[words.length - 1].endsWith('s') && words[words.length - 1].length > 1) {
        words[words.length - 1] = words[words.length - 1].slice(0, -1);
        normalized = words.join(' ');
      }
      
      // Title case for display
      const titleCased = normalized
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      if (!stats[normalized]) stats[normalized] = {
        name: titleCased, 
        bonusCount: 0, 
        requiredMultipliers: [],
        multipliers: [],
        totalBet: 0,        // NEW: track total wagered
        totalWin: 0         // NEW: track total won
      };
      stats[normalized].bonusCount++;
      
      // Store both required and earned multipliers
      const reqMult = b.requiredMultiplier ? parseFloat(b.requiredMultiplier) : 0;
      const earnedMult = b.multiplier ? parseFloat(b.multiplier) : 0;
      if (reqMult > 0) stats[normalized].requiredMultipliers.push(reqMult);
      if (earnedMult > 0) stats[normalized].multipliers.push(earnedMult);
      
      // Track bet and win amounts
      const bet = b.bet ? parseFloat(b.bet) : 0;
      const win = b.win ? parseFloat(b.win) : 0;
      stats[normalized].totalBet += bet;
      stats[normalized].totalWin += win;
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

const calculateOverallStats = (slotStats, hunts) => {
  const slots = Object.values(slotStats);
  const totalBonuses = slots.reduce((sum, s) => sum + s.bonusCount, 0);
  const totalHunts = hunts.length;
  
  // Calculate totals for buyin, earnings, and profit/loss
  const totalBuyin = slots.reduce((sum, s) => sum + s.totalBet, 0);
  const totalEarnings = slots.reduce((sum, s) => sum + s.totalWin, 0);
  const profitLoss = totalEarnings - totalBuyin;
  
  // Calculate best and worst slots
  let bestSlot = null, worstSlot = null;
  let bestRatio = -Infinity, worstRatio = Infinity;
  
  slots.forEach(slot => {
    if (slot.multipliers.length === 0) return;
    const avgMult = slot.multipliers.reduce((a, b) => a + b, 0) / slot.multipliers.length;
    const ratio = avgMult / slot.bonusCount;
    if (ratio > bestRatio) { bestRatio = ratio; bestSlot = slot; }
    if (ratio < worstRatio) { worstRatio = ratio; worstSlot = slot; }
  });
  
  // Calculate average required multiplier (across ALL bonuses)
  const allReqMultipliers = slots.flatMap(s => s.requiredMultipliers);
  const avgReqMult = allReqMultipliers.length > 0 
    ? allReqMultipliers.reduce((a, b) => a + b, 0) / allReqMultipliers.length 
    : 0;
  
  // Calculate average earned multiplier (across ALL bonuses)
  const allEarnedMultipliers = slots.flatMap(s => s.multipliers);
  const avgEarned = allEarnedMultipliers.length > 0 
    ? allEarnedMultipliers.reduce((a, b) => a + b, 0) / allEarnedMultipliers.length 
    : 0;
  
  return {
    totalHunts,
    totalBonuses,
    totalBuyin: totalBuyin.toFixed(2),
    totalEarnings: totalEarnings.toFixed(2),
    profitLoss: profitLoss.toFixed(2),
    bestSlot,
    worstSlot,
    avgReqMult: avgReqMult.toFixed(2),
    avgEarned: avgEarned.toFixed(2),
    bestRatio: bestRatio.toFixed(4)
  };
};

export default function HuntHistory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [hunts, setHunts] = useState([]);
  const [slotStats, setSlotStats] = useState({});
  const [mitchHunts, setMitchHunts] = useState([]);
  const [mitchSlotStats, setMitchSlotStats] = useState({});
  const [cdewHunts, setCdewHunts] = useState([]);
  const [cdewSlotStats, setCdewSlotStats] = useState({});
  const [view, setView] = useState('your');
  const [yourFilter, setYourFilter] = useState('best');
  const [mitchFilter, setMitchFilter] = useState('alpha');
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
          setMitchHunts(res.hunts);
          setMitchSlotStats(calculateMitchSlotStats(res.hunts));
        } else {
          await apiFetch('/api/admin/fetch-and-import-mitch-hunts', {method: 'POST'});
          const retry = await apiFetch('/api/admin/mitch-hunts');
          if (retry && retry.hunts) {
            setMitchHunts(retry.hunts);
            setMitchSlotStats(calculateMitchSlotStats(retry.hunts));
          }
        }
      } catch (e) { console.error('Load Mitch:', e); }

      try {
        const res = await apiFetch('/api/admin/cdew-hunts');
        if (res && res.hunts && res.hunts.length > 0) {
          setCdewHunts(res.hunts);
          setCdewSlotStats(calculateCdewSlotStats(res.hunts));
        } else {
          await apiFetch('/api/admin/fetch-and-import-cdew-hunts', {method: 'POST'});
          const retry = await apiFetch('/api/admin/cdew-hunts');
          if (retry && retry.hunts) {
            setCdewHunts(retry.hunts);
            setCdewSlotStats(calculateCdewSlotStats(retry.hunts));
          }
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
        <div style={{display:'grid', gridTemplateColumns:'1fr 340px', gap:'2rem', alignItems:'start'}}>
          <div>
            <div style={{display:'flex', gap:'0.8rem', marginBottom:'1.5rem', flexWrap:'wrap'}}>
              <button onClick={() => setMitchFilter('alpha')} style={{padding:'8px 16px', background:mitchFilter==='alpha'?G.gold:'transparent', color:mitchFilter==='alpha'?'#111111':G.t1, border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer', fontSize:'0.9rem'}}>A-Z Alphabetical</button>
              <button onClick={() => setMitchFilter('most')} style={{padding:'8px 16px', background:mitchFilter==='most'?G.gold:'transparent', color:mitchFilter==='most'?'#111111':G.t1, border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer', fontSize:'0.9rem'}}>📈 Most Played</button>
              <button onClick={() => setMitchFilter('least')} style={{padding:'8px 16px', background:mitchFilter==='least'?G.gold:'transparent', color:mitchFilter==='least'?'#111111':G.t1, border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer', fontSize:'0.9rem'}}>📉 Least Played</button>
              <button onClick={() => setMitchFilter('highMult')} style={{padding:'8px 16px', background:mitchFilter==='highMult'?G.gold:'transparent', color:mitchFilter==='highMult'?'#111111':G.t1, border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer', fontSize:'0.9rem'}}>⬆️ Highest Mult</button>
              <button onClick={() => setMitchFilter('lowMult')} style={{padding:'8px 16px', background:mitchFilter==='lowMult'?G.gold:'transparent', color:mitchFilter==='lowMult'?'#111111':G.t1, border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer', fontSize:'0.9rem'}}>⬇️ Lowest Mult</button>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%', borderCollapse:'collapse', fontFamily:G.display}}>
                <thead>
                  <tr style={{borderBottom:`2px solid ${G.bdr}`, background:G.bg2}}>
                    <th style={{padding:'12px', textAlign:'left', color:G.t1, fontWeight:700, fontSize:'0.9rem'}}>Slot Name</th>
                    <th style={{padding:'12px', textAlign:'center', color:G.t1, fontWeight:700, fontSize:'0.9rem', width:'120px'}}>Plays</th>
                    <th style={{padding:'12px', textAlign:'center', color:G.gold, fontWeight:700, fontSize:'0.9rem', width:'120px'}}>Avg Multiplier</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const slots = Object.values(mitchSlotStats);
                    let sorted = [...slots];
                    
                    if (mitchFilter === 'most') {
                      sorted.sort((a, b) => b.bonusCount - a.bonusCount);
                    } else if (mitchFilter === 'least') {
                      sorted.sort((a, b) => a.bonusCount - b.bonusCount);
                    } else if (mitchFilter === 'highMult') {
                      sorted.sort((a, b) => {
                        const avgA = a.multipliers.length ? a.multipliers.reduce((x, y) => x + y) / a.multipliers.length : 0;
                        const avgB = b.multipliers.length ? b.multipliers.reduce((x, y) => x + y) / b.multipliers.length : 0;
                        return avgB - avgA;
                      });
                    } else if (mitchFilter === 'lowMult') {
                      sorted.sort((a, b) => {
                        const avgA = a.multipliers.length ? a.multipliers.reduce((x, y) => x + y) / a.multipliers.length : 0;
                        const avgB = b.multipliers.length ? b.multipliers.reduce((x, y) => x + y) / b.multipliers.length : 0;
                        return avgA - avgB;
                      });
                    } else {
                      sorted.sort((a, b) => a.name.localeCompare(b.name));
                    }
                    
                    return sorted.map((slot, i) => (
                      <tr key={i} style={{borderBottom:`1px solid ${G.bdr}`, background:i % 2 === 0 ? G.bg : G.bg2, transition:'all 0.2s'}} onMouseEnter={e => e.currentTarget.style.background = G.card} onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? G.bg : G.bg2}>
                        <td style={{padding:'12px', color:G.t1, fontSize:'0.9rem'}}>{slot.name}</td>
                        <td style={{padding:'12px', textAlign:'center', color:G.t2, fontSize:'0.9rem'}}>{slot.bonusCount}</td>
                        <td style={{padding:'12px', textAlign:'center', color:G.gold, fontWeight:700, fontSize:'0.9rem'}}>{slot.multipliers.length > 0 ? (slot.multipliers.reduce((a,b)=>a+b,0)/slot.multipliers.length).toFixed(2) : 'N/A'}x</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{position:'sticky', top:'2rem'}}>
            {(() => {
              const stats = calculateOverallStats(mitchSlotStats, mitchHunts);
              return (
                <div style={{background:G.card, border:`1px solid ${G.bdr}`, borderRadius:8, padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem'}}>
                  <h3 style={{margin:'0 0 0.5rem 0', fontSize:'1rem', fontWeight:700, color:G.gold}}>📊 Mitch's Stats</h3>
                  
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:'0.5rem', borderBottom:`1px solid ${G.bdr}`}}>
                    <span style={{fontSize:'0.85rem', color:G.t3}}>Total Hunts</span>
                    <span style={{fontSize:'1rem', fontWeight:700, color:G.t1}}>{stats.totalHunts}</span>
                  </div>
                  
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:'0.5rem', borderBottom:`1px solid ${G.bdr}`}}>
                    <span style={{fontSize:'0.85rem', color:G.t3}}>Total Bonuses</span>
                    <span style={{fontSize:'1rem', fontWeight:700, color:G.t1}}>{stats.totalBonuses}</span>
                  </div>
                  
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:'0.5rem', borderBottom:`1px solid ${G.bdr}`}}>
                    <span style={{fontSize:'0.85rem', color:G.t3}}>Total Buyin</span>
                    <span style={{fontSize:'1rem', fontWeight:700, color:G.t1}}>${parseFloat(stats.totalBuyin).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:'0.5rem', borderBottom:`1px solid ${G.bdr}`}}>
                    <span style={{fontSize:'0.85rem', color:G.t3}}>Total Earnings</span>
                    <span style={{fontSize:'1rem', fontWeight:700, color:G.t1}}>${parseFloat(stats.totalEarnings).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:'0.5rem', borderBottom:`1px solid ${G.bdr}`}}>
                    <span style={{fontSize:'0.85rem', color:G.t3}}>Profit/Loss</span>
                    <span style={{fontSize:'1rem', fontWeight:700, color: parseFloat(stats.profitLoss) >= 0 ? G.green : G.red}}>{parseFloat(stats.profitLoss) >= 0 ? '+' : ''}${parseFloat(stats.profitLoss).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:'0.5rem', borderBottom:`1px solid ${G.bdr}`}}>
                    <span style={{fontSize:'0.85rem', color:G.t3}}>Avg Req X</span>
                    <span style={{fontSize:'1rem', fontWeight:700, color:G.green}}>{stats.avgReqMult}x</span>
                  </div>
                  
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:'0.5rem', borderBottom:`1px solid ${G.bdr}`}}>
                    <span style={{fontSize:'0.85rem', color:G.t3}}>Avg X (Earned)</span>
                    <span style={{fontSize:'1rem', fontWeight:700, color:G.gold}}>{stats.avgEarned}x</span>
                  </div>
                  
                  {stats.bestSlot && (
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', paddingBottom:'0.5rem', borderBottom:`1px solid ${G.bdr}`}}>
                      <span style={{fontSize:'0.85rem', color:G.t3}}>Best Slot</span>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:'0.8rem', fontWeight:700, color:G.green}}>{stats.bestSlot.name}</div>
                        <div style={{fontSize:'0.75rem', color:G.t3}}>Ratio: {stats.bestRatio}</div>
                      </div>
                    </div>
                  )}
                  
                  {stats.worstSlot && (
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                      <span style={{fontSize:'0.85rem', color:G.t3}}>Worst Slot</span>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:'0.8rem', fontWeight:700, color:G.red}}>{stats.worstSlot.name}</div>
                        <div style={{fontSize:'0.75rem', color:G.t3}}>Ratio: {(stats.worstRatio ?? 0).toFixed(4)}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
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
