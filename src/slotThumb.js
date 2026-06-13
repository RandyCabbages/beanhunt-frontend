import { useState, useEffect } from 'react';
import { apiFetch, API } from './api';

export const thumbCache = {};

// slot.report provider_slug → Rainbet URL prefix
// Confirmed from actual Rainbet URLs
const RAINBET_PROVIDER_MAP = {
  'pragmatic-play':   'pragmatic-play',
  'playngo':          'play-n-go',
  'hacksaw-gaming':   'hacksaw',
  'nolimit-city':     'nolimit',
  'relax-gaming':     'relax',
  'bgaming':          'bgaming',
  'elk-studios':      'elk-studios',
  'red-tiger':        'red-tiger',
  'push-gaming':      'push-gaming',
  'blueprint-gaming': 'blueprint',
  'quickspin':        'quickspin',
  'thunderkick':      'thunderkick',
  'yggdrasil':        'yggdrasil',
  'netent':           'netent',
  'big-time-gaming':  'big-time-gaming',
  'wazdan':           'wazdan',
  'spinomenal':       'spinomenal',
};

// Builds Rainbet slot URL from provider slug + game slug
function rainbetUrl(provider, slug, name) {
  const rbProvider = RAINBET_PROVIDER_MAP[provider] || provider;
  if (rbProvider && slug) return `https://rainbet.com/casino/slots/${rbProvider}-${slug}`;
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
        const rawThumb = hit?.thumb || null;
        // Normalize relative proxy URLs to absolute
        const thumb = rawThumb?.startsWith('/api/img-proxy') ? `${API}${rawThumb}` : rawThumb;
        const data = { thumb, slug: hit?.slug || null, provider: hit?.provider || null };
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
  // Normalize any relative /api/img-proxy URLs to absolute
  const normalizeThumb = t => t?.startsWith('/api/img-proxy') ? `${API}${t}` : t || null;
  const thumb    = normalizeThumb(storedThumb)  ?? looked.thumb;
  const slug     = storedSlug   ?? looked.slug;
  const provider = storedProvider ?? looked.provider;
  const [imgFailed, setImgFailed] = useState(false);

  const href = rainbetUrl(provider, slug, slot);

  // Truncate slot name for display in fallback tile
  const displayName = slot || '';
  const fontSize = width < 44 ? 6 : 7;
  const maxChars = Math.floor(width / (fontSize * 0.62));
  const words = displayName.split(' ');
  let line1 = '', line2 = '', cur = '';
  for (const w of words) {
    const candidate = cur ? cur + ' ' + w : w;
    if (!line1 && candidate.length > maxChars) { line1 = cur || w.slice(0, maxChars); cur = cur ? w : ''; }
    else { cur = candidate; }
  }
  if (!line1) { line1 = cur.trim(); cur = ''; }
  else if (cur) { line2 = cur.trim(); }
  // Hard truncate with ellipsis
  if (line1.length > maxChars) line1 = line1.slice(0, maxChars - 1) + '…';
  if (line2.length > maxChars) line2 = line2.slice(0, maxChars - 1) + '…';

  const showFallback = !thumb || imgFailed;
  const gradId = `sg_${(slug||displayName).replace(/[^a-zA-Z0-9]/g,'')}`;

  if (showFallback) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer"
        title={`Play ${slot} on Rainbet`}
        onClick={e => e.stopPropagation()}
        style={{ display: 'block', flexShrink: 0, cursor: 'pointer', borderRadius: 3, overflow: 'hidden', textDecoration: 'none' }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
          style={{ display: 'block', transition: 'opacity .15s', ...style }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a1a2e"/>
              <stop offset="100%" stopColor="#16213e"/>
            </linearGradient>
            <clipPath id={`clip_${gradId}`}>
              <rect width={width} height={height} rx="3"/>
            </clipPath>
          </defs>
          <rect width={width} height={height} rx="3" fill={`url(#${gradId})`}/>
          <rect width={width} height={height} rx="3" fill="none" stroke="rgba(198,241,53,0.25)" strokeWidth="1"/>
          <g clipPath={`url(#clip_${gradId})`}>
          <circle cx={width/2} cy={height*0.35} r={height*0.18} fill="rgba(26,157,90,0.3)" stroke="rgba(26,157,90,0.6)" strokeWidth="0.8"/>
          <text x={width/2} y={height*0.35+3} textAnchor="middle" fontFamily="Arial,sans-serif" fontSize={fontSize+1} fontWeight="900" fill="#1a9d5a">R</text>
          <text x={width/2} y={line2 ? height*0.72 : height*0.78} textAnchor="middle"
            fontFamily="'Chakra Petch',Arial,sans-serif" fontSize={fontSize} fontWeight="700"
            fill="rgba(255,255,255,0.85)">
            {line1}
          </text>
          {line2 && (
            <text x={width/2} y={height*0.88} textAnchor="middle"
              fontFamily="'Chakra Petch',Arial,sans-serif" fontSize={fontSize} fontWeight="700"
              fill="rgba(255,255,255,0.85)">
              {line2}
            </text>
          )}
          </g>
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
        onError={() => setImgFailed(true)} />
    </a>
  );
}
