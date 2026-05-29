import { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import { useNavigate } from 'react-router-dom';

const G = {
  bg:'#161618', bg2:'#1c1c1f', sur:'#222226', card:'#26262a', lift:'#2c2c32',
  bdr:'rgba(255,255,255,0.15)',
  gold:'#c6f135', green:'#4ade80', red:'#f87171', blue:'#5865f2', purple:'#c084fc',
  t1:'#ffffff', t2:'#e8e8e8', t3:'#b0b0b0', t4:'#808080',
  display:"'Chakra Petch',sans-serif",
};

const fmt = v => '$'+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

export default function HuntHistory({ user }) {
  const navigate = useNavigate();
  const [hunts, setHunts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slotStats, setSlotStats] = useState({});
  const [mitchSlotStats, setMitchSlotStats] = useState({});
  const [view, setView] = useState('your'); // 'your', 'mitch', 'all-hunts'
  const [yourFilter, setYourFilter] = useState('best'); // 'best', 'worst', 'all'
  const [mitchFilter, setMitchFilter] = useState('best'); // 'best', 'worst', 'all'

  useEffect(() => {
    const loadData = async () => {
      if (!user) return; // Skip if not logged in
      try {
        const myHuntsData = await apiFetch('/api/my-hunts');
        setHunts(myHuntsData.hunts || []);
        calculateSlotStats(myHuntsData.hunts || []);
      } catch (e) {
        console.error('Error loading my hunts:', e);
      }
    };

    const loadMitchData = async () => {
      try {
        // Try to get existing Mitch hunts
        const existingData = await apiFetch('/api/admin/mitch-hunts').catch(() => null);
        
        if (existingData?.hunts && existingData.hunts.length > 0) {
          calculateMitchSlotStats(existingData.hunts);
        } else {
          // If none exist, try to fetch them
          try {
            const fetchResult = await apiFetch('/api/admin/fetch-and-import-mitch-hunts', { method: 'POST' });
            if (fetchResult.huntsImported) {
              // Reload Mitch data after import
              const freshData = await apiFetch('/api/admin/mitch-hunts');
              if (freshData.hunts) {
                calculateMitchSlotStats(freshData.hunts);
              }
            }
          } catch (importErr) {
            console.log('Mitch import not available or failed:', importErr.message);
          }
        }
      } catch (e) {
        console.error('Error loading Mitch data:', e);
      }
    };

    loadData();
    setLoading(false);
    
    // Load Mitch data independently
    loadMitchData();
  }, []);

  const calculateSlotStats = (huntList) => {
    const stats = {};
    
    huntList.forEach(hunt => {
      if (!hunt.bonuses) return;
      
      hunt.bonuses.forEach(bonus => {
        const slot = bonus.slot || 'Unknown';
        if (!stats[slot]) {
          stats[slot] = {
            name: slot,
            bonusCount: 0,
            wins: 0,
            multipliers: [],
          };
        }
        
        stats[slot].bonusCount += 1;
        
        const mult = parseFloat(bonus.multiplier) || 0;
        if (mult > 0) {
          stats[slot].multipliers.push(mult);
          stats[slot].wins += 1;
        }
      });
    });
    
    setSlotStats(stats);
  };

  const calculateMitchSlotStats = (huntList) => {
    const stats = {};
    
    huntList.forEach(hunt => {
      if (!hunt.bonuses) return;
      
      hunt.bonuses.forEach(bonus => {
        const slot = bonus.slot || 'Unknown';
        if (!stats[slot]) {
          stats[slot] = {
            name: slot,
            bonusCount: 0,
            wins: 0,
            multipliers: [],
          };
        }
        
        stats[slot].bonusCount += 1;
        
        const mult = parseFloat(bonus.multiplier) || 0;
        if (mult > 0) {
          stats[slot].multipliers.push(mult);
          stats[slot].wins += 1;
        }
      });
    });
    
    setMitchSlotStats(stats);
  };

  const sortSlots = (stats, filter = 'best') => {
    const sorted = Object.values(stats)
      .filter(s => s.bonusCount >= 2)
      .sort((a, b) => (b.totalWinnings || 0) - (a.totalWinnings || 0));
    
    if (filter === 'best') return sorted.slice(0, 100);
    if (filter === 'worst') return sorted.slice(-100).reverse();
    return sorted;
  };

  const getFilteredSlots = (stats, filter) => {
    const all = Object.values(stats).filter(s => s.bonusCount >= 2);
    
    // Calculate avg mult for sorting
    const withAvgMult = all.map(s => ({
      ...s,
      avgMult: s.multipliers.length > 0 ? s.multipliers.reduce((a,b)=>a+b,0)/s.multipliers.length : 0
    }));
    
    if (filter === 'best') {
      return withAvgMult.sort((a, b) => (b.avgMult || 0) - (a.avgMult || 0)).slice(0, 100);
    } else if (filter === 'worst') {
      return withAvgMult.sort((a, b) => (a.avgMult || 0) - (b.avgMult || 0)).slice(0, 100);
    }
    return withAvgMult.sort((a, b) => (b.avgMult || 0) - (a.avgMult || 0));
  };

  if (loading) return (
    <div style={{background:G.bg, minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:G.display, color:G.t1}}>
      Loading...
    </div>
  );

  return (
    <div style={{background:G.bg, minHeight:'100vh', color:G.t1, fontFamily:G.display, padding:'2rem'}}>
      {/* Header */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem'}}>
        <h1 style={{margin:0, fontSize:'2rem', fontWeight:700}}>📊 Hunt History</h1>
        <button onClick={() => navigate('/hunt')} style={{
          padding:'8px 16px', background:G.gold, color:'#111111', border:'none', borderRadius:6,
          fontFamily:G.display, fontWeight:700, cursor:'pointer'
        }}>← Back to Hunt</button>
      </div>

      {/* View Selector */}
      <div style={{display:'flex', gap:'1rem', marginBottom:'2rem', flexWrap:'wrap'}}>
        {user && (
          <button onClick={() => setView('your')} style={{
            padding:'10px 20px', background:view==='your'?G.gold:'transparent', color:view==='your'?'#111111':G.t1,
            border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer'
          }}>👤 Your Slots</button>
        )}
        {Object.keys(mitchSlotStats).length > 0 && (
          <button onClick={() => setView('mitch')} style={{
            padding:'10px 20px', background:view==='mitch'?G.gold:'transparent', color:view==='mitch'?'#111111':G.t1,
            border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer'
          }}>🍌 Mitch's Slots</button>
        )}
        <button onClick={() => setView('all-hunts')} style={{
          padding:'10px 20px', background:view==='all-hunts'?G.gold:'transparent', color:view==='all-hunts'?'#111111':G.t1,
          border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer'
        }}>📋 All Hunts</button>
      </div>

      {/* Your Slots */}
      {view === 'your' && user && (
        <div>
          <div style={{display:'flex', gap:'0.8rem', marginBottom:'1.5rem', flexWrap:'wrap'}}>
            <button onClick={() => setYourFilter('best')} style={{
              padding:'8px 16px', background:yourFilter==='best'?G.gold:'transparent', color:yourFilter==='best'?'#111111':G.t1,
              border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer', fontSize:'0.9rem'
            }}>⭐ Best Slots</button>
            <button onClick={() => setYourFilter('worst')} style={{
              padding:'8px 16px', background:yourFilter==='worst'?G.gold:'transparent', color:yourFilter==='worst'?'#111111':G.t1,
              border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer', fontSize:'0.9rem'
            }}>💔 Worst Slots</button>
            <button onClick={() => setYourFilter('all')} style={{
              padding:'8px 16px', background:yourFilter==='all'?G.gold:'transparent', color:yourFilter==='all'?'#111111':G.t1,
              border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer', fontSize:'0.9rem'
            }}>📊 Full List</button>
          </div>
          
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'0.4rem'}}>
            {getFilteredSlots(slotStats, yourFilter).map((slot, i) => (
              <div key={i} style={{background:G.card, border:`1px solid ${G.bdr}`, borderRadius:3, padding:'0.5rem', display:'flex', flexDirection:'column', justifyContent:'space-between', minHeight:'70px'}}>
                <div>
                  <div style={{fontWeight:700, marginBottom:'0.3rem', fontSize:'0.8rem', lineHeight:1.1, overflow:'hidden', textOverflow:'ellipsis'}}>{slot.name}</div>
                  <div style={{fontSize:'0.75rem', color:G.t3}}>🎯 {slot.bonusCount}</div>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:'0.3rem'}}>
                  <div style={{fontSize:'0.8rem', color:G.gold, fontWeight:700}}>{(slot.multipliers.length > 0 ? (slot.multipliers.reduce((a,b)=>a+b,0)/slot.multipliers.length).toFixed(2) : 'N/A')}x</div>
                  <button onClick={() => alert(`Comparing ${slot.name} to your hunts...`)} style={{
                    background:'none', border:'none', cursor:'pointer', fontSize:'1rem', padding:'0',
                    lineHeight:1
                  }}>🔄</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mitch's Slots */}
      {view === 'mitch' && (
        <div>
          <div style={{display:'flex', gap:'0.8rem', marginBottom:'1.5rem', flexWrap:'wrap'}}>
            <button onClick={() => setMitchFilter('best')} style={{
              padding:'8px 16px', background:mitchFilter==='best'?G.gold:'transparent', color:mitchFilter==='best'?'#111111':G.t1,
              border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer', fontSize:'0.9rem'
            }}>⭐ Best Slots</button>
            <button onClick={() => setMitchFilter('worst')} style={{
              padding:'8px 16px', background:mitchFilter==='worst'?G.gold:'transparent', color:mitchFilter==='worst'?'#111111':G.t1,
              border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer', fontSize:'0.9rem'
            }}>💔 Worst Slots</button>
            <button onClick={() => setMitchFilter('all')} style={{
              padding:'8px 16px', background:mitchFilter==='all'?G.gold:'transparent', color:mitchFilter==='all'?'#111111':G.t1,
              border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer', fontSize:'0.9rem'
            }}>📊 Full List</button>
          </div>
          
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'0.4rem'}}>
            {getFilteredSlots(mitchSlotStats, mitchFilter).map((slot, i) => (
              <div key={i} style={{background:G.card, border:`1px solid ${G.bdr}`, borderRadius:3, padding:'0.5rem', display:'flex', flexDirection:'column', justifyContent:'space-between', minHeight:'70px'}}>
                <div>
                  <div style={{fontWeight:700, marginBottom:'0.3rem', fontSize:'0.8rem', lineHeight:1.1, overflow:'hidden', textOverflow:'ellipsis'}}>{slot.name}</div>
                  <div style={{fontSize:'0.75rem', color:G.t3}}>🎯 {slot.bonusCount}</div>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:'0.3rem'}}>
                  <div style={{fontSize:'0.8rem', color:G.gold, fontWeight:700}}>{(slot.multipliers.length > 0 ? (slot.multipliers.reduce((a,b)=>a+b,0)/slot.multipliers.length).toFixed(2) : 'N/A')}x</div>
                  <button onClick={() => alert(`Comparing ${slot.name} to your hunts...`)} style={{
                    background:'none', border:'none', cursor:'pointer', fontSize:'1rem', padding:'0',
                    lineHeight:1
                  }}>🔄</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Hunts */}
      {view === 'all-hunts' && (
        <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
          {hunts.length === 0 && user === null ? (
            <div style={{textAlign:'center', padding:'2rem', color:G.t3}}>
              Login to see your hunt history
            </div>
          ) : hunts.length === 0 ? (
            <div style={{textAlign:'center', padding:'2rem', color:G.t3}}>
              No hunts yet
            </div>
          ) : (
          ) : (
            hunts.map((hunt, i) => (
              <div key={i} style={{
                background:G.card, border:`1px solid ${G.bdr}`, borderRadius:6, padding:'1.5rem',
                transition:'all 0.2s'
              }} onMouseEnter={e => e.currentTarget.style.background = G.lift} onMouseLeave={e => e.currentTarget.style.background = G.card}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:'1.1rem', fontWeight:700, marginBottom:'0.3rem'}}>
                      Hunt from {new Date(hunt.createdAt).toLocaleDateString()}
                    </div>
                    <div style={{fontSize:'0.85rem', color:G.t3}}>
                      {hunt.bonuses?.length || 0} bonuses • {hunt.calls?.length || 0} calls • {hunt.equity?.length || 0} people
                    </div>
                  </div>
                  <div style={{fontSize:'1.2rem', fontWeight:700, color:hunt.totalWinnings >= 0 ? G.green : G.red}}>
                    {hunt.totalWinnings >= 0 ? '+' : ''}{fmt(hunt.totalWinnings || 0)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
