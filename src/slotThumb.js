import { useState, useEffect } from 'react';
import { apiFetch } from './api';

export const thumbCache = {};

export function useSlotThumb(slotName) {
  const key = slotName?.toLowerCase();
  const [thumb, setThumb] = useState(key ? (thumbCache[key] ?? undefined) : null);
  useEffect(() => {
    if (!slotName || slotName.length < 2) { setThumb(null); return; }
    if (thumbCache[key] !== undefined) { setThumb(thumbCache[key]); return; }
    apiFetch(`/api/slots/search?q=${encodeURIComponent(slotName)}`)
      .then(res => {
        const match = Array.isArray(res) && res.find(g => g.name.toLowerCase() === key);
        const url = (match || res?.[0])?.thumb || null;
        thumbCache[key] = url;
        setThumb(url);
      }).catch(() => { thumbCache[key] = null; setThumb(null); });
  }, [slotName]);
  return thumb || null;
}

export function SlotThumb({ slot, storedThumb, width = 44, height = 33, style = {} }) {
  const looked = useSlotThumb(storedThumb != null ? null : slot);
  const thumb = storedThumb ?? looked;
  if (!thumb) return null;
  return (
    <img src={thumb} alt="" width={width} height={height}
      style={{ borderRadius: 3, objectFit: 'cover', flexShrink: 0, background: '#222226', display: 'block', ...style }}
      onError={e => { e.target.style.display = 'none'; }} />
  );
}
