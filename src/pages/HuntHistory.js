import { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import { useNavigate } from 'react-router-dom';

const G = {
  bg:'#161618', bg2:'#1c1c1f', sur:'#222226', card:'#26262a', lift:'#2c2c32',
  bdr:'rgba(255,255,255,0.15)',
  gold:'#c6f135', green:'#4ade80', red:'#f87171', blue:'#5865f2',
  t1:'#ffffff', t2:'#e8e8e8', t3:'#b0b0b0', t4:'#808080',
  display:"'Chakra Petch',sans-serif",
};

const fmt = v => '$'+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

export default function HuntHistory({ user }) {
  const navigate = useNavigate();
  const [hunts, setHunts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slotStats, setSlotStats] = useState({});
  const [view, setView] = useState('slots'); // 'slots' or 'hunts'

  useEffect(() => {
    // Fetch all hunts and calculate statistics
    apiFetch('/api/my-hunts')
      .then(data => {
        setHunts(data.hunts || []);
        calculateSlotStats(data.hunts || []);
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
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
        
        if (bonus.result === 'Won') {
          stats[slot].wins += 1;
          stats[slot].totalWinnings += (bonus.winnings || 0);
          if (bonus.multiplier) stats[slot].multipliers.push(bonus.multiplier);
        } else if (bonus.result === 'Lost') {
          stats[slot].losses += 1;
        }
      });
    });
    
    setSlotStats(stats);
  };

  const sortedSlots = Object.values(slotStats).sort((a, b) => b.wins - a.wins);
  const bestSlots = sortedSlots.slice(0, 10);
  const worstSlots = sortedSlots.slice(-10).reverse();

  if (loading) return (
    <div style={{background:G.bg, minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:G.display, color:G.t1}}>
      Loading hunt history...
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
      <div style={{display:'flex', gap:'1rem', marginBottom:'2rem'}}>
        <button onClick={() => setView('slots')} style={{
          padding:'10px 20px', background:view==='slots'?G.gold:'transparent', color:view==='slots'?'#111111':G.t1,
          border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer'
        }}>🎰 Slot Performance</button>
        <button onClick={() => setView('hunts')} style={{
          padding:'10px 20px', background:view==='hunts'?G.gold:'transparent', color:view==='hunts'?'#111111':G.t1,
          border:`1px solid ${G.bdr}`, borderRadius:6, fontFamily:G.display, fontWeight:700, cursor:'pointer'
        }}>📋 All Hunts</button>
      </div>

      {view === 'slots' && (
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2rem'}}>
          {/* Best Performing Slots */}
          <div>
            <h2 style={{margin:'0 0 1rem 0', fontSize:'1.3rem', color:G.gold}}>✅ Best Performing Slots</h2>
            <div style={{display:'flex', flexDirection:'column', gap:'0.8rem'}}>
              {bestSlots.map((slot, i) => (
                <div key={i} style={{
                  background:G.card, border:`1px solid ${G.bdr}`, borderRadius:6, padding:'1rem'
                }}>
                  <div style={{fontWeight:700, marginBottom:'0.5rem', fontSize:'0.95rem'}}>{i+1}. {slot.name}</div>
                  <div style={{fontSize:'0.85rem', color:G.t3, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem'}}>
                    <div>💰 Wins: {slot.wins}/{slot.bonusCount}</div>
                    <div>🎲 Bet: {fmt(slot.totalBets)}</div>
                    <div>💵 Total Win: {fmt(slot.totalWinnings)}</div>
                    <div>📈 Win Rate: {((slot.wins/slot.bonusCount)*100).toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Worst Performing Slots */}
          <div>
            <h2 style={{margin:'0 0 1rem 0', fontSize:'1.3rem', color:G.red}}>❌ Worst Performing Slots</h2>
            <div style={{display:'flex', flexDirection:'column', gap:'0.8rem'}}>
              {worstSlots.map((slot, i) => (
                <div key={i} style={{
                  background:G.card, border:`1px solid ${G.bdr}`, borderRadius:6, padding:'1rem'
                }}>
                  <div style={{fontWeight:700, marginBottom:'0.5rem', fontSize:'0.95rem'}}>{slot.name}</div>
                  <div style={{fontSize:'0.85rem', color:G.t3, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem'}}>
                    <div>💔 Losses: {slot.losses}/{slot.bonusCount}</div>
                    <div>🎲 Bet: {fmt(slot.totalBets)}</div>
                    <div>💵 Total Loss: {fmt(slot.totalWinnings)}</div>
                    <div>📈 Win Rate: {((slot.wins/slot.bonusCount)*100).toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === 'hunts' && (
        <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
          {hunts.map((hunt, i) => (
            <div key={i} style={{
              background:G.card, border:`1px solid ${G.bdr}`, borderRadius:6, padding:'1.5rem',
              cursor:'pointer', transition:'all 0.2s'
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
