import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket, apiFetch } from '../api';
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
    if (user?.id) socket.emit('identify', user.id);

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
