import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket, API, apiFetch } from '../api';

// ── Design tokens — matches HuntTracker exactly ──────────────────
const C = {
  bg:'#161618', sur:'#222226', card:'#26262a', lift:'#2c2c32',
  bdr:'rgba(255,255,255,0.15)', bb:'rgba(255,255,255,0.28)',
  gold:'#c6f135', gold2:'#d4f55a',
  green:'#4ade80',
  red:'#f87171', purple:'#c084fc',
  txt:'#ffffff', txt2:'#e8e8e8', label:'#b0b0b0', faint:'#808080',
  font:"'Chakra Petch',sans-serif",
};

const fmt = v => '$' + Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const elapsed = s => { if(!s) return 'just started'; const m=Math.floor((Date.now()-new Date(s))/60000); return m<1?'just started':m<60?`${m}m`:`${Math.floor(m/60)}h ${m%60}m`; };

// ── Social icons (inline SVG) ──────────────────────────────────────
const SOCIALS = [
  { label:'Rainbet', href:'https://rainbet.com/?r=bean', color:'#1a9d5a',
    icon: <svg width="18" height="18" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="50" fill="#1a9d5a"/><text x="50" y="67" textAnchor="middle" fontSize="52" fontWeight="900" fill="white" fontFamily="Arial">R</text></svg> },
  { label:'Twitch',  href:'https://www.twitch.tv/bean', color:'#9146ff',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="#9146ff"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg> },
  { label:'Kick',    href:'https://kick.com/bean', color:'#53fc18',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="#53fc18"><path d="M2 2h20v20H2V2zm4 4v12h3V14l5 4h4l-6-6 6-6h-4l-5 4V6H6z"/></svg> },
  { label:'Discord', href:'https://discord.com/invite/beantwitch', color:'#5865f2',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865f2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg> },
  { label:'YouTube', href:'https://youtube.com/@beantwitch?sub_confirmation=1', color:'#ff0000',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="#ff0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
  { label:'TikTok',  href:'https://www.tiktok.com/@beantwitch', color:'#fff',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg> },
  { label:'X',       href:'https://x.com/beantwitch', color:'#fff',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg> },
  { label:'Instagram',href:'https://www.instagram.com/beantwitch', color:'#e1306c',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="#e1306c"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg> },
  { label:'BeanSite', href:'https://beantwitch.com/social', color:C.gold,
    icon: <span style={{fontSize:16}}>🫘</span> },
];

function TicketModal({ user, onClose }) {
  const [type,    setType]    = useState('Bug');
  const [issue,   setIssue]   = useState('');
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  const submit = async () => {
    if (!issue.trim()) return;
    setSending(true);
    try {
      await apiFetch('/api/tickets', { method:'POST', body: JSON.stringify({
        username: user?.displayName || 'Anonymous', type, issue
      })});
      setSent(true);
    } catch(e) { alert('Failed to send ticket — try again'); }
    setSending(false);
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:C.card,border:`1px solid rgba(255,255,255,0.13)`,borderRadius:10,padding:'1.75rem',width:420,maxWidth:'95vw'}} onClick={e=>e.stopPropagation()}>
        {sent ? (
          <div style={{textAlign:'center',padding:'1rem 0'}}>
            <div style={{fontSize:36,marginBottom:12}}>✅</div>
            <div style={{fontFamily:C.font,fontSize:22,fontWeight:700,color:C.txt}}>Ticket Sent</div>
            <div style={{fontFamily:C.font,fontSize:12,color:C.label,marginTop:6}}>Randy Cabbage will look into it</div>
            <button onClick={onClose} style={{marginTop:20,height:36,padding:'0 24px',background:C.gold,color:'#000',border:'none',borderRadius:6,fontFamily:C.font,fontSize:13,fontWeight:700,cursor:'pointer'}}>Close</button>
          </div>
        ) : (
          <>
            <div style={{fontFamily:C.font,fontSize:22,fontWeight:700,letterSpacing:'0.03em',color:C.txt,marginBottom:16}}>Submit a Ticket</div>
            <div style={{fontFamily:C.font,fontSize:10,color:C.label,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Issue type</div>
            <div style={{display:'flex',gap:6,marginBottom:14}}>
              {['Bug','Feature Request','Other'].map(t => (
                <button key={t} onClick={()=>setType(t)} style={{flex:1,height:32,border:`1px solid ${type===t?C.gold:'rgba(255,255,255,0.07)'}`,background:type===t?'rgba(245,165,0,.1)':'transparent',borderRadius:5,fontFamily:C.font,fontSize:12,color:type===t?C.gold:C.txt2,cursor:'pointer'}}>
                  {t}
                </button>
              ))}
            </div>
            <div style={{fontFamily:C.font,fontSize:10,color:C.label,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Describe the issue</div>
            <textarea
              value={issue} onChange={e=>setIssue(e.target.value)} rows={4}
              placeholder="What happened? What did you expect?"
              style={{width:'100%',background:C.sur,border:`1px solid rgba(255,255,255,0.07)`,borderRadius:6,padding:'10px 12px',fontFamily:C.font,fontSize:13,color:C.txt,resize:'vertical',marginBottom:14}}
            />
            <div style={{display:'flex',gap:8}}>
              <button onClick={submit} disabled={sending||!issue.trim()} style={{flex:1,height:38,background:C.gold,color:'#000',border:'none',borderRadius:6,fontFamily:C.font,fontSize:14,fontWeight:700,cursor:'pointer',opacity:sending||!issue.trim()?0.5:1}}>
                {sending ? 'Sending…' : 'Send Ticket'}
              </button>
              <button onClick={onClose} style={{height:38,padding:'0 16px',background:'transparent',border:`1px solid rgba(255,255,255,0.07)`,borderRadius:6,fontFamily:C.font,fontSize:13,color:C.txt2,cursor:'pointer'}}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function HuntCard({ hunt, isOwn, isAdmin, onEnd, onDelete, navigate }) {
  const isVip  = hunt.huntType === 'vip';
  const ac     = isVip ? '#bb86fc' : C.gold;
  const [copied, setCopied] = useState(false);
  const [timer, setTimer]   = useState(elapsed(hunt.startedAt));
  const initials = (hunt.username||'?')[0].toUpperCase();

  useEffect(() => { const t = setInterval(()=>setTimer(elapsed(hunt.startedAt)),30000); return ()=>clearInterval(t); }, [hunt.startedAt]);

  const copy = e => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/hunt/${hunt.userId}`);
    setCopied(true); setTimeout(()=>setCopied(false), 2000);
  };

  return (
    <div onClick={()=>navigate(`/hunt/${hunt.userId}`)}
      style={{background:C.card,border:`1px solid rgba(255,255,255,0.07)`,cursor:'pointer',overflow:'hidden',
        transition:'all .12s',borderLeft:`3px solid ${ac}`}}
      onMouseEnter={e=>{e.currentTarget.style.background=C.lift;e.currentTarget.style.borderColor=ac;}}
      onMouseLeave={e=>{e.currentTarget.style.background=C.card;e.currentTarget.style.borderLeftColor=ac;e.currentTarget.style.borderColor='rgba(255,255,255,0.07)';e.currentTarget.style.borderLeftColor=ac;}}>
      <div style={{padding:'1rem 1rem 1rem 1.1rem'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
          {hunt.avatar
            ? <img src={hunt.avatar} alt="" style={{width:32,height:32,borderRadius:4,flexShrink:0}}/>
            : <div style={{width:32,height:32,borderRadius:4,background:ac,color:'#000',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:C.font,fontWeight:800,fontSize:16,flexShrink:0}}>{initials}</div>
          }
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:C.font,fontWeight:700,fontSize:17,letterSpacing:'0.02em',color:C.txt,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
              {hunt.username}
              {isOwn && <span style={{fontFamily:C.font,fontSize:9,color:C.gold,background:'rgba(245,165,0,.12)',padding:'1px 5px',borderRadius:2,letterSpacing:'0.06em'}}>YOU</span>}
            </div>
            <div style={{fontFamily:C.font,fontSize:11,fontWeight:700,color:ac,letterSpacing:'0.06em',textTransform:'uppercase',marginTop:1}}>
              {isVip ? '★ VIP Hunt' : '◆ Community Hunt'}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
            {hunt.viewers > 0 && <span style={{fontFamily:C.font,fontSize:10,color:C.label}}>👁 {hunt.viewers}</span>}
            {(() => {
              const mode = hunt.huntMode || 'creating';
              const totalBonuses = hunt.bonusCount || 0;
              if (mode === 'rolling') {
                return (
                  <span style={{fontFamily:C.font,fontSize:9,letterSpacing:'0.06em',textTransform:'uppercase',padding:'2px 7px',borderRadius:3,background:'rgba(34,197,94,.1)',color:C.green,border:'1px solid rgba(34,197,94,.3)'}}>
                    🎲 Bonus {hunt.rolledCount||0}/{totalBonuses}
                  </span>
                );
              }
              if (mode === 'spinning') {
                return (
                  <span style={{fontFamily:C.font,fontSize:9,letterSpacing:'0.06em',textTransform:'uppercase',padding:'2px 7px',borderRadius:3,background:'rgba(245,165,0,.1)',color:C.gold,border:'1px solid rgba(245,165,0,.3)'}}>
                    🎰 Spinning
                  </span>
                );
              }
              return (
                <span style={{fontFamily:C.font,fontSize:9,letterSpacing:'0.06em',textTransform:'uppercase',padding:'2px 7px',borderRadius:3,background:'rgba(85,85,122,.15)',color:C.label,border:'1px solid rgba(85,85,122,.25)'}}>
                  📋 Creating
                </span>
              );
            })()}
            <span style={{width:7,height:7,borderRadius:'50%',background:C.green,display:'inline-block',flexShrink:0,animation:'live-pulse 2s infinite'}}/>
          </div>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:1,background:'rgba(255,255,255,0.07)',border:`1px solid rgba(255,255,255,0.07)`,borderRadius:4,overflow:'hidden',marginBottom:10}}>
          {[['Bonuses',hunt.bonusCount],['Pot',fmt(hunt.pot)],['Won',fmt(hunt.totalWon)]].map(([l,v])=>(
            <div key={l} style={{background:C.sur,padding:'6px 8px'}}>
              <div style={{fontFamily:C.font,fontSize:9,color:C.label,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:2}}>{l}</div>
              <div style={{fontFamily:C.font,fontSize:13,fontWeight:500,color:C.txt}}>{v}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontFamily:C.font,fontSize:10,color:C.label}}>⏱ {timer}</span>
          <div style={{display:'flex',gap:5}} onClick={e=>e.stopPropagation()}>
            <button onClick={copy} style={{height:24,padding:'0 9px',background:'transparent',border:`1px solid ${copied?C.green:'rgba(255,255,255,0.13)'}`,borderRadius:3,fontFamily:C.font,fontSize:10,color:copied?C.green:C.txt2,cursor:'pointer'}}>
              {copied?'✓':'⇗'} {copied?'Copied':'Share'}
            </button>
            {isAdmin && <>
              <button onClick={e=>{e.stopPropagation();onEnd(hunt.userId);}} style={{height:24,padding:'0 8px',background:'transparent',border:`1px solid rgba(220,38,38,.35)`,borderRadius:3,fontFamily:C.font,fontSize:10,color:'#ff4444',cursor:'pointer'}}>End</button>
              <button onClick={e=>{e.stopPropagation();onDelete(hunt.userId);}} style={{height:24,padding:'0 8px',background:'transparent',border:`1px solid rgba(220,38,38,.35)`,borderRadius:3,fontFamily:C.font,fontSize:10,color:'#ff4444',cursor:'pointer'}}>Del</button>
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Hub({ user }) {
  const [hunts,    setHunts]    = useState([]);
  const [allHunts, setAllHunts] = useState([]);
  const [beanLive, setBeanLive] = useState({isLive:false});
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('live');
  const [ticket,   setTicket]   = useState(false);
  const [hasHunt,  setHasHunt]  = useState(false);
  const navigate = useNavigate();
  const isAdmin  = user?.isAdmin;

  useEffect(() => {
    apiFetch('/api/hunts').then(setHunts).catch(()=>{}).finally(()=>setLoading(false));
    apiFetch('/api/bean-live').then(setBeanLive).catch(()=>{});
    const joinHub = () => socket.emit('watch:hub');
    joinHub();
    socket.on('connect', joinHub);
    socket.on('hub:update', setHunts);
    socket.on('bean:live',  setBeanLive);
    return () => { socket.off('hub:update',setHunts); socket.off('bean:live',setBeanLive); socket.off('connect',joinHub); };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    apiFetch('/api/admin/hunts').then(setAllHunts).catch(()=>{});
  }, [isAdmin, hunts]);

  useEffect(() => {
    if (!user) return;
    apiFetch('/api/my-hunt').then(data => {
      if (data && (data.isLive || (data.bonuses?.length > 0) || (data.calls?.length > 0) || (data.equity?.length > 2))) {
        setHasHunt(true);
      }
    }).catch(()=>{});
  }, [user]);

  const endHunt    = async id => { if(!window.confirm('End this hunt?')) return; await apiFetch(`/api/admin/hunts/${id}/end`,{method:'POST'}); };
  const deleteHunt = async id => { if(!window.confirm('Delete permanently?')) return; await apiFetch(`/api/admin/hunts/${id}`,{method:'DELETE'}); };

  const archived = allHunts.filter(h=>!h.isLive&&h.archivedAt);
  const display  = tab==='live'?hunts:tab==='archived'?archived:allHunts.filter(h=>h.isLive||h.archivedAt);

  return (
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:C.font}}>
      <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{`
        @keyframes live-pulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.6)}60%{box-shadow:0 0 0 5px rgba(34,197,94,0)}}
        @keyframes live-ring{0%,100%{opacity:1}50%{opacity:.4}}
      `}</style>

      {/* Social links bar */}
      <div style={{background:C.sur,borderBottom:`1px solid rgba(255,255,255,0.07)`,padding:'0 1.5rem'}}>
        <div style={{padding:'0 1.5rem',height:38,display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            {SOCIALS.map(s=>(
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                title={s.label}
                style={{width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:4,opacity:.65,transition:'opacity .12s'}}
                onMouseEnter={e=>e.currentTarget.style.opacity='1'}
                onMouseLeave={e=>e.currentTarget.style.opacity='.65'}>
                {s.icon}
              </a>
            ))}
          </div>
          <button onClick={()=>setTicket(true)} style={{display:'flex',alignItems:'center',gap:5,height:26,padding:'0 10px',background:'transparent',border:`1px solid rgba(255,255,255,0.07)`,borderRadius:4,fontFamily:C.font,fontSize:10,color:C.label,cursor:'pointer',letterSpacing:'0.06em'}}>
            🎫 SUPPORT
          </button>
        </div>
      </div>

      {/* Main nav */}
      <div style={{background:C.sur,borderBottom:`1px solid rgba(255,255,255,0.13)`,padding:'0 1.5rem'}}>
        <div style={{padding:'0 1.5rem',height:58,display:'grid',gridTemplateColumns:'auto 1fr auto',alignItems:'center',gap:24}}>
          <div style={{fontFamily:C.font,fontSize:26,fontWeight:700,letterSpacing:'0.04em',color:C.txt,lineHeight:1}}>
            BeanTards <span style={{color:C.gold}}>Hunt Tracker</span>
          </div>
          <div style={{textAlign:'center'}}>
            <a href="https://discord.com/invite/beantwitch" target="_blank" rel="noopener noreferrer" style={{textDecoration:'none'}}>
              <span style={{fontFamily:"'Chakra Petch',sans-serif",fontSize:16,fontWeight:700,letterSpacing:'0.1em',background:'linear-gradient(90deg,#9146ff,#c6f135)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>#joinbeancore</span>
            </a>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            {user ? (
              <>
                <div style={{display:'flex',alignItems:'center',gap:8,background:C.card,border:`1px solid rgba(255,255,255,0.07)`,borderRadius:6,padding:'4px 10px'}}>
                  {user.avatar && <img src={user.avatar} alt="" style={{width:22,height:22,borderRadius:'50%'}}/>}
                  <span style={{fontFamily:C.font,fontSize:13,fontWeight:500,color:C.txt}}>{user.displayName}</span>
                  {isAdmin && <span style={{fontFamily:C.font,fontSize:9,color:C.gold,background:'rgba(245,165,0,.1)',border:`1px solid rgba(245,165,0,.2)`,padding:'1px 5px',borderRadius:2,letterSpacing:'0.08em'}}>ADMIN</span>}
                </div>
                <button onClick={()=>navigate('/hunt')} style={{height:34,padding:'0 16px',background:hasHunt?'transparent':C.gold,color:hasHunt?C.gold:'#000',border:hasHunt?`1px solid ${C.gold}`:'none',borderRadius:5,fontFamily:C.font,fontSize:13,fontWeight:700,cursor:'pointer',letterSpacing:'0.01em'}}>
                  {hasHunt ? '↩ Continue Hunt' : '🎰 Start a Hunt'}
                </button>
                <a href={`${API}/auth/logout`} style={{fontFamily:C.font,fontSize:11,color:C.label,textDecoration:'none'}}>Log out</a>
              </>
            ) : (
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <button onClick={()=>navigate('/hunt')} style={{height:34,padding:'0 16px',background:C.gold,color:'#000',border:'none',borderRadius:5,fontFamily:C.font,fontSize:13,fontWeight:700,cursor:'pointer'}}>My Hunt</button>
                <a href={`${API}/auth/discord`} style={{display:'flex',alignItems:'center',gap:7,height:34,padding:'0 14px',background:'#5865f2',color:'#fff',borderRadius:5,fontFamily:C.font,fontSize:13,fontWeight:600,textDecoration:'none'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                  Login
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bean live banner */}
      {beanLive.isLive && (
        <div style={{background:'rgba(145,70,255,.08)',borderBottom:`1px solid rgba(145,70,255,.2)`,padding:'.6rem 1.5rem'}}>
          <div style={{maxWidth:1400,margin:'0 auto',padding:'0 1.5rem',display:'flex',alignItems:'center',gap:10}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:'#9146ff',display:'inline-block',animation:'live-pulse 2s infinite',flexShrink:0}}/>
            <span style={{fontFamily:C.font,fontSize:15,fontWeight:700,color:'#9146ff',letterSpacing:'0.04em'}}>BEAN IS LIVE ON TWITCH</span>
            {beanLive.title && <span style={{fontFamily:C.font,fontSize:13,color:C.txt2,marginLeft:4}}>— {beanLive.title}</span>}
            <a href="https://www.twitch.tv/bean" target="_blank" rel="noopener noreferrer"
              style={{marginLeft:'auto',height:28,padding:'0 14px',background:'#9146ff',color:'#fff',borderRadius:4,fontFamily:C.font,fontSize:12,fontWeight:700,textDecoration:'none',display:'flex',alignItems:'center'}}>
              Watch →
            </a>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{maxWidth:1400,margin:'0 auto',padding:'1.75rem 1.5rem 4rem'}}>

        {/* Page header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:'1.25rem',flexWrap:'wrap',gap:10}}>
          <div>
            <h1 style={{fontFamily:C.font,fontSize:'clamp(2rem,4vw,2.8rem)',fontWeight:700,letterSpacing:'0.03em',lineHeight:1,color:C.txt}}>
              LIVE <span style={{color:C.gold}}>HUNTS</span>
            </h1>
            <div style={{fontFamily:C.font,fontSize:11,color:hunts.length?C.green:C.label,marginTop:4,letterSpacing:'0.04em'}}>
              {hunts.length ? `● ${hunts.length} hunt${hunts.length!==1?'s':''} live` : '○ No hunts live right now'}
            </div>
          </div>
          {isAdmin && (
            <div style={{display:'flex',gap:2,background:C.sur,border:`1px solid rgba(255,255,255,0.07)`,borderRadius:5,padding:2}}>
              {[['live','Live'],['archived','Archived'],['all','All']].map(([k,l])=>(
                <button key={k} onClick={()=>setTab(k)} style={{height:28,padding:'0 14px',border:'none',borderRadius:4,fontFamily:C.font,fontSize:12,fontWeight:600,cursor:'pointer',background:tab===k?C.gold:'transparent',color:tab===k?'#000':C.label,transition:'all .1s'}}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hunts grid */}
        {loading ? (
          <div style={{fontFamily:C.font,fontSize:13,color:C.label,padding:'3rem 0'}}>Loading…</div>
        ) : display.length === 0 ? (
          <div style={{background:C.card,border:`1px solid rgba(255,255,255,0.07)`,borderRadius:6,padding:'3rem',textAlign:'center'}}>
            <div style={{fontSize:40,marginBottom:12}}>🫘</div>
            <div style={{fontFamily:C.font,fontSize:24,fontWeight:700,color:C.txt,marginBottom:6}}>
              {tab==='live'?'No live hunts right now':'Nothing here'}
            </div>
            <div style={{fontFamily:C.font,fontSize:12,color:C.label,marginBottom:24}}>
              {tab==='live'?'Check back soon or start your own hunt':''}
            </div>
            <button onClick={()=>navigate('/hunt')} style={{height:40,padding:'0 24px',background:C.gold,color:'#000',border:'none',borderRadius:5,fontFamily:C.font,fontSize:14,fontWeight:700,cursor:'pointer'}}>
              {hasHunt ? '↩ Continue Hunt' : 'Start a Hunt →'}
            </button>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:1,background:'rgba(255,255,255,0.07)',border:`1px solid rgba(255,255,255,0.07)`,borderRadius:6,overflow:'hidden'}}>
            {display.map(hunt=>(
              <HuntCard key={hunt.userId} hunt={hunt} isOwn={user&&hunt.userId===user.id} isAdmin={isAdmin} onEnd={endHunt} onDelete={deleteHunt} navigate={navigate}/>
            ))}
          </div>
        )}

        {/* Stream + Leaderboard — always visible below hunts */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 400px',gap:14,marginTop:'1.75rem'}}>

          {/* Twitch player */}
          <div style={{background:C.sur,border:`1px solid rgba(255,255,255,0.07)`,borderRadius:6,overflow:'hidden',position:'relative'}}>
            <div style={{padding:'8px 12px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',gap:8,background:C.bg}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#9146ff"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>
              <span style={{fontFamily:C.font,fontSize:18,letterSpacing:'0.05em',color:C.txt}}>BEAN'S STREAM</span>
              {beanLive.isLive && (
                <span style={{display:'flex',alignItems:'center',gap:4,marginLeft:4}}>
                  <span style={{width:6,height:6,borderRadius:'50%',background:'#9146ff',display:'inline-block',animation:'live-ring 2s infinite'}}/>
                  <span style={{fontFamily:C.font,fontSize:9,color:'#9146ff',letterSpacing:'0.1em'}}>LIVE</span>
                </span>
              )}
              <a href="https://www.twitch.tv/bean" target="_blank" rel="noopener noreferrer"
                style={{marginLeft:'auto',fontFamily:C.font,fontSize:9,color:C.label,textDecoration:'none',letterSpacing:'0.06em'}}>
                OPEN ↗
              </a>
            </div>
            <iframe
              src={`https://player.twitch.tv/?channel=bean&parent=${window.location.hostname}&autoplay=false`}
              width="100%" height="420" allowFullScreen frameBorder="0"
              title="Bean Stream"
              style={{display:'block'}}
            />
          </div>

          {/* Leaderboard iframe */}
          <div style={{background:C.sur,border:`1px solid rgba(255,255,255,0.07)`,borderRadius:6,overflow:'hidden',display:'flex',flexDirection:'column'}}>
            <div style={{padding:'8px 12px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between',background:C.bg,flexShrink:0}}>
              <span style={{fontFamily:C.font,fontSize:18,letterSpacing:'0.05em',color:C.txt}}>LEADERBOARD</span>
              <a href="https://beantwitch.com/leaderboard" target="_blank" rel="noopener noreferrer"
                style={{fontFamily:C.font,fontSize:9,color:C.label,textDecoration:'none',letterSpacing:'0.06em'}}>
                FULL ↗
              </a>
            </div>
            <iframe
              src="https://beantwitch.com/leaderboard"
              title="Bean Leaderboard"
              style={{flex:1,border:'none',height:420,width:'100%',colorScheme:'dark'}}
              scrolling="yes"
            />
          </div>

        </div>

      </div>

      {ticket && <TicketModal user={user} onClose={()=>setTicket(false)}/>}
    </div>
  );
}
