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
  const [view, setView] = useState('your-slots'); // 'your-slots', 'mitch-slots', 'all-hunts'

  useEffect(() => {
    const loadData = async () => {
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
            totalBets: 0,
            bonusCount: 0,
            wins: 0,
            losses: 0,
            totalWinnings: 0,
            multipliers: [],
          };
        }
        
        stats[slot].totalBets += bonus.bet || 0;
        stats[slot].bonusCount += 1;
        
        if (bonus.win && bonus.win > 0) {
          stats[slot].wins += 1;
          stats[slot].totalWinnings += (bonus.win - (bonus.bet || 0));
          if (bonus.multiplier) stats[slot].multipliers.push(bonus.multiplier);
        } else {
          stats[slot].losses += 1;
          stats[slot].totalWinnings -= (bonus.bet || 0);
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
            totalBets: 0,
            bonusCount: 0,
            wins: 0,
            losses: 0,
            totalWinnings: 0,
            multipliers: [],
          };
        }
        
        stats[slot].totalBets += bonus.bet || 0;
        stats[slot].bonusCount += 1;
        
        if (bonus.win && bonus.win > 0) {
          stats[slot].wins += 1;
          stats[slot].totalWinnings += (bonus.win - (bonus.bet || 0));
          if (bonus.multiplier) stats[slot].multipliers.push(bonus.multiplier);
        } else {
          stats[slot].losses += 1;
          stats[slot].totalWinnings -= (bonus.bet || 0);
        }
      });
    });
    
    setMitchSlotStats(stats);
  };

  const sortSlots = (stats) => {
    return Object.values(stats)
      .filter(s => s.bonusCount >= 2)
      .sort((a, b) => (b.totalWinnings || 0) - (a.totalWinnings || 0));
  };

  const topYourSlots = sortSlots(slotStats).slice(0, 10);
  const bottomYourSlots = sortSlots(slotStats).slice(-10).reverse();
  const topMitchSlots = sortSlots(mitchSlotStats).slice(0, 10);

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
        <button onClick={() => setView('your-slots')} style={{
          padding:'10px 20px', background:view==='your-slots'?G.gold:'transparent', color:view==='your-slots'?'#111111':G.t1,
          border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer'
        }}>🏆 Your Top Slots</button>
        {Object.keys(mitchSlotStats).length > 0 && (
          <button onClick={() => setView('mitch-slots')} style={{
            padding:'10px 20px', background:view==='mitch-slots'?G.gold:'transparent', color:view==='mitch-slots'?'#111111':G.t1,
            border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer'
          }}>🍌 Mitch's Top Slots</button>
        )}
        <button onClick={() => setView('all-hunts')} style={{
          padding:'10px 20px', background:view==='all-hunts'?G.gold:'transparent', color:view==='all-hunts'?'#111111':G.t1,
          border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer'
        }}>📋 All Hunts</button>
      </div>

      {/* Your Top Slots */}
      {view === 'your-slots' && (
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2rem'}}>
          <div>
            <h2 style={{margin:'0 0 1rem 0', fontSize:'1.3rem', color:G.gold}}>✅ Best Performing</h2>
            <div style={{display:'flex', flexDirection:'column', gap:'0.8rem'}}>
              {topYourSlots.map((slot, i) => (
                <div key={i} style={{background:G.card, border:`1px solid ${G.bdr}`, borderRadius:6, padding:'1rem'}}>
                  <div style={{fontWeight:700, marginBottom:'0.5rem', fontSize:'0.95rem'}}>{i+1}. {slot.name}</div>
                  <div style={{fontSize:'0.85rem', color:G.t3, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem'}}>
                    <div>💰 Wins: {slot.wins}/{slot.bonusCount}</div>
                    <div>🎲 Bet: {fmt(slot.totalBets)}</div>
                    <div>💵 Profit: {fmt(slot.totalWinnings)}</div>
                    <div>📈 ROI: {(slot.totalBets > 0 ? (slot.totalWinnings/slot.totalBets*100).toFixed(1) : 0)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 style={{margin:'0 0 1rem 0', fontSize:'1.3rem', color:G.red}}>❌ Worst Performing</h2>
            <div style={{display:'flex', flexDirection:'column', gap:'0.8rem'}}>
              {bottomYourSlots.map((slot, i) => (
                <div key={i} style={{background:G.card, border:`1px solid ${G.bdr}`, borderRadius:6, padding:'1rem'}}>
                  <div style={{fontWeight:700, marginBottom:'0.5rem', fontSize:'0.95rem'}}>{slot.name}</div>
                  <div style={{fontSize:'0.85rem', color:G.t3, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem'}}>
                    <div>💔 Losses: {slot.losses}/{slot.bonusCount}</div>
                    <div>🎲 Bet: {fmt(slot.totalBets)}</div>
                    <div>💸 Loss: {fmt(slot.totalWinnings)}</div>
                    <div>📉 ROI: {(slot.totalBets > 0 ? (slot.totalWinnings/slot.totalBets*100).toFixed(1) : 0)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mitch's Top Slots */}
      {view === 'mitch-slots' && (
        <div>
          <h2 style={{margin:'0 0 1rem 0', fontSize:'1.3rem', color:G.purple}}>🍌 Mitch's Best Slots ({topMitchSlots.length})</h2>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'1rem'}}>
            {topMitchSlots.map((slot, i) => (
              <div key={i} style={{background:G.card, border:`1px solid ${G.bdr}`, borderRadius:6, padding:'1rem'}}>
                <div style={{fontWeight:700, marginBottom:'0.8rem', fontSize:'1rem'}}>{slot.name}</div>
                <div style={{fontSize:'0.85rem', color:G.t3, display:'flex', flexDirection:'column', gap:'0.5rem'}}>
                  <div>🎯 Bonuses: {slot.bonusCount}</div>
                  <div>💰 Total Bet: {fmt(slot.totalBets)}</div>
                  <div>💵 Total Profit: <span style={{color:slot.totalWinnings >= 0 ? G.green : G.red, fontWeight:700}}>{fmt(slot.totalWinnings)}</span></div>
                  <div>🏆 Win Rate: {((slot.wins/slot.bonusCount)*100).toFixed(1)}%</div>
                  <div>📊 Avg Mult: {(slot.multipliers.length > 0 ? (slot.multipliers.reduce((a,b)=>a+b,0)/slot.multipliers.length).toFixed(2) : 'N/A')}x</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Hunts */}
      {view === 'all-hunts' && (
        <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
          {hunts.map((hunt, i) => (
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
          ))}
        </div>
      )}
    </div>
  );
}
