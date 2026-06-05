import { useState, useEffect } from 'react';
import { apiFetch } from './api';

export const thumbCache = {};

// Builds Rainbet slot URL from provider slug + game slug
function rainbetUrl(provider, slug, name) {
  if (provider && slug) return `https://rainbet.com/casino/slots/${provider}-${slug}`;
  // Fallback: search page
  if (name) return `https://rainbet.com/casino/slots?search=${encodeURIComponent(name)}`;
  return 'https://rainbet.com/casino/slots';
}

export function useSlotThumb(slotName) {
  const key = slotName?.toLowerCase();
  const cached = key ? thumbCache[key] : undefined;
  const [result, setResult] = useState(cached !== undefined ? cached : { thumb: null, slug: null, provider: null });

  useEffect(() => {
    if (!slotName || slotName.length < 2) { setResult({ thumb: null, slug: null, provider: null }); return; }
    if (thumbCache[key] !== undefined) { setResult(thumbCache[key]); return; }
    apiFetch(`/api/slots/search?q=${encodeURIComponent(slotName)}`)
      .then(res => {
        const match = Array.isArray(res) && res.find(g => g.name.toLowerCase() === key);
        const hit = match || res?.[0];
        const data = { thumb: hit?.thumb || null, slug: hit?.slug || null, provider: hit?.provider || null };
        thumbCache[key] = data;
        setResult(data);
      }).catch(() => {
        const data = { thumb: null, slug: null, provider: null };
        thumbCache[key] = data;
        setResult(data);
      });
  }, [slotName]);

  return result;
}

export function SlotThumb({ slot, storedThumb, storedSlug, storedProvider, width = 44, height = 33, style = {} }) {
  const looked = useSlotThumb(storedThumb != null ? null : slot);
  const thumb    = storedThumb  ?? looked.thumb;
  const slug     = storedSlug   ?? looked.slug;
  const provider = storedProvider ?? looked.provider;

  const href = rainbetUrl(provider, slug, slot);

  // Truncate slot name for display in fallback tile
  const displayName = slot || '';
  const words = displayName.split(' ');
  // Split into up to 2 lines, max ~12 chars per line
  let line1 = '', line2 = '';
  let cur = '';
  for (const w of words) {
    if (!line1 && (cur + ' ' + w).trim().length > 12) { line1 = cur.trim(); cur = w; }
    else { cur = cur ? cur + ' ' + w : w; }
  }
  if (!line1) { line1 = cur.trim(); cur = ''; }
  else { line2 = cur.trim(); }
  // If line2 is long, truncate
  if (line2.length > 12) line2 = line2.slice(0, 11) + '…';

  if (!thumb) {
    // Generic SVG tile with slot name
    const fontSize = width < 44 ? 6 : 7;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer"
        title={`Play ${slot} on Rainbet`}
        onClick={e => e.stopPropagation()}
        style={{ display: 'block', flexShrink: 0, cursor: 'pointer', borderRadius: 3, overflow: 'hidden', textDecoration: 'none' }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
          style={{ display: 'block', transition: 'opacity .15s', ...style }}
          onMouseEnter={e => e.target.style.opacity = '0.75'}
          onMouseLeave={e => e.target.style.opacity = '1'}>
          <defs>
            <linearGradient id={`sg_${slug||displayName.replace(/\s/g,'')}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a1a2e"/>
              <stop offset="100%" stopColor="#16213e"/>
            </linearGradient>
          </defs>
          <rect width={width} height={height} rx="3" fill={`url(#sg_${slug||displayName.replace(/\s/g,'')})`}/>
          <rect width={width} height={height} rx="3" fill="none" stroke="rgba(198,241,53,0.25)" strokeWidth="1"/>
          {/* Rainbet R logo */}
          <circle cx={width/2} cy={height*0.35} r={height*0.18} fill="rgba(26,157,90,0.3)" stroke="rgba(26,157,90,0.6)" strokeWidth="0.8"/>
          <text x={width/2} y={height*0.35+3} textAnchor="middle" fontFamily="Arial,sans-serif" fontSize={fontSize+1} fontWeight="900" fill="#1a9d5a">R</text>
          {/* Slot name */}
          <text x={width/2} y={line2 ? height*0.72 : height*0.78} textAnchor="middle"
            fontFamily="'Chakra Petch',Arial,sans-serif" fontSize={fontSize} fontWeight="700"
            fill="rgba(255,255,255,0.85)" style={{textTransform:'uppercase',letterSpacing:'0.03em'}}>
            {line1}
          </text>
          {line2 && (
            <text x={width/2} y={height*0.88} textAnchor="middle"
              fontFamily="'Chakra Petch',Arial,sans-serif" fontSize={fontSize} fontWeight="700"
              fill="rgba(255,255,255,0.85)" style={{letterSpacing:'0.03em'}}>
              {line2}
            </text>
          )}
        </svg>
      </a>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      title={`Play ${slot} on Rainbet`}
      onClick={e => e.stopPropagation()}
      style={{ display: 'block', flexShrink: 0, borderRadius: 3, overflow: 'hidden', cursor: 'pointer' }}>
      <img src={thumb} alt={slot} width={width} height={height}
        style={{ borderRadius: 3, objectFit: 'cover', display: 'block',
          background: '#222226', transition: 'opacity .15s', ...style }}
        onMouseEnter={e => e.target.style.opacity = '0.75'}
        onMouseLeave={e => e.target.style.opacity = '1'}
        onError={e => { e.target.parentElement.style.display = 'none'; }} />
    </a>
  );
}
