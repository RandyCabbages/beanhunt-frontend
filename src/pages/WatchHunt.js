import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket, apiFetch, API } from '../api';
import HuntTracker from '../components/HuntTracker';

export default function WatchHunt({ user }) {
  const { userId } = useParams();
  const navigate   = useNavigate();
  const [hunt,     setHunt]     = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [canEdit,     setCanEdit]     = useState(false);
  const [canAddCalls, setCanAddCalls] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    apiFetch(`/api/hunts/${userId}`)
      .then(data => {
        setHunt(data);
        setCanEdit(!!data.canEdit);
        setCanAddCalls(!!data.canAddCalls);
      })
      .catch(() => setNotFound(true));

    socket.emit('watch:hunt', userId);
    // Tell server our identity so it can compute canEdit for us
    if (user?.id) socket.emit('identify', user.id, user);

    socket.on('hunt:update', data => {
      setHunt(data);
      if (data && data.canEdit !== undefined) { setCanEdit(!!data.canEdit); setCanAddCalls(!!data.canAddCalls); }
    });

    // Owner invited/removed us — re-fetch to get updated canEdit
    const onReinvite = () => {
      apiFetch(`/api/hunts/${userId}`)
        .then(data => {
          setHunt(data);
          setCanEdit(!!data.canEdit);
          setCanAddCalls(!!data.canAddCalls);
        })
        .catch(() => {});
    };
    socket.on('hunt:reinvite', onReinvite);

    return () => { socket.off('hunt:update'); socket.off('hunt:reinvite', onReinvite); };
  }, [userId]);

  const save = useCallback((newHunt) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      apiFetch(`/api/hunts/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ bonuses: newHunt.bonuses, equity: newHunt.equity, calls: newHunt.calls, huntType: newHunt.huntType })
      }).catch(console.error);
    }, 500);
  }, [userId]);

  const updateHunt = useCallback((updater) => {
    setHunt(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      save(next);
      return next;
    });
  }, [save]);

  const endHunt = async () => {
    await apiFetch(`/api/admin/hunts/${userId}/end`, { method: 'POST' });
    setHunt(h => ({ ...h, isLive: false }));
  };

  const resetHunt = async () => {
    if (!window.confirm('Reset this hunt?')) return;
    await apiFetch(`/api/admin/hunts/${userId}`, { method: 'DELETE' });
    navigate('/');
  };

  // Not logged in — show login gate, redirect back to this hunt after auth
  if (user === null) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',gap:20,background:'#161618',fontFamily:"'Chakra Petch',sans-serif"}}>
      <div style={{fontSize:36,marginBottom:4}}>🎰</div>
      <h2 style={{fontSize:24,fontWeight:700,color:'#ffffff',letterSpacing:'0.04em'}}>Login to view this hunt</h2>
      <p style={{fontSize:13,color:'#b0b0b0',marginBottom:8}}>You need to be logged in to watch hunts.</p>
      <a href={`${API}/auth/discord?returnTo=/hunt/${userId}`}
        style={{display:'flex',alignItems:'center',gap:8,height:46,padding:'0 24px',background:'#5865F2',color:'#fff',borderRadius:6,fontFamily:"'Chakra Petch',sans-serif",fontSize:14,fontWeight:700,textDecoration:'none'}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
        Login with Discord
      </a>
      <button onClick={()=>navigate('/')} style={{fontFamily:"'Chakra Petch',sans-serif",fontSize:12,color:'#666',background:'none',border:'none',cursor:'pointer'}}>← Back to Hub</button>
    </div>
  );

  if (notFound) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', gap:12 }}>
      <div style={{ fontFamily:"'Chakra Petch',sans-serif", fontSize:13, color:'#666666' }}>This hunt isn't available.</div>
      <button onClick={() => navigate('/')} style={{ fontFamily:"'Chakra Petch',sans-serif", fontSize:13, color:'#c6f135', background:'none', border:'none', cursor:'pointer' }}>← Back to Hub</button>
    </div>
  );

  if (!hunt) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:"'Chakra Petch',sans-serif", color:'#666666' }}>
      Loading hunt...
    </div>
  );

  return (
    <HuntTracker
      hunt={hunt}
      user={user}
      readOnly={!canEdit}
      canAddCalls={canAddCalls}
      onUpdateHunt={canEdit ? updateHunt : undefined}
      onEndHunt={canEdit ? endHunt : undefined}
      onResetHunt={canEdit ? resetHunt : undefined}
      onBack={() => navigate('/')}
    />
  );
}
