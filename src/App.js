import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { apiFetch, socket, API } from './api';
import Hub from './pages/Hub';
import MyHunt from './pages/MyHunt';
import WatchHunt from './pages/WatchHunt';
import Overlay from './pages/Overlay';

export default function App() {
  const [user, setUser] = useState(undefined);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const authParam = params.get('auth');
    if (authParam) {
      try {
        const userData = JSON.parse(atob(decodeURIComponent(authParam)));
        setUser(userData);
        window.history.replaceState({}, '', location.pathname);
        socket.connect();
        return;
      } catch(e) {}
    }
    apiFetch('/auth/me')
      .then(d => setUser(d.user || null))
      .catch(() => setUser(null));
    socket.connect();
    return () => socket.disconnect();
  }, []);

  if (user === undefined) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:"'Chakra Petch',sans-serif", color:'#666666', background:'#111111' }}>
      Loading...
    </div>
  );

  return (
    <Routes>
      <Route path="/"               element={<Hub user={user} />} />
      <Route path="/hunt"           element={<MyHunt user={user} />} />
      <Route path="/hunt/:userId"   element={<WatchHunt user={user} />} />
      <Route path="/overlay/:userId" element={<Overlay />} />
    </Routes>
  );
}
