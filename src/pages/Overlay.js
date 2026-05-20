import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { socket, apiFetch } from '../api';

const fmt = v => '$' + Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

export default function Overlay() {
  const { userId } = useParams();
  const [hunt, setHunt] = useState(null);

  useEffect(() => {
    apiFetch(`/api/hunts/${userId}`).then(setHunt).catch(()=>{});
    socket.emit('watch:hunt', userId);
    socket.on('hunt:update', setHunt);
    return () => socket.off('hunt:update', setHunt);
  }, [userId]);

  if (!hunt) return null;

  const bonuses   = hunt.bonuses || [];
  const equity    = hunt.equity  || [];
  const totalPot  = equity.reduce((s,e)=>s+(+e.amount||0),0);
  const totalWon  = bonuses.reduce((s,b)=>s+(+b.win||0),0);
  const isVip     = hunt.huntType === 'vip';
  const accent    = isVip ? '#bb86fc' : '#c6f135';

  return (
    <div style={{background:'transparent',padding:'12px',fontFamily:"'Chakra Petch',sans-serif",minHeight:'100vh'}}>
      <div style={{background:'rgba(17,17,17,0.92)',border:`1px solid ${accent}33`,borderRadius:6,padding:'10px 14px',display:'inline-block',minWidth:260}}>
        <div style={{fontSize:11,fontWeight:700,color:accent,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:6}}>
          {isVip?'★ VIP':'◆ COMMUNITY'} HUNT — {hunt.user?.displayName||'Unknown'}
        </div>
        <div style={{display:'flex',gap:16,marginBottom:8}}>
          <div>
            <div style={{fontSize:9,color:'#666',letterSpacing:'0.08em',textTransform:'uppercase'}}>POT</div>
            <div style={{fontSize:18,fontWeight:700,color:'#fff'}}>{fmt(totalPot)}</div>
          </div>
          <div>
            <div style={{fontSize:9,color:'#666',letterSpacing:'0.08em',textTransform:'uppercase'}}>WON</div>
            <div style={{fontSize:18,fontWeight:700,color:totalWon>=totalPot?'#c6f135':'#fff'}}>{fmt(totalWon)}</div>
          </div>
          <div>
            <div style={{fontSize:9,color:'#666',letterSpacing:'0.08em',textTransform:'uppercase'}}>BONUSES</div>
            <div style={{fontSize:18,fontWeight:700,color:'#fff'}}>{bonuses.length}</div>
          </div>
        </div>
        {bonuses.filter(b=>b.currentlyPlaying).map(b=>(
          <div key={b.id} style={{background:`${accent}15`,border:`1px solid ${accent}44`,borderRadius:4,padding:'5px 10px',fontSize:11,color:accent,fontWeight:700}}>
            🎰 Now: {b.slot}
          </div>
        ))}
      </div>
    </div>
  );
}
