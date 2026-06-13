import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiFetch, socket, API } from '../api';
import HuntTracker from '../components/HuntTracker';

const BEAN_EQUITY = { id:'bean_auto', name:'Bean', amount:1000, isRollWinner:false };

const EMPTY_HUNT = (user, huntType) => {
  const creatorName = user?.displayName || user?.username || '';
  const equity = huntType === 'vip'
    ? [
        { ...BEAN_EQUITY },
        ...(creatorName ? [{ id:'creator_auto', name:creatorName, amount:100, isRollWinner:true }] : [])
      ]
    : [];
  return {
    user: user || { id:'offline', displayName:'You', avatar:null },
    isLive: false, huntType, bonuses: [], calls: [], editors: [], equity,
  };
};

export default function MyHunt({ user }) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const urlType    = new URLSearchParams(location.search).get('type'); // 'community' | 'vip'
  const [hunt,     setHunt]     = useState(null);
  const [started,  setStarted]  = useState(false);
  const [offline,  setOffline]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const saveTimer = useRef(null);

  // Load existing online hunt if logged in
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    apiFetch('/api/my-hunt')
      .then(data => {
        if (data && data.huntType) {
          // Ensure Bean is always in VIP equity
          if (data.huntType === 'vip') {
            let changed = false;
            const hasBean = (data.equity||[]).some(e => e.name === 'Bean' || e.id === 'bean_auto');
            if (!hasBean) {
              data.equity = [{ id:'bean_auto', name:'Bean', amount:1000, isRollWinner:false }, ...(data.equity||[])];
              changed = true;
            }
            const creatorName = data.user?.displayName || data.user?.username || '';
            const hasCreator = !creatorName || (data.equity||[]).some(e => e.id === 'creator_auto' || (e.name && e.name.toLowerCase() === creatorName.toLowerCase()));
            if (!hasCreator) {
              data.equity = [...(data.equity||[]), { id:'creator_auto', name:creatorName, amount:100, isRollWinner:true }];
              changed = true;
            }
            if (changed) {
              apiFetch('/api/my-hunt', {
                method: 'PUT',
                body: JSON.stringify({ equity: data.equity, bonuses: data.bonuses, calls: data.calls, huntType: data.huntType })
              }).catch(()=>{});
            }
          }
          setHunt(data); setStarted(true); setOffline(false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Join socket room so admin/editor changes and equity calls appear instantly
    const joinRoom = () => {
      socket.emit('watch:hunt', user.id);
      socket.emit('identify', user.id);
    };
    joinRoom();
    socket.on('connect', joinRoom);

    const onHuntUpdate = (data) => {
      setHunt(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          bonuses:    data.bonuses    ?? prev.bonuses,
          calls:      data.calls      ?? prev.calls,
          equity:     data.equity     ?? prev.equity,
          huntMode:   data.huntMode   ?? prev.huntMode,
          callLimit:  data.callLimit  ?? prev.callLimit,
          roundRobin: data.roundRobin ?? prev.roundRobin,
          isLive:     data.isLive     ?? prev.isLive,
        };
      });
    };
    socket.on('hunt:update', onHuntUpdate);
    return () => {
      socket.off('hunt:update', onHuntUpdate);
      socket.off('connect', joinRoom);
    };
  }, [user]);

  const save = useCallback((newHunt) => {
    if (offline || !user) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      apiFetch('/api/my-hunt', {
        method: 'PUT',
        body: JSON.stringify({
          bonuses:    newHunt.bonuses,
          equity:     newHunt.equity,
          calls:      newHunt.calls,
          huntType:   newHunt.huntType,
          callLimit:  newHunt.callLimit,
          huntMode:   newHunt.huntMode,
          roundRobin: newHunt.roundRobin,
        })
      }).catch(console.error);
    }, 500);
  }, [offline, user]);

  const startOnlineHunt = async (huntType) => {
    try {
      await apiFetch('/api/my-hunt/start', { method: 'POST', body: JSON.stringify({ huntType }) });
      const emptyHunt = EMPTY_HUNT(user, huntType);
      if (emptyHunt.equity.length > 0) {
        await apiFetch('/api/my-hunt', {
          method: 'PUT',
          body: JSON.stringify({ bonuses: [], equity: emptyHunt.equity, calls: [], huntType })
        }).catch(()=>{});
      }
      setHunt(emptyHunt);
      setStarted(true); setOffline(false);
    } catch(e) { alert(e.message || 'Failed to start hunt — try refreshing'); }
  };

  // Auto-start from URL param (?type=community or ?type=vip)
  useEffect(() => {
    if (!loading && !started && urlType && user) {
      startOnlineHunt(urlType);
    }
  }, [loading, urlType, user]);

  const startOfflineHunt = (huntType) => {
    setHunt(EMPTY_HUNT(null, huntType));
    setStarted(true); setOffline(true);
  };

  const goLive = async () => {
    if (offline) return;
    try {
      await apiFetch('/api/my-hunt/golive', { method: 'POST' });
      setHunt(h => ({ ...h, isLive: true, startedAt: new Date().toISOString() }));
    } catch(e) { alert(e.message || 'Failed to go live — try refreshing'); }
  };

  const endHunt = async () => {
    if (!offline) await apiFetch('/api/my-hunt/end', { method: 'POST' });
    setHunt(h => ({ ...h, isLive: false }));
  };

  const resetHunt = async () => {
    if (!window.confirm('Reset your hunt? This clears everything.')) return;
    if (!offline) await apiFetch('/api/my-hunt/reset', { method: 'POST' });
    setHunt(null); setStarted(false);
  };

  const updateHunt = useCallback((updater) => {
    setHunt(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      save(next);
      return next;
    });
  }, [save]);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:"'Chakra Petch',sans-serif", fontWeight:600, color:'#666666' }}>Loading...</div>
  );

  // Start screen
  if (!started || !hunt) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', gap:28, padding:'2rem', background:'#161618', fontFamily:"'Chakra Petch',sans-serif" }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ marginBottom:10, display:'flex', justifyContent:'center' }}>
          <span style={{display:'inline-flex',alignItems:'center',gap:5}}>
            <svg width="22" height="16" viewBox="0 0 28 20" fill="none"><circle cx="10" cy="10" r="9" fill="#1a9d5a" stroke="#137a44" strokeWidth="1"/><text x="10" y="14" textAnchor="middle" fontSize="10" fontWeight="900" fill="white" fontFamily="Arial">R</text><path d="M18 4 Q26 10 18 16" stroke="#1a9d5a" strokeWidth="2.5" fill="none" strokeLinecap="round"/></svg>
            <span style={{ fontFamily:"'Chakra Petch',sans-serif", fontSize:15, fontWeight:700, color:'#1a9d5a', letterSpacing:'0.04em' }}>Rainbet</span>
          </span>
        </div>
        <h1 style={{ fontSize:'clamp(2.4rem,5vw,3.4rem)', fontWeight:700, letterSpacing:'0.04em', lineHeight:1, color:'#ffffff' }}>
          Start a <span style={{ color:'#c6f135' }}>Hunt</span>
        </h1>
        <a href="https://discord.com/invite/beantwitch" target="_blank" rel="noopener noreferrer" style={{ textDecoration:'none', display:'block', marginTop:10 }}>
          <span style={{ fontFamily:"'Chakra Petch',sans-serif", fontSize:15, fontWeight:700, letterSpacing:'0.1em', background:'linear-gradient(90deg,#9146ff,#c6f135)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>#joinbeancore</span>
        </a>
      </div>

      {/* Online hunts */}
      <div style={{ background:'#222226', border:'1px solid rgba(255,255,255,0.09)', borderRadius:6, padding:'1.5rem', width:'100%', maxWidth:440 }}>
        <div style={{ fontFamily:"'Chakra Petch',sans-serif", fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', color:'#555555', marginBottom:12 }}>
          Online — visible on hub, updates live
        </div>
        {user ? (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              {user.avatar && <img src={user.avatar} alt="" style={{ width:32, height:32, borderRadius:'50%' }} />}
              <span style={{ fontFamily:"'Chakra Petch',sans-serif", fontSize:13, color:'#cccccc' }}>{user.displayName}</span>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => startOnlineHunt('community')} style={{ flex:1, height:46, background:'transparent', border:'2px solid #c6f135', borderRadius:6, fontFamily:"'Chakra Petch',sans-serif", fontSize:14, fontWeight:700, color:'#c6f135', cursor:'pointer' }}>
                🎰 Community
              </button>
              {(user.isVipHost || user.isAdmin) && (
                <button onClick={() => startOnlineHunt('vip')} style={{ flex:1, height:46, background:'transparent', border:'2px solid #bb86fc', borderRadius:6, fontFamily:"'Chakra Petch',sans-serif", fontSize:14, fontWeight:700, color:'#bb86fc', cursor:'pointer' }}>
                  👑 VIP
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontFamily:"'Chakra Petch',sans-serif", fontSize:12, color:'#666666', marginBottom:14, lineHeight:1.6 }}>
              Login with Discord to start an online hunt and appear on the hub.
            </p>
            <a href={`${API}/auth/discord`} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, height:44, background:'#5865F2', color:'#fff', borderRadius:4, fontFamily:"'Chakra Petch',sans-serif", fontSize:14, fontWeight:700, textDecoration:'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
              Login with Discord
            </a>
          </div>
        )}
      </div>

      {/* Offline hunts */}
      <div style={{ background:'#222226', border:'1px solid rgba(255,255,255,0.09)', borderRadius:6, padding:'1.5rem', width:'100%', maxWidth:440 }}>
        <div style={{ fontFamily:"'Chakra Petch',sans-serif", fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', color:'#555555', marginBottom:8 }}>
          Offline — local only, not on hub
        </div>
        <p style={{ fontFamily:"'Chakra Petch',sans-serif", fontSize:12, color:'#666666', marginBottom:14, lineHeight:1.6 }}>
          Use the tracker without logging in. Data stays in your browser only.
        </p>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => startOfflineHunt('community')} style={{ flex:1, height:42, background:'transparent', border:'1px solid rgba(255,255,255,0.15)', borderRadius:4, fontFamily:"'Chakra Petch',sans-serif", fontSize:13, fontWeight:600, color:'#888888', cursor:'pointer' }}>
            🎰 Community
          </button>
          <button onClick={() => startOfflineHunt('vip')} style={{ flex:1, height:42, background:'transparent', border:'1px solid rgba(255,255,255,0.15)', borderRadius:4, fontFamily:"'Chakra Petch',sans-serif", fontSize:13, fontWeight:600, color:'#888888', cursor:'pointer' }}>
            👑 VIP
          </button>
        </div>
      </div>

      <button onClick={() => navigate('/')} style={{ fontFamily:"'Chakra Petch',sans-serif", fontSize:12, color:'#555555', background:'none', border:'none', cursor:'pointer' }}>← Back to Hub</button>
    </div>
  );

  return (
    <div>
      {!hunt.isLive && !offline && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:50, background:'rgba(10,10,15,.92)', backdropFilter:'blur(8px)', borderTop:'1px solid rgba(255,255,255,0.09)', padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontFamily:"'Chakra Petch',sans-serif", fontSize:12, color:'#666666' }}>Hunt not live yet — set up your bonuses and equity first</span>
          <button onClick={goLive} style={{ height:38, padding:'0 24px', background:'#c6f135', color:'#111111', border:'none', borderRadius:4, fontFamily:"'Chakra Petch',sans-serif", fontSize:13, fontWeight:700, cursor:'pointer' }}>
            🚀 Start Hunt — Go Live
          </button>
        </div>
      )}
      {offline && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:50, background:'rgba(10,10,15,.92)', backdropFilter:'blur(8px)', borderTop:'1px solid rgba(255,255,255,0.09)', padding:'10px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontFamily:"'Chakra Petch',sans-serif", fontSize:11, color:'#555555' }}>📴 Offline mode — not synced to hub</span>
          <a href={`${API}/auth/discord`} style={{ fontFamily:"'Chakra Petch',sans-serif", fontSize:11, color:'#5865F2', textDecoration:'none' }}>Login to go live →</a>
        </div>
      )}
      <HuntTracker
        hunt={hunt}
        user={user}
        readOnly={false}
        offline={offline}
        onUpdateHunt={updateHunt}
        onEndHunt={endHunt}
        onResetHunt={resetHunt}
        onBack={() => navigate('/')}
      />
    </div>
  );
}
