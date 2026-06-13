import { useState, useCallback, useEffect, useRef } from 'react';
import { apiFetch, socket, API } from '../api';
import { SlotThumb, useSlotThumb, thumbCache } from '../slotThumb';

/* ── Design tokens ───────────────────────────────────────────────── */
const G = {
  bg:'#161618', bg2:'#1c1c1f', sur:'#222226', card:'#26262a', lift:'#2c2c32', ridge:'#36363e',
  bdr:'rgba(255,255,255,0.15)', bb:'rgba(255,255,255,0.28)',
  gold:'#c6f135', gold2:'#d4f55a', gdim:'rgba(198,241,53,0.14)',
  green:'#4ade80', gndim:'rgba(74,222,128,0.12)',
  red:'#f87171', rdim:'rgba(248,113,113,0.12)',
  purple:'#c084fc', pdim:'rgba(192,132,252,0.12)',
  t1:'#ffffff', t2:'#e8e8e8', t3:'#b0b0b0', t4:'#808080',
  display:"'Chakra Petch',sans-serif",
  body:"'Chakra Petch',sans-serif",
  mono:"'Chakra Petch',sans-serif",
};

const RainbetLogo = ({size=14}) => (
  <span style={{display:'inline-flex',alignItems:'center',gap:4}}>
    <svg width={Math.round(size*1.6)} height={size} viewBox="0 0 28 20" fill="none">
      <circle cx="10" cy="10" r="9" fill="#1a9d5a" stroke="#137a44" strokeWidth="1"/>
      <text x="10" y="14" textAnchor="middle" fontSize="10" fontWeight="900" fill="white" fontFamily="Arial">R</text>
      <path d="M18 4 Q26 10 18 16" stroke="#1a9d5a" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    </svg>
    <span style={{fontFamily:"'Chakra Petch',sans-serif",fontWeight:700,fontSize:size,color:'#1a9d5a',letterSpacing:'0.02em'}}>Rainbet</span>
  </span>
);

const fmt  = v => '$'+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtS = v => (v<0?'-':'+')+fmt(v);
const uid  = () => Math.random().toString(36).slice(2,8);

/* ── Slot list ───────────────────────────────────────────────────── */
// Cache inside a closure to avoid module-level TDZ issues with circular imports
const _slotCache = (() => {
  let slots = [];
  let promise = null;
  return {
    get: () => slots,
    set: (v) => { slots = v; },
    getPromise: () => promise,
    setPromise: (p) => { promise = p; },
  };
})();

// Maps slot.report provider slugs → Rainbet URL provider prefix
const RAINBET_PROVIDER_MAP = {
  'pragmatic-play':'pragmatic-play','playngo':'play-n-go','hacksaw-gaming':'hacksaw',
  'nolimit-city':'nolimit','relax-gaming':'relax','bgaming':'bgaming',
  'elk-studios':'elk-studios','red-tiger':'red-tiger','push-gaming':'push-gaming',
  'blueprint-gaming':'blueprint','quickspin':'quickspin','thunderkick':'thunderkick',
  'yggdrasil':'yggdrasil','netent':'netent','big-time-gaming':'big-time-gaming',
  'wazdan':'wazdan','spinomenal':'spinomenal','iron-dog-studio':'iron-dog-studio',
  'backseat-gaming':'hacksaw','isoftbet':'isoftbet','gameart':'gameart',
};
function toRainbetUrl(provider, slug, name) {
  const rbp = RAINBET_PROVIDER_MAP[provider] || provider;
  if (rbp && slug) return `https://rainbet.com/casino/slots/${rbp}-${slug}`;
  if (name) return `https://rainbet.com/casino/slots?search=${encodeURIComponent(name)}`;
  return 'https://rainbet.com/casino/slots';
}
async function fetchSlots() {
  if (_slotCache.get().length) return _slotCache.get();
  if (_slotCache.getPromise()) return _slotCache.getPromise();
  const p = (async () => {
    try {
      const res = await apiFetch('/api/slots/search?q=&limit=9999');
      if (Array.isArray(res) && res.length > 0) {
        const slots = res.filter(s => s && s.name).map(s => {
          let thumb = s.thumb || null;
          if (thumb && thumb.startsWith('/api/img-proxy')) {
            thumb = `${API}${thumb}`;
          }
          return { name: s.name, thumb, slug: s.slug || null, provider: s.provider || null };
        });
        _slotCache.set(slots);
        console.log(`[SlotInput] Loaded ${slots.length} slots from API`);
      }
    } catch(e) { console.error('[SlotInput] fetchSlots failed:', e); }
    return _slotCache.get();
  })();
  _slotCache.setPromise(p);
  return p;
}

// fetchSlots is called by SlotInput on mount — not at module level
// (module-level calls run before React initializes and cause circular init errors)

const RAINBET_SLOTS_LEGACY = [
  'Gates of Olympus','Gates of Olympus 1000',
  'Sweet Bonanza','Sweet Bonanza 1000','Sweet Bonanza Xmas',
  'Starlight Princess','Starlight Princess 1000','Starlight Princess 100',
  'Fruit Party','Fruit Party 2',
  'Dog House','Dog House Megaways','Dog House 100x',
  'Wild West Gold','Wild West Gold Megaways',
  'Wolf Gold','Wolf Gold Megaways',
  'Big Bass Bonanza','Big Bass Bonanza Megaways','Big Bass Splash',
  'Big Bass Amazon Xtreme','Big Bass Christmas Bash','Big Bass Day at the Races',
  'Big Bass Hold and Spinner','Big Bass Halloween',
  'Fishin Frenzy','Fishin Frenzy Megaways','Fishin Bigger Pots of Gold',
  'Power of Thor Megaways','Great Rhino Megaways','Great Rhino',
  'Buffalo King','Buffalo King Megaways','Fire Stampede','Tundra Wilds',
  '5 Lions Gold','5 Lions Megaways','5 Lions Dance','5 Lions',
  'Eye of Cleopatra','Aztec King','Aztec Bonanza','Aztec Gems',
  'Floating Dragon','Floating Dragon Hold and Spin',
  'Dragon Kingdom','Dragon Kingdom Eyes of Fire',
  'Gems Bonanza','Candy Stars','Sweet Powernudge',
  'Big Juan','Sword of Ares','Fury of Odin Megaways',
  'Barn Festival','Gold Party','Cash Bonanza',
  'Pirate Golden Age','Treasure Wild',
  'Chilli Heat','Chilli Heat Megaways',
  'Fire Hot 5','Fire Hot 20','Fire Hot 40',
  'Wild Wild Riches','Wild Wild Riches Megaways',
  'Sugar Rush','Sugar Rush 1000','Sugar Rush Xmas',
  'Release the Kraken','Release the Kraken 2',
  'Twilight Princess','Hand of Midas','Hand of Midas 2',
  'Curse of the Werewolf Megaways','Cash Elevator',
  'Wanted Dead or Wild',
  'Chaos Crew','Chaos Crew 2','Chaos Crew Megaways',
  'Stick Em','Highrise','Space Miners',
  'Beast Mode','Harlequin Crew','Misery Mining',
  'Max Megaways 1','Mental','Slash Em',
  'Money Train 3','Money Train 4',
  'Tombstone RIP','Tombstone No Mercy','Tombstone',
  'Deadwood','Deadwood xNudge',
  'Hellcatraz','San Quentin xWays',
  'Fire in the Hole xBomb','Fire in the Hole 2',
  'Punk Rocker','East Coast vs West Coast','Folsom Prison',
  'Warrior Graveyard xNudge','Infectious 5 xWays',
  'Iron Bank','Night of Blood xNudge',
  'Money Cart 3','Money Cart 2','Money Cart Bonus Reels',
  'Razor Shark','Laser Fruit','Snake Arena','Book of 99',
  'Book of Dead','Legacy of Dead','Rise of Dead','Doom of Dead',
  'Fire Joker','Fire Joker Freeze',
  'Reactoonz','Reactoonz 2','Tome of Madness',
  'Moon Princess','Moon Princess 100','Boat Bonanza',
  'Rich Wilde and the Amulet of Dead',
  'Fat Santa','Jammin Jars','Jammin Jars 2',
  'Wild Swarm','Wild Swarm 2','Dinopolis',
  'Extra Chilli','Extra Chilli Megaways',
  'Bonanza','Bonanza Megaways','Rick and Morty Megaways',
  'Lil Devil','Danger High Voltage','White Rabbit Megaways',
  'Vikings Go Berzerk','Joker Millions','Nirvana',
  'Fruit Warp','Esqueleto Explosivo 2',
  'Piggy Riches Megaways','Primal Megaways',
  'Dead or Alive','Dead or Alive 2','Dead or Alive 2 Feature Buy',
  'Narcos','Blood Suckers 2','Divine Fortune','Divine Fortune Megaways',
  'Twin Spin','Twin Spin Megaways',"Gonzo's Quest Megaways",
  'Starburst','Starburst XXXtreme',
  'Wild Overlords','Bloopers','Wild Toro','Wild Toro 2',
  'Pirots','Pirots 2','Pirots 3',
  'Chicken Drop','9K Yeti','Big Belly Bonanza','Fat Banker',
  'Book of Ra','Book of Ra Deluxe','Book of Adventure',
  'Joker Bombs','Pug Life','Nitropolis 3','Nitropolis 4',
  'Eye of Horus','Eye of Horus Megaways',
  'Stampede','Stallion Strike',"Tiger's Glory","Blackbeard's Compass",
  "Joker's Jewels","Joker's Jewels Deluxe",
  "Dragon's Fire","Dragon's Fire Megaways",
].sort().map(s => ({ name: s, thumb: null }));

function shuffle(a){const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}

function buildQueue(calls){
  const bu={},order=[];
  calls.forEach(c=>{if(!bu[c.user]){bu[c.user]=[];order.push(c.user);}bu[c.user].push(c);});
  const q=[];let r=0,any=true;
  while(any){any=false;order.forEach(u=>{if(bu[u][r]){q.push(bu[u][r]);any=true;}});r++;}
  return q;
}

/* ── Slot autocomplete input ─────────────────────────────────────── */
function SlotInput({ value, onChange, onCommit, placeholder, style, inputHeight }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen]               = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(!_slotCache.get().length);
  const [allSlots, setAllSlots]       = useState(_slotCache.get().length ? _slotCache.get() : []);
  const allSlotsRef = useRef(allSlots);
  const valueRef    = useRef(value);
  const wrapRef     = useRef(null);

  useEffect(() => { valueRef.current = value; }, [value]);

  const search = useCallback((v, pool) => {
    if (v.length < 2) { setSuggestions([]); setOpen(false); return; }
    const q = v.toLowerCase();
    const slots = pool || allSlotsRef.current;
    if (!slots.length) return; // slots not loaded yet — wait
    const filtered = slots.filter(s => s && s.name && s.name.toLowerCase().includes(q));
    filtered.sort((a, b) => {
      const an = a.name.toLowerCase(), bn = b.name.toLowerCase();
      const aStarts = an.startsWith(q), bStarts = bn.startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      const aWord = an.split(/\s+/).some(w => w.startsWith(q));
      const bWord = bn.split(/\s+/).some(w => w.startsWith(q));
      if (aWord && !bWord) return -1;
      if (!aWord && bWord) return 1;
      return an.localeCompare(bn);
    });
    setSuggestions(filtered.slice(0, 12));
    setOpen(filtered.length > 0);
  }, []);

  useEffect(() => {
    fetchSlots().then(slots => {
      setLoadingSlots(false);
      if (slots.length) {
        setAllSlots(slots);
        allSlotsRef.current = slots;
        // Re-run search if user already typed something while fetch was in flight
        if (valueRef.current.length >= 2) search(valueRef.current, slots);
      }
    });
  }, [search]);

  const handleChange = v => { onChange(v); search(v); };
  const pick = s => { onChange(s.name); setSuggestions([]); setOpen(false); };

  return (
    <div ref={wrapRef} style={{ position:'relative', ...style }}>
      {loadingSlots && (
        <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', width:6, height:6, borderRadius:'50%', background:G.gold, opacity:0.7, animation:'pulse-dot 1.2s infinite', zIndex:2, pointerEvents:'none' }} />
      )}
      <input value={value} onChange={e => handleChange(e.target.value)}
        onFocus={() => search(value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => {
          if (e.key === 'Enter' && suggestions.length > 0) { pick(suggestions[0]); }
          else if (e.key === 'Enter' && onCommit) { onCommit(value); }
          if (e.key === 'Escape') { setSuggestions([]); setOpen(false); }
        }}
        placeholder={placeholder || 'Slot name…'}
        style={{ width:'100%', height: inputHeight || 34, background:G.sur, border:`1px solid ${G.bdr}`,
          borderRadius:3, padding:'0 14px', fontFamily:G.body, fontSize:18, color:G.t1, outline:'none' }}
      />
      {open && suggestions.length > 0 && (
        <div style={{ position:'absolute', top:'calc(100% + 2px)', left:0, right:0, background:G.card,
          border:`1px solid ${G.bb}`, borderRadius:3, zIndex:60, maxHeight:220, overflowY:'auto' }}>
          {suggestions.map((s,i) => (
            <div key={i} onMouseDown={() => pick(s)}
              style={{ padding:'5px 10px', fontFamily:G.body, fontSize:13, color:G.t2,
                cursor:'pointer', borderBottom:`1px solid ${G.bdr}`, letterSpacing:'0.01em',
                transition:'background .08s', display:'flex', alignItems:'center', gap:10 }}
              onMouseEnter={e => e.currentTarget.style.background = G.lift}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <SlotThumb slot={s.name} storedThumb={s.thumb||null} storedSlug={s.slug||null} storedProvider={s.provider||null} width={36} height={27} />
              <span>{s.name}</span>
            </div>
          ))}
        </div>
      )}
      {open && suggestions.length === 0 && value.length >= 2 && (
        <div style={{ position:'absolute', top:'calc(100% + 2px)', left:0, right:0, background:G.card,
          border:`1px solid ${G.bb}`, borderRadius:3, zIndex:60, padding:'10px 12px',
          fontFamily:G.mono, fontSize:11, color:G.t4, letterSpacing:'0.04em' }}>
          {allSlotsRef.current.length === 0 ? 'Loading slots…' : 'No slots found'}
        </div>
      )}
    </div>
  );
}

/* ── Stat tile ───────────────────────────────────────────────────── */
function StatTile({ label, value, color, accent, wide }) {
  return (
    <div style={{ flex: wide ? '2 1 160px' : '1 1 110px', padding:'1rem 1.1rem',
      borderRight:`1px solid ${G.bdr}`, borderBottom:`1px solid ${G.bdr}`,
      position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2,
        background:`linear-gradient(90deg, ${accent||G.gold}44, transparent)` }} />
      <div style={{ fontFamily:G.mono, fontSize:10, fontWeight:700, color:G.t3, letterSpacing:'0.1em',
        textTransform:'uppercase', marginBottom:5 }}>{label}</div>
      <div style={{ fontFamily:G.display, fontSize:'1.9rem', fontWeight:700, color:color||'#ffffff',
        letterSpacing:'0.02em', lineHeight:1 }}>{value}</div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export default function HuntTracker({ hunt, user, readOnly, offline, canAddCalls, onUpdateHunt, onEndHunt, onResetHunt, onBack, onHuntRefresh }) {
  const isVip   = hunt.huntType === 'vip';
  const accent  = isVip ? G.purple : G.gold;
  const acDim   = isVip ? G.pdim   : G.gdim;
  const acStr   = isVip ? 'rgba(187,134,252,.6)' : 'rgba(255,179,0,.6)';

  const runnerName = (hunt.user?.displayName || hunt.user?.username || '').toLowerCase().trim();
  const iconFor = (e, size=12) => {
    const n = (e.name||'').toLowerCase().trim();
    if (e.id==='bean_auto' || n==='bean')
      return <span style={{fontSize:size,flexShrink:0,lineHeight:1}}>👑</span>;
    if (e.id==='creator_auto' || (runnerName && n===runnerName))
      return <span style={{fontSize:size,flexShrink:0,lineHeight:1}}>⚔️</span>;
    if (e.isRollWinner)
      return <span style={{fontSize:size,flexShrink:0,lineHeight:1}}>🎲</span>;
    if (e.isMod)
      return <svg style={{flexShrink:0}} width={size} height={size} viewBox="0 0 20 20" fill="#9146ff"><path d="M10 0L7 7H0l6 4.5L4 18l6-4 6 4-2-6.5L20 7h-7z"/></svg>;
    if (e.name||e.amount>0)
      return <span style={{fontSize:size,flexShrink:0,lineHeight:1,opacity:0.6}}>💰</span>;
    return null;
  };

  const [huntMode,      setHuntMode]      = useState(hunt.huntMode||'creating');
  const [showWinners,   setShowWinners]   = useState(false);
  const [slotInput,     setSlotInput]     = useState('');
  const [betInput,      setBetInput]      = useState('');
  const [callerInput,   setCallerInput]   = useState('');
  const [betPrompt,     setBetPrompt]     = useState(null);
  const [activeScat,    setActiveScat]    = useState(3);
  const [callModal,     setCallModal]     = useState(false);
  const [callName,      setCallName]      = useState('');
  const [callSlot,      setCallSlot]      = useState('');
  const [discordText,   setDiscordText]   = useState('');
  const [parseHint,     setParseHint]     = useState('');
  const [defAmt,        setDefAmt]        = useState(100);
  const [beanAmt,       setBeanAmt]       = useState(1000);
  const [inviteModal,   setInviteModal]   = useState(false);
  const [inviteUser,    setInviteUser]    = useState('');
  const [inviteList,    setInviteList]    = useState(hunt.invitedEditors||[]);
  const [saveStatus,    setSaveStatus]    = useState('');
  const [huntTimer,     setHuntTimer]     = useState('');
  const [copyResult,    setCopyResult]    = useState(false);
  const [shareCopied,   setShareCopied]   = useState(false);
  const [obsCopied,     setObsCopied]     = useState(false);
  const [currentSlot,   setCurrentSlot]   = useState(null);
  const [slotCountModal,setSlotCountModal]= useState(false);
  const [scatInput,     setScatInput]     = useState(3);
  const [slotCountInput,setSlotCountInput]= useState('35');
  const [limitModal,    setLimitModal]    = useState(false);
  const [limitInput,    setLimitInput]    = useState(String(hunt.callLimit||0));
  const [dragCallId,    setDragCallId]    = useState(null);
  const [dragEquityId,  setDragEquityId]  = useState(null);
  const [dragBonusId,   setDragBonusId]   = useState(null);
  const [flippedCard,   setFlippedCard]   = useState(null);   // equity member id currently flipped
  const [cardInfoMap,   setCardInfoMap]   = useState({});     // id -> {rainbetName, totalPayout, huntCount}
  const [huntHistory,   setHuntHistory]   = useState([]);     // undo stack
  const [beanLive,      setBeanLive]      = useState({isLive:false,title:''});
  const [dcImporting,   setDcImporting]   = useState(false);
  const [showPasteCalls, setShowPasteCalls] = useState(false);
  const [pasteCallsText, setPasteCallsText] = useState('');
  const [dcWinners,     setDcWinners]     = useState(false);
  const [showDcImport,  setShowDcImport]  = useState(false);
  const [callRequests,  setCallRequests]  = useState([]);
  const [showReqPopup,  setShowReqPopup]  = useState(false);
  const [reqStatus,     setReqStatus]     = useState(null); // null | 'pending' | 'granted' | 'denied'
  const [eqTooltip,     setEqTooltip]     = useState(null);
  const saveTimeout = useRef(null);
  const huntRef     = useRef(hunt);
  useEffect(() => { huntRef.current = hunt; }, [hunt]);

  useEffect(() => {
    if (hunt.huntMode && hunt.huntMode !== huntMode) {
      setHuntMode(hunt.huntMode);
    }
  }, [hunt.huntMode]);

  useEffect(() => {
    const tick = () => {
      if (!hunt.startedAt) return setHuntTimer('');
      const m = Math.floor((Date.now()-new Date(hunt.startedAt))/60000);
      setHuntTimer(m<1?'<1m':m<60?`${m}m`:`${Math.floor(m/60)}h${m%60}m`);
    };
    tick(); const t = setInterval(tick,30000); return () => clearInterval(t);
  }, [hunt.startedAt]);

  useEffect(() => {
    // Bean live status
    apiFetch('/api/bean-live').then(d => setBeanLive(d)).catch(()=>{});
    const onBeanLive = d => setBeanLive(d);
    socket.on('bean:live', onBeanLive);

    // Call request notifications (hunt owner sees incoming requests)
    const onReqNew = ({ requests }) => setCallRequests(requests||[]);
    const onReqUpd = ({ requests }) => setCallRequests(requests||[]);
    socket.on('calls:request:new', onReqNew);
    socket.on('calls:request:update', onReqUpd);

    // Equity member gets notified their request was granted/denied
    const onGranted = ({ userId }) => { if (user?.id === userId) setReqStatus('granted'); };
    const onDenied  = ({ userId }) => { if (user?.id === userId) setReqStatus('denied'); };
    socket.on('calls:granted', onGranted);
    socket.on('calls:denied',  onDenied);

    return () => {
      socket.off('bean:live', onBeanLive);
      socket.off('calls:request:new', onReqNew);
      socket.off('calls:request:update', onReqUpd);
      socket.off('calls:granted', onGranted);
      socket.off('calls:denied',  onDenied);
    };
  }, [user?.id]);

  const upd = useCallback(fn => {
    if (readOnly || !onUpdateHunt) return;
    setHuntHistory(prev => [...prev.slice(-29), huntRef.current]);
    setSaveStatus('saving');
    onUpdateHunt(fn);
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => setSaveStatus('saved'), 900);
    setTimeout(() => setSaveStatus(''), 2800);
  }, [readOnly, onUpdateHunt]);

  const undo = useCallback(() => {
    if (!huntHistory.length || !onUpdateHunt) return;
    const prev = huntHistory[huntHistory.length - 1];
    setHuntHistory(h => h.slice(0, -1));
    setSaveStatus('saving');
    onUpdateHunt(() => prev);
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => setSaveStatus('saved'), 900);
    setTimeout(() => setSaveStatus(''), 2800);
  }, [huntHistory, onUpdateHunt]);

  const parseDiscordWinners = useCallback(async (defAmt) => {
    if (dcWinners) return;
    setDcWinners(true);
    try {
      const data = await apiFetch('/api/discord/parse-winners');
      if (!data.winners?.length) { alert('No winners found in Discord.'); setDcWinners(false); return; }
      const allWinnerNames = new Set(data.winners.map(w => w.name.toLowerCase().trim()));
      upd(h => {
        const mergedEq = h.equity.map(e => {
          const n = (e.name||'').toLowerCase().trim();
          if (n === 'bean' || e.id === 'bean_auto') return e;
          if (n && allWinnerNames.has(n)) {
            allWinnerNames.delete(n);
            const prevRoll = e.rollAmount||0;
            return {...e, amount: parseFloat((e.amount + defAmt).toFixed(2)), rollAmount: parseFloat((prevRoll + defAmt).toFixed(2)), isRollWinner: true};
          }
          return e;
        });
        const existingNames = new Set(mergedEq.map(e=>(e.name||'').toLowerCase().trim()));
        const newWinners = data.winners
          .filter(w => allWinnerNames.has(w.name.toLowerCase().trim()))
          .map(w => ({id:uid(), name:w.name, amount:defAmt, isRollWinner:true}));
        return {...h, equity: [...mergedEq, ...newWinners]};
      });
    } catch(e) { alert(e.message||'Failed to fetch winners'); }
    setDcWinners(false);
  }, [dcWinners, upd]);

  const changeMode = mode => { setHuntMode(mode); upd(h=>({...h, huntMode:mode})); };

  const bonuses = hunt.bonuses||[];
  const equity  = hunt.equity||[];
  const calls   = hunt.calls||[];
  const callLimit = hunt.callLimit||0;

  const totalPot  = equity.reduce((s,e)=>s+e.amount,0);
  const totalWon  = bonuses.reduce((s,b)=>s+b.win,0);
  const xs        = bonuses.filter(b=>b.win>0&&b.bet>0).map(b=>b.win/b.bet);
  const avgX      = xs.length ? xs.reduce((a,v)=>a+v,0)/xs.length : null;
  const highX     = xs.length ? Math.max(...xs) : null;
  const remBets   = bonuses.filter(b=>!b.win).reduce((s,b)=>s+b.bet,0);
  const reqX      = remBets>0&&totalWon<totalPot ? (totalPot-totalWon)/remBets : null;
  const bestBonus = bonuses.filter(b=>b.win>0&&b.bet>0).reduce((best,b)=>{const x=b.win/b.bet;return x>(best?best.x:0)?{slot:b.slot,x}:best;},null);
  const rollerMap = {};
  bonuses.forEach(b=>{if(b.caller&&b.win)rollerMap[b.caller]=(rollerMap[b.caller]||0)+b.win;});
  const bestRoller = Object.entries(rollerMap).sort((a,b)=>b[1]-a[1])[0];
  const rolledCount = bonuses.filter(b=>b.win>0).length;

  // Top caller: person with most bonuses called (status 'in' calls / bonuses with caller set)
  const callerMap = {};
  bonuses.forEach(b=>{ if(b.caller) callerMap[b.caller]=(callerMap[b.caller]||0)+1; });
  const topCaller = Object.entries(callerMap).sort((a,b)=>b[1]-a[1])[0];

  // Req X display helper
  const reqXVal = totalWon>=totalPot&&totalPot>0?'PROFIT!':reqX?reqX.toFixed(1)+'x':'—';
  const reqXColor = totalWon>=totalPot&&totalPot>0?G.green:reqX?(reqX<=100?G.green:G.red):G.t3;

  const equityDisplay = equity.filter(e=>e.name||e.amount>0);

  /* ── Actions ── */
  const addBonus = (slot, bet, scat=3, caller=null) => {
    const slotName = slot||slotInput||'Unknown';
    const slotData = _slotCache.get().find(s => s.name.toLowerCase() === slotName.toLowerCase());
    const callerName = caller || callerInput || null;
    upd(h=>({...h,bonuses:[...h.bonuses,{
      id:uid(), slot:slotName, bet:parseFloat(bet||betInput)||0, win:0, mult:0, scat, caller:callerName,
      thumb: slotData?.thumb || null,
      slug: slotData?.slug || null,
      provider: slotData?.provider || null,
    }]}));
    setSlotInput(''); setBetInput(''); setCallerInput('');
  };
  const updateBonus = (id,field,val) => upd(h=>({...h,bonuses:h.bonuses.map(b=>{
    if(b.id!==id)return b;const num=parseFloat(val)||0;
    let u={...b,[field]:field==='slot'?val:num};
    if(field==='win'&&b.bet>0)u.mult=parseFloat((num/b.bet).toFixed(2));
    return u;
  })}));
  const removeBonus = id => upd(h=>({...h,bonuses:h.bonuses.filter(b=>b.id!==id)}));

  const addPerson      = ()        => upd(h=>({...h,equity:[...h.equity,{id:uid(),name:'',amount:0,isRollWinner:false}]}));
  const addRollWinner  = ()        => upd(h=>({...h,equity:[...h.equity,{id:uid(),name:'',amount:defAmt,isRollWinner:true}]}));

  const updatePerson = (id,f,v) => upd(h=>({...h,equity:h.equity.map(e=>e.id!==id?e:{...e,[f]:f==='name'?v:parseFloat(v)||0})}));
  const removePerson = id     => upd(h=>({...h,equity:h.equity.filter(e=>e.id!==id)}));
  const recalc       = (da,ba) => upd(h=>({...h,equity:h.equity.map(e=>({...e,amount:e.name==='Bean'?ba:da}))}));

  const openCallModal = () => {
    const names = equity.map(e=>e.name).filter(Boolean);
    if (!readOnly && !onUpdateHunt && canAddCalls && user) setCallName(user.displayName||user.username||'');
    else setCallName(names.length===1?names[0]:'');
    setCallSlot(''); setCallModal(true);
  };

  const addCall = async () => {
    const slotVal = callSlot.trim();
    if (!slotVal) return;
    const slots = slotVal.split(',');
    const newCalls = [];
    for (const raw of slots) {
      const s = raw.trim(); if (!s) continue;
      if (calls.some(c=>c.slot.toLowerCase()===s.toLowerCase())) { alert(`"${s}" is already in the queue`); continue; }
      // Look up slug+provider for Rainbet link
      const slotData = _slotCache.get().find(c => c.name.toLowerCase() === s.toLowerCase());
      newCalls.push({id:uid(), slot:s, user:callName||'', status:'pending',
        thumb: slotData?.thumb || null,
        slug: slotData?.slug || null,
        provider: slotData?.provider || null,
      });
    }
    if (!newCalls.length) { setCallModal(false); setCallName(''); setCallSlot(''); return; }

    if (canAddCalls && !onUpdateHunt && hunt.user?.id) {
      // Equity member path — close modal first so it feels responsive
      setCallModal(false); setCallName(''); setCallSlot('');
      let anyFailed = false;
      for (const c of newCalls) {
        try {
          await apiFetch(`/api/hunts/${hunt.user.id}/calls`, {
            method: 'POST',
            body: JSON.stringify({ slot: c.slot })
          });
        } catch(e) {
          anyFailed = true;
          alert(e.message || `Failed to add "${c.slot}" — try again`);
        }
      }
      // Re-fetch to get confirmed server state with correct IDs and caller names
      try {
        const updated = await apiFetch(`/api/hunts/${hunt.user.id}`);
        if (updated && onHuntRefresh) onHuntRefresh(updated);
      } catch(e) {
        // Re-fetch failed — socket update will eventually sync
      }
    } else if (huntMode==='creating') {
      upd(h=>({...h,calls:[...h.calls,...newCalls]}));
      setCallModal(false); setCallName(''); setCallSlot('');
    } else {
      upd(h=>{
        const pending=h.calls.filter(c=>c.status==='pending');
        const others=h.calls.filter(c=>c.status!=='pending');
        const insertAt=Math.min(3,pending.length);
        const newP=[...pending.slice(0,insertAt),...newCalls,...pending.slice(insertAt)];
        return{...h,calls:[...newP,...others]};
      });
      setCallModal(false); setCallName(''); setCallSlot('');
    }
  };

  const generateRandom = () => {
    const names=equity.map(e=>e.name).filter(Boolean).filter(n=>n!=='Bean');
    if(!names.length){alert('Add equity members first');return;}
    const count=parseInt(slotCountInput)||35;
    const existing=new Set(calls.map(c=>c.slot.toLowerCase()));
    const pool = (_slotCache.get().length ? _slotCache.get() : RAINBET_SLOTS_LEGACY).map(s=>s.name);
    const slots=shuffle(pool).filter(s=>!existing.has(s.toLowerCase())).slice(0,count);
    const newCalls=slots.map((slot,i)=>({id:uid(),slot,user:names[i%names.length],status:'pending'}));
    upd(h=>({...h,calls:[...h.calls,...newCalls]}));
    setSlotCountModal(false);
  };

  const setCallStatus  = (id,status) => upd(h=>({...h,calls:h.calls.map(c=>c.id===id?{...c,status}:c)}));
  const removeCall     = id          => upd(h=>({...h,calls:h.calls.filter(c=>c.id!==id)}));
  const clearMissed    = ()          => upd(h=>({...h,calls:h.calls.filter(c=>c.status!=='out')}));
  const randomizeCalls = ()          => upd(h=>({...h,calls:shuffle(h.calls)}));
  const setLimit       = ()          => { upd(h=>({...h,callLimit:parseInt(limitInput)||0})); setLimitModal(false); };

  const sendInvite = async () => {
    if (!inviteUser.trim()) return;
    try {
      const data = await apiFetch('/api/my-hunt/invite', { method:'POST', body: JSON.stringify({ username: inviteUser.trim() }) });
      setInviteList(data.invitedEditors || []);
      setInviteUser('');
    } catch(e) { alert(e.message||'Failed to invite'); }
  };
  const removeInvite = async u => {
    try {
      const data = await apiFetch('/api/my-hunt/invite', { method:'DELETE', body: JSON.stringify({ username: u }) });
      setInviteList(data.invitedEditors || []);
    } catch(e) { alert(e.message||'Failed to remove invite'); }
  };
  const copyResults = () => {
    const lines = [];

    // ── Slot Board ──
    lines.push('🎰 SLOT BOARD');
    lines.push('──────────────────────────');
    bonuses.forEach((b, i) => {
      const mult = b.bet > 0 && b.win > 0 ? (b.win / b.bet).toFixed(1) + 'x' : b.win > 0 ? fmt(b.win) : '—';
      const scat = b.scat === 5 ? ' ⬥⬥⬥⬥⬥' : b.scat === 4 ? ' ⬥⬥⬥⬥' : ' ⬥⬥⬥';
      const caller = b.caller ? ` (${b.caller})` : '';
      lines.push(`${i+1}. ${b.slot}${scat}${caller} — Bet: ${fmt(b.bet)} | Win: ${b.win > 0 ? fmt(b.win) : '—'} | ${mult}`);
    });
    lines.push('');
    lines.push(`💰 Total Pot: ${fmt(totalPot)}  |  🏆 Total Won: ${fmt(totalWon)}  |  ${totalWon >= totalPot ? '✅ PROFIT' : `📉 ${fmt(totalWon - totalPot)}`}`);
    if (avgX) lines.push(`📊 Avg X: ${avgX.toFixed(1)}x  |  🔝 Best: ${bestBonus ? bestBonus.slot + ' ' + bestBonus.x.toFixed(1) + 'x' : '—'}`);

    // ── Equity Cards ──
    lines.push('');
    lines.push('👥 EQUITY & PAYOUTS');
    lines.push('──────────────────────────');
    const sorted = equity.slice().sort((a,b) => b.amount - a.amount);
    sorted.forEach((e, i) => {
      if (!e.name && !e.amount) return;
      const share = totalPot > 0 ? (e.amount / totalPot) * totalWon : 0;
      const pl = share - e.amount;
      const medal = ['🥇','🥈','🥉'][i] || '  ';
      const icon = e.id === 'bean_auto' || e.name?.toLowerCase() === 'bean' ? '👑' : e.isRollWinner ? '🎲' : '💰';
      lines.push(`${medal} ${icon} ${e.name || '—'}  In: ${fmt(e.amount)}  →  Out: ${fmt(share)}  (${pl >= 0 ? '+' : ''}${fmt(pl)})`);
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopyResult(true); setTimeout(()=>setCopyResult(false), 2000);
  };

  const sortedBonuses = bonuses.slice().sort((a,b)=>{
    const pa=a.scat===5?2:a.scat===4?1:0,pb=b.scat===5?2:b.scat===4?1:0;
    if(pa!==pb)return pa-pb; return bonuses.indexOf(a)-bonuses.indexOf(b);
  });

  const queue   = buildQueue(calls);
  const pending = queue.filter(c=>c.status==='pending');
  const done    = queue.filter(c=>c.status==='out');
  const canEdit = !readOnly && !!onUpdateHunt;
  const canCall = canEdit || (canAddCalls && huntMode !== 'rolling');

  // ── Preferred slot auto-injection ────────────────────────────────
  // Safe to place here — canEdit is defined above, no TDZ risk
  const injectPreferredSlots = useCallback(async (equityMember, currentCalls) => {
    if (!equityMember?.id || equityMember.id === 'bean_auto' || equityMember.id === 'creator_auto') return;
    if (!equityMember.name) return;
    try {
      let lookupId = equityMember.id;
      if (!/^\d{17,19}$/.test(lookupId) && user) {
        const memberNameLower = equityMember.name.toLowerCase().trim();
        const userNameLower = (user.displayName || user.username || '').toLowerCase().trim();
        if (memberNameLower === userNameLower) {
          lookupId = user.id;
        } else {
          return;
        }
      }
      const data = await apiFetch(`/api/settings/${lookupId}`);
      let preferred = (data?.preferredSlots || []).filter(Boolean);
      if (!preferred.length) return;

      // Filter out slots already in the queue
      const existing = new Set((currentCalls || []).map(c => (c.slot||'').toLowerCase().trim()));
      preferred = preferred.filter(s => s?.name && !existing.has(s.name.toLowerCase().trim()));
      if (!preferred.length) return;

      // If hunt has a call limit, pick randomly up to that limit
      const limit = hunt.callLimit || 0;
      if (limit > 0 && preferred.length > limit) {
        const shuffled = [...preferred];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        preferred = shuffled.slice(0, limit);
      }

      upd(h => {
        const alreadyIn = new Set((h.calls||[]).map(c => (c.slot||'').toLowerCase().trim()));
        const newCalls = preferred
          .filter(s => !alreadyIn.has(s.name.toLowerCase().trim()))
          .map(s => ({
            id: uid(), userId: lookupId, displayName: equityMember.name,
            avatar: null, slot: s.name, thumb: s.thumb||null, slug: s.slug||null,
            provider: s.provider||null, status: 'pending', requestedAt: new Date().toISOString(),
          }));
        if (!newCalls.length) return h;
        return { ...h, calls: [...(h.calls||[]), ...newCalls] };
      });
    } catch(e) { /* silently ignore */ }
  }, [upd, user, hunt.callLimit]);

  const prevEquityIdsRef = useRef(new Set((hunt.equity||[]).map(e=>e.id).filter(Boolean)));
  const prevEquityNamesRef = useRef(new Set((hunt.equity||[]).map(e=>e.name?.toLowerCase().trim()).filter(Boolean)));
  useEffect(() => {
    if (!canEdit) return;
    const current = hunt.equity || [];
    const currentIds = new Set(current.map(e=>e.id).filter(Boolean));
    const currentNames = new Set(current.map(e=>e.name?.toLowerCase().trim()).filter(Boolean));

    // Trigger on newly added members OR newly named members (name just appeared)
    const newMembers = current.filter(e => {
      if (!e.name) return false;
      if (e.id === 'bean_auto' || e.id === 'creator_auto') return false;
      const nameKey = e.name.toLowerCase().trim();
      const isNewId = !prevEquityIdsRef.current.has(e.id);
      const isNewName = !prevEquityNamesRef.current.has(nameKey);
      return isNewId || isNewName;
    });

    if (newMembers.length) {
      newMembers.forEach(m => injectPreferredSlots(m, hunt.calls));
    }
    prevEquityIdsRef.current = currentIds;
    prevEquityNamesRef.current = currentNames;
  }, [hunt.equity, hunt.calls, canEdit, injectPreferredSlots]);

  /* ── Modal base style ── */
  const modalBg = { position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',animation:'fadeUp .15s ease' };
  const modal   = { background:G.card,border:`1px solid ${G.bb}`,borderRadius:6,padding:'1.75rem',width:320,animation:'popIn .15s ease' };
  const inp     = { height:34, background:G.sur, border:`1px solid ${G.bdr}`, borderRadius:3, padding:'0 10px', fontFamily:G.body, fontSize:13, color:G.t1, width:'100%' };
  const btnPrimary = { height:36, padding:'0 20px', background:accent, color:'#000', border:'none', borderRadius:3, fontFamily:G.body, fontSize:13, fontWeight:700, cursor:'pointer', letterSpacing:'0.02em' };
  const btnGhost   = { height:36, padding:'0 14px', background:'transparent', border:`1px solid ${G.bdr}`, borderRadius:3, fontFamily:G.body, fontSize:13, color:G.t3, cursor:'pointer' };

  return (
    <div style={{fontFamily:G.body, background:G.bg, minHeight:'100vh', color:G.t1, zoom:1.2}}>
      <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{`
        @keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes pulse-orange{0%,100%{box-shadow:0 0 0 0 rgba(251,146,60,0.5)}60%{box-shadow:0 0 0 5px rgba(251,146,60,0)}} @keyframes live-ring{0%{box-shadow:0 0 0 0 rgba(145,70,255,.6)}70%{box-shadow:0 0 0 6px rgba(145,70,255,0)}100%{box-shadow:0 0 0 0 rgba(145,70,255,0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
        .call-card:hover{background:${G.lift}!important}
        .row-hover:hover{background:rgba(255,255,255,.02)!important}
        .icon-btn:hover{color:${G.t1}!important}
        .icon-btn-danger:hover{color:${G.red}!important}
        .tag-btn:hover{opacity:1!important}
        .equity-flip{transform-style:preserve-3d;}
      `}</style>

      {/* ── Bean live banner ── */}
      {beanLive.isLive && (
        <a href="https://www.twitch.tv/bean" target="_blank" rel="noopener noreferrer"
          style={{display:'block',background:'rgba(145,70,255,0.12)',borderBottom:'1px solid rgba(145,70,255,0.3)',padding:'6px 1.25rem',textDecoration:'none',cursor:'pointer'}}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(145,70,255,0.2)'}
          onMouseLeave={e=>e.currentTarget.style.background='rgba(145,70,255,0.12)'}>
          <div style={{maxWidth:1700,margin:'0 auto',display:'flex',alignItems:'center',gap:10}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:'#9146ff',display:'inline-block',flexShrink:0,animation:'live-ring 2s infinite'}}/>
            <span style={{fontFamily:G.mono,fontSize:10,fontWeight:700,color:'#9146ff',letterSpacing:'0.1em'}}>BEAN IS LIVE ON TWITCH</span>
            {beanLive.title&&<span style={{fontFamily:G.body,fontSize:12,color:'rgba(255,255,255,0.5)',marginLeft:4}}>— {beanLive.title}</span>}
            <span style={{marginLeft:'auto',fontFamily:G.mono,fontSize:10,color:'#9146ff',letterSpacing:'0.06em'}}>WATCH →</span>
          </div>
        </a>
      )}

      {/* ── Top bar ── */}
      <div style={{background:G.bg2,borderBottom:`1px solid ${G.bb}`,position:'sticky',top:0,zIndex:40}}>
        <div style={{padding:'0 1.5rem',height:54,display:'grid',gridTemplateColumns:'auto 1fr auto',alignItems:'center',gap:24}}>
          {/* Left: socials + title */}
          <div style={{display:'flex',alignItems:'center',gap:12}}>
          {/* Bean socials */}
            <div style={{display:'flex',alignItems:'center',gap:3,marginRight:6,borderRight:`1px solid ${G.bdr}`,paddingRight:10}}>
              {[
                ['https://www.twitch.tv/bean','#9146ff',<svg width="13" height="13" viewBox="0 0 24 24" fill="#9146ff"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>],
                ['https://kick.com/bean','#53fc18',<svg width="13" height="13" viewBox="0 0 24 24" fill="#53fc18"><path d="M2 2h20v20H2V2zm4 4v12h3V14l5 4h4l-6-6 6-6h-4l-5 4V6H6z"/></svg>],
                ['https://discord.com/invite/beantwitch','#5865f2',<svg width="13" height="13" viewBox="0 0 24 24" fill="#5865f2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>],
                ['https://youtube.com/@beantwitch','#ff0000',<svg width="13" height="13" viewBox="0 0 24 24" fill="#ff0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>],
                ['https://x.com/beantwitch','#fff',<svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>],
              ].map(([href,color,icon],i)=>(
                <a key={i} href={href} target="_blank" rel="noopener noreferrer"
                  style={{width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:3,opacity:.6,transition:'opacity .1s'}}
                  onMouseEnter={e=>e.currentTarget.style.opacity='1'}
                  onMouseLeave={e=>e.currentTarget.style.opacity='.6'}>
                  {icon}
                </a>
              ))}
            </div>
            <div>
              <div style={{fontFamily:G.mono,fontSize:10,fontWeight:700,color:G.t4,letterSpacing:'0.12em',textTransform:'uppercase',lineHeight:1,display:'flex',alignItems:'center',gap:5}}><span>BeanTards on</span><RainbetLogo size={10}/></div>
              <div style={{fontFamily:G.display,fontSize:'1.6rem',fontWeight:700,letterSpacing:'0.06em',lineHeight:1,color:G.t1}}>
                {isVip
                  ? <><span style={{color:G.t2}}>VIP </span><span style={{color:G.purple}}>HUNT</span></>
                  : <><span style={{color:G.t2}}>COMMUNITY </span><span style={{color:G.gold}}>HUNT</span></>
                }
              </div>
            </div>
            {hunt.isLive && (
              <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(0,230,118,.07)',border:'1px solid rgba(0,230,118,.2)',borderRadius:3,padding:'3px 10px',marginLeft:4}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:G.green,display:'inline-block',animation:'live-ring 2s infinite'}}/>
                <span style={{fontFamily:G.mono,fontSize:9,color:G.green,letterSpacing:'0.1em'}}>LIVE</span>
              </div>
            )}

          </div>

          {/* Center: announcement */}
          <div style={{textAlign:'center',userSelect:'none'}}>
            <a href="https://discord.com/invite/beantwitch" target="_blank" rel="noopener noreferrer" style={{textDecoration:'none'}}>
              <span style={{fontFamily:"'Chakra Petch',sans-serif",fontSize:15,fontWeight:700,letterSpacing:'0.12em',
                background:'linear-gradient(90deg,#9146ff,#c6f135)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
                backgroundClip:'text'}}>
                #joinbeancore
              </span>
            </a>
          </div>

          {/* Right: controls */}
          <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
            {!readOnly && saveStatus && (
              <span style={{fontFamily:G.mono,fontSize:10,color:saveStatus==='saved'?G.green:'#888',letterSpacing:'0.06em'}}>
                {saveStatus==='saving'?'saving…':'✓ saved'}
              </span>
            )}
            {hunt.isLive && huntTimer && <span style={{fontFamily:G.mono,fontSize:12,color:G.t2,background:G.card,padding:'2px 8px',borderRadius:4}}>⏱ {huntTimer}</span>}
            {hunt.viewers>0 && <span style={{fontFamily:G.mono,fontSize:12,color:G.t2}}>👁 {hunt.viewers}</span>}
            {canEdit && huntHistory.length>0 && (
              <button onClick={undo} title="Undo last action" style={{height:30,padding:'0 12px',background:G.card,border:`1px solid ${G.bdr}`,borderRadius:5,fontFamily:G.mono,fontSize:11,fontWeight:600,color:G.t2,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
                ↩ Undo
              </button>
            )}
            {canEdit && <button onClick={()=>{navigator.clipboard.writeText(`${window.location.origin}/overlay/${hunt.user?.id}`);setObsCopied(true);setTimeout(()=>setObsCopied(false),2000);}} style={{height:30,padding:'0 12px',background:obsCopied?'rgba(198,241,53,0.15)':G.card,border:`1px solid ${obsCopied?G.gold:G.bdr}`,borderRadius:5,fontFamily:G.mono,fontSize:11,fontWeight:600,color:obsCopied?G.gold:G.t2,cursor:'pointer'}}>{obsCopied?'✓ Copied':'OBS Link'}</button>}
            {canEdit && <button onClick={()=>setInviteModal(true)} style={{height:30,padding:'0 12px',background:G.card,border:`1px solid ${G.bdr}`,borderRadius:5,fontFamily:G.mono,fontSize:11,fontWeight:600,color:G.t2,cursor:'pointer'}}>+ Co-Edit</button>}
            <button onClick={()=>{navigator.clipboard.writeText(`${window.location.origin}/hunt/${hunt.user?.id}`);setShareCopied(true);setTimeout(()=>setShareCopied(false),2000);}} style={{height:30,padding:'0 12px',background:shareCopied?'rgba(198,241,53,0.15)':G.card,border:`1px solid ${shareCopied?G.gold:G.bdr}`,borderRadius:5,fontFamily:G.mono,fontSize:11,fontWeight:600,color:shareCopied?G.gold:G.t2,cursor:'pointer'}}>{shareCopied?'✓ Copied':'⇗ Share'}</button>
            {canEdit && hunt.isLive && onEndHunt && (
              <button onClick={()=>{if(window.confirm('End this hunt?')){setShowWinners(true);onEndHunt();}}} style={{height:30,padding:'0 14px',background:'rgba(248,113,113,0.15)',border:`1px solid rgba(248,113,113,0.5)`,borderRadius:5,fontFamily:G.mono,fontSize:11,fontWeight:700,color:'#f87171',cursor:'pointer'}}>End Hunt</button>
            )}
            {canEdit && onResetHunt && (
              <button onClick={onResetHunt} style={{height:30,padding:'0 12px',background:G.card,border:`1px solid ${G.bdr}`,borderRadius:5,fontFamily:G.mono,fontSize:11,color:G.t3,cursor:'pointer'}}>Reset</button>
            )}
            <button onClick={onBack} style={{height:30,padding:'0 12px',background:G.card,border:`1px solid ${G.bdr}`,borderRadius:5,fontFamily:G.mono,fontSize:11,color:G.t2,cursor:'pointer'}}>← Hub</button>
          </div>
        </div>
      </div>

      {/* ── Three-column layout ── */}
      <div style={{display:'grid',gridTemplateColumns:`300px 1fr 460px`,height:'calc(100vh - 46px)',overflow:'hidden'}}>

        {/* ── LEFT: Slot calls — hidden for viewers in rolling mode ── */}
        <div style={{borderRight:`1px solid ${G.bdr}`,display:'flex',flexDirection:'column',overflow:'hidden',}}>
          {/* Mode toggle */}
          {canEdit && (
            <div style={{padding:'8px 10px',borderBottom:`1px solid ${G.bdr}`,display:'flex',gap:2}}>
              {[['creating','📋','CREATING'],['spinning','🎰','SPINNING'],['rolling','🎲','ROLLING']].map(([mode,icon,lbl])=>(
                <button key={mode} onClick={()=>changeMode(mode)} style={{
                  flex:1, height:32, border:`1px solid ${huntMode===mode?accent:G.bdr}`,
                  borderRadius:4, fontFamily:G.mono, fontSize:11, fontWeight:700, cursor:'pointer',
                  background:huntMode===mode?acDim:'transparent',
                  color:huntMode===mode?accent:G.t3,
                  letterSpacing:'0.04em', transition:'all .1s'
                }}>
                  {icon} {lbl}
                </button>
              ))}
            </div>
          )}

          {/* Header */}
          <div style={{padding:'8px 10px',borderBottom:`1px solid ${G.bdr}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontFamily:G.display,fontSize:18,fontWeight:700,letterSpacing:'0.04em',color:G.t1}}>SLOT CALLS</span>
              {canEdit && callRequests.length>0 && (
                <button onClick={()=>setShowReqPopup(true)} style={{position:'relative',height:24,padding:'0 8px',background:'rgba(251,146,60,0.2)',border:'1px solid rgba(251,146,60,0.6)',borderRadius:12,cursor:'pointer',display:'flex',alignItems:'center',gap:5,animation:'pulse-orange 2s infinite'}}>
                  <span style={{fontFamily:G.mono,fontSize:10,fontWeight:700,color:'#fb923c'}}>🔔 {callRequests.length} request{callRequests.length!==1?'s':''}</span>
                </button>
              )}
            </div>
              {pending.length>8&&huntMode!=='creating'&&(
                <span style={{fontFamily:G.mono,fontSize:9,color:accent,background:acDim,border:`1px solid ${accent}44`,borderRadius:2,padding:'1px 6px',letterSpacing:'0.06em'}}>+{pending.length-8}</span>
              )}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:3}}>
              {canEdit && <>
                {/* Discord auto-import calls */}
                <button onClick={async()=>{
                  if (dcImporting) return;
                  setDcImporting(true);
                  try {
                    const data = await apiFetch('/api/discord/import-calls');
                    if (!data.imported?.length) { alert('No new calls found in Discord.'); setDcImporting(false); return; }
                    upd(h=>({...h,calls:[...(h.calls||[]),...data.imported]}));
                    alert(`✅ Imported ${data.count} call${data.count!==1?'s':''} from Discord`);
                  } catch(e) { alert(e.message||'Failed to import from Discord'); }
                  setDcImporting(false);
                }} title="Auto-import calls from Discord"
                  style={{height:26,width:26,background:dcImporting?'rgba(88,101,242,0.15)':'transparent',border:`1px solid ${dcImporting?'rgba(88,101,242,0.5)':G.bdr}`,borderRadius:4,cursor:dcImporting?'default':'pointer',color:dcImporting?'#a5b4fc':G.t2,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .1s'}}
                  onMouseEnter={e=>{if(!dcImporting){e.currentTarget.style.borderColor='rgba(88,101,242,0.5)';e.currentTarget.style.color='#a5b4fc';}}}
                  onMouseLeave={e=>{if(!dcImporting){e.currentTarget.style.borderColor=G.bdr;e.currentTarget.style.color=G.t2;}}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                </button>
                {/* Paste calls */}
                <button onClick={()=>setShowPasteCalls(true)} title="Paste slot calls"
                  style={{height:26,width:26,background:'transparent',border:`1px solid ${G.bdr}`,borderRadius:4,cursor:'pointer',color:G.t2,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .1s'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=G.gold;e.currentTarget.style.color=G.gold;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=G.bdr;e.currentTarget.style.color=G.t2;}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-3"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
                </button>
                {/* Random */}
                <button onClick={()=>setSlotCountModal(true)} title="Add random slots"
                  style={{height:26,width:26,background:'transparent',border:`1px solid ${G.bdr}`,borderRadius:4,cursor:'pointer',color:G.t2,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .1s'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=G.t2;e.currentTarget.style.color=G.t1;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=G.bdr;e.currentTarget.style.color=G.t2;}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3 4a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm8 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-4 4a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-4 4a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm8 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/></svg>
                </button>
                {/* Shuffle */}
                <button onClick={randomizeCalls} title="Shuffle calls"
                  style={{height:26,width:26,background:'transparent',border:`1px solid ${G.bdr}`,borderRadius:4,cursor:'pointer',color:G.t2,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .1s'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=G.t2;e.currentTarget.style.color=G.t1;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=G.bdr;e.currentTarget.style.color=G.t2;}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16 3h5v5l-1.5-1.5-4.5 4.5-3-3-6 6-1.5-1.5 6-6 3 3 3-3L16 3zm5 13l-5 5-1.41-1.41 2.58-2.59H3v-2h14.17l-2.58-2.59L16 11l5 5z"/></svg>
                </button>
                {/* Clear */}
                <button onClick={()=>{if(window.confirm('Clear all slot calls?'))upd(h=>({...h,calls:[]}));}} title="Clear all calls"
                  style={{height:26,width:26,background:'transparent',border:`1px solid ${G.bdr}`,borderRadius:4,cursor:'pointer',color:G.t3,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .1s'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(248,113,113,0.5)';e.currentTarget.style.color=G.red;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=G.bdr;e.currentTarget.style.color=G.t3;}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
                {/* Call Limit */}
                <button onClick={()=>{setLimitInput(String(callLimit));setLimitModal(true);}} title={callLimit?`Limit: ${callLimit}/person`:'Set call limit'}
                  style={{height:26,width:26,background:callLimit?acDim:'transparent',border:`1px solid ${callLimit?accent:G.bdr}`,borderRadius:4,cursor:'pointer',color:callLimit?accent:G.t3,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .1s',fontFamily:G.mono,fontSize:callLimit>9?9:11,fontWeight:700}}
                  onMouseEnter={e=>{if(!callLimit){e.currentTarget.style.borderColor=G.t2;e.currentTarget.style.color=G.t1;}}}
                  onMouseLeave={e=>{if(!callLimit){e.currentTarget.style.borderColor=G.bdr;e.currentTarget.style.color=G.t3;}}}>
                  {callLimit>0
                    ? <span>{callLimit}</span>
                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  }
                </button>
                {/* Round Robin toggle */}
                <button onClick={()=>upd(h=>({...h,roundRobin:!h.roundRobin}))} title={hunt.roundRobin?'Round Robin: ON':'Round Robin: OFF'}
                  style={{height:26,width:26,background:hunt.roundRobin?acDim:'transparent',border:`1px solid ${hunt.roundRobin?accent:G.bdr}`,borderRadius:4,cursor:'pointer',color:hunt.roundRobin?accent:G.t3,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .1s',fontFamily:G.mono,fontSize:8,fontWeight:700,letterSpacing:'-0.03em'}}
                  onMouseEnter={e=>{if(!hunt.roundRobin){e.currentTarget.style.borderColor=G.t2;e.currentTarget.style.color=G.t1;}}}
                  onMouseLeave={e=>{if(!hunt.roundRobin){e.currentTarget.style.borderColor=G.bdr;e.currentTarget.style.color=G.t3;}}}>
                  RR
                </button>
              </>}
              {!canEdit && !canAddCalls && user && hunt.isLive && (huntMode==='creating'||huntMode==='spinning') && (
                <button onClick={async()=>{
                  if (reqStatus) return;
                  try {
                    const data = await apiFetch(`/api/hunts/${hunt.user?.id}/request-calls`, { method:'POST' });
                    setReqStatus(data.status === 'already_member' ? 'granted' : 'pending');
                  } catch(e) { alert(e.message||'Failed to send request'); }
                }} style={{height:26,padding:'0 10px',background:reqStatus==='granted'?'rgba(198,241,53,0.15)':reqStatus==='pending'?'rgba(251,146,60,0.12)':'rgba(88,101,242,0.12)',border:`1px solid ${reqStatus==='granted'?'rgba(198,241,53,0.4)':reqStatus==='pending'?'rgba(251,146,60,0.4)':'rgba(88,101,242,0.4)'}`,borderRadius:4,fontFamily:G.mono,fontSize:9,fontWeight:700,color:reqStatus==='granted'?G.gold:reqStatus==='pending'?'#fb923c':'#a5b4fc',cursor:reqStatus?'default':'pointer',whiteSpace:'nowrap'}}>
                  {reqStatus==='granted'?'✓ Access Granted':reqStatus==='pending'?'⏳ Pending…':'🙋 Request to Add Calls'}
                </button>
              )}

            </div>
          </div>

          {canCall && (
            <div style={{padding:'6px 10px',borderBottom:`1px solid ${G.bdr}`,flexShrink:0}}>
              <button onClick={openCallModal} style={{width:'100%',height:36,background:'transparent',border:`1px solid ${G.bb}`,borderRadius:5,fontFamily:G.body,fontSize:14,fontWeight:600,color:G.t2,cursor:'pointer'}}>
                + Add Call
              </button>
            </div>
          )}

          {/* Calls list */}
          <div style={{flex:1,overflowY:'auto',padding:'6px 8px'}}>
            {(huntMode==='creating'?pending:pending.slice(0,8)).map((c,i)=>{
              const isLocked = huntMode!=='creating' && i<3;
              return (
                <div key={c.id} className={!isLocked?'call-card':''}
                  draggable={canEdit&&!isLocked}
                  onDragStart={()=>setDragCallId(c.id)}
                  onDragOver={e=>e.preventDefault()}
                  onDrop={()=>{
                    if(!dragCallId||dragCallId===c.id||isLocked)return;
                    upd(h=>{
                      const pend=h.calls.filter(x=>x.status==='pending'),oth=h.calls.filter(x=>x.status!=='pending');
                      const fi=pend.findIndex(x=>x.id===dragCallId),ti=pend.findIndex(x=>x.id===c.id);
                      if(huntMode!=='creating'&&ti<3)return h;
                      const[m]=pend.splice(fi,1);pend.splice(ti,0,m);
                      return{...h,calls:[...pend,...oth]};
                    });
                    setDragCallId(null);
                  }}
                  style={{
                    borderRadius:3, padding:'7px 9px', marginBottom:3,
                    background:isLocked?(isVip?'rgba(187,134,252,.05)':'rgba(255,179,0,.05)'):G.sur,
                    border:`1px solid ${isLocked?`${accent}44`:G.bdr}`,
                    borderLeft:`3px solid ${isLocked||i===0?accent:G.bdr}`,
                    cursor:isLocked?'default':canEdit?'grab':'default',
                    transition:'background .08s', position:'relative'
                  }}>
                  {canEdit && !isLocked && <button className="icon-btn-danger" onClick={()=>removeCall(c.id)} style={{position:'absolute',top:4,right:4,background:'none',border:'none',cursor:'pointer',color:G.t4,fontSize:12,lineHeight:1}}>×</button>}
                  {isLocked&&<div style={{fontFamily:G.mono,fontSize:8,color:accent,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:3}}>🔒 {i===0?'UP NEXT':`NEXT ${i+1}`}</div>}
                  {!isLocked&&i===0&&huntMode==='creating'&&<div style={{fontFamily:G.mono,fontSize:8,color:accent,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:3}}>▶ UP NEXT</div>}
                  <div style={{display:'flex',alignItems:'center',gap:8,paddingRight:14}}>
                    <SlotThumb slot={c.slot} storedThumb={c.thumb||null} storedSlug={c.slug||null} storedProvider={c.provider||null} width={44} height={33} />
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{fontFamily:G.body,fontWeight:700,fontSize:15,color:G.t1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.slot}</div>
                      <div style={{fontFamily:G.mono,fontSize:12,fontWeight:600,color:G.t3,marginTop:3,letterSpacing:'0.02em'}}>{c.user}</div>
                    </div>
                  </div>
                  {canEdit&&(
                    <div style={{display:'flex',gap:4,marginTop:6}}>
                      <button onClick={()=>setBetPrompt({callId:c.id,slot:c.slot,caller:c.user})} style={{height:26,padding:'0 12px',background:G.gndim,border:`1px solid ${G.green}66`,borderRadius:3,fontFamily:G.mono,fontSize:11,fontWeight:700,color:G.green,cursor:'pointer'}}>✓ Got In</button>
                      <button onClick={()=>setCallStatus(c.id,'out')} style={{height:26,padding:'0 12px',background:G.rdim,border:`1px solid ${G.red}66`,borderRadius:3,fontFamily:G.mono,fontSize:11,fontWeight:700,color:G.red,cursor:'pointer'}}>✗ Miss</button>
                    </div>
                  )}
                </div>
              );
            })}

            {done.length>0&&(
              <>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontFamily:G.mono,fontSize:8,color:G.t4,letterSpacing:'0.1em',textTransform:'uppercase',margin:'8px 0 4px',paddingTop:8,borderTop:`1px solid ${G.bdr}`}}>
                  <span>MISSED</span>
                  {canEdit&&<button onClick={clearMissed} style={{background:'none',border:'none',color:G.t4,fontFamily:G.mono,fontSize:9,cursor:'pointer'}}>Clear</button>}
                </div>
                {done.map(c=>(
                  <div key={c.id} style={{borderRadius:3,padding:'6px 8px',marginBottom:3,background:G.sur,border:`1px solid ${G.bdr}`,borderLeft:`3px solid ${G.red}44`,opacity:.5}}>
                    <div style={{fontFamily:G.body,fontWeight:600,fontSize:12,color:G.red,textDecoration:'line-through'}}>{c.slot}</div>
                    <div style={{fontFamily:G.mono,fontSize:9,color:G.t3,marginTop:1}}>{c.user}</div>
                  </div>
                ))}
              </>
            )}
            {pending.length===0&&done.length===0&&(
              <div style={{fontFamily:G.mono,fontSize:10,color:G.t4,textAlign:'center',padding:'2rem 0',letterSpacing:'0.06em'}}>NO CALLS YET</div>
            )}
          </div>
        </div>

        {/* ── MIDDLE: Bonuses ── */}
        <div style={{borderRight:`1px solid ${G.bdr}`,display:'flex',flexDirection:'column',overflow:'hidden'}}>

          {/* Stat tiles — centered above bonus tracker */}
          <div style={{display:'flex',borderBottom:`2px solid ${accent}44`,background:G.bg2,flexShrink:0}}>
            {huntMode==='creating'&&<>
              <StatTile label="Starting Balance" value={fmt(totalPot)} color={accent} accent={acStr} wide />
              <StatTile label="People in Hunt" value={equity.filter(e=>e.name||e.amount>0).length} accent={acStr} />
              <StatTile label="Call Limit" value={callLimit>0?`${callLimit} per person`:'Unlimited'} color={callLimit>0?accent:G.t3} accent={acStr} />
              <StatTile label="Slots Called" value={calls.length} color={calls.length>0?G.t1:G.t3} accent={acStr} />
            </>}
            {huntMode==='spinning'&&<>
              <StatTile label="Starting Balance" value={fmt(totalPot)} color={accent} accent={acStr} wide />
              <StatTile label="Bonuses" value={bonuses.length} accent={acStr} />
              <StatTile label="Req X" value={reqXVal} color={reqXColor} accent={acStr} />
              <StatTile label="Top Caller" value={topCaller?`${topCaller[0]}  ×${topCaller[1]}`:'—'} color={topCaller?G.green:G.t3} accent={G.green} wide />
            </>}
            {huntMode==='rolling'&&<>
              <StatTile label="Balance" value={`${fmt(totalWon)} / ${fmt(totalPot)}`} color={totalWon>=totalPot?G.green:accent} accent={acStr} wide />
              <StatTile label="Bonuses" value={`${rolledCount}/${bonuses.length}`} color={G.t1} accent={acStr} />
              <StatTile label="Req X" value={reqXVal} color={reqXColor} accent={acStr} />
              <StatTile label="Avg X" value={avgX?avgX.toFixed(1)+'x':'—'} color={G.t2} accent={acStr} />
              <StatTile label="Highest X" value={highX?highX.toFixed(1)+'x':'—'} color={highX?(highX>=100?G.green:G.red):G.t3} accent={acStr} />
              <StatTile label="Best Slot" value={bestBonus?bestBonus.slot:'—'} color={accent} accent={acStr} wide />
              <StatTile label="Top Roller" value={bestRoller?`${bestRoller[0]}  ${fmt(bestRoller[1])}`:'—'} color={bestRoller?G.green:G.t3} accent={G.green} wide />
            </>}
          </div>

          {/* Add bonus form */}
          {canEdit&&(
            <div style={{padding:'6px 10px',borderBottom:`1px solid ${G.bdr}`,display:'grid',gridTemplateColumns:'7fr 3fr 90px auto auto',gap:6,alignItems:'center',flexShrink:0,background:G.bg2}}>
              <SlotInput value={slotInput} onChange={setSlotInput} placeholder="e.g. Gates of Olympus"
                onCommit={()=>addBonus(null,null,scatInput)} inputHeight={52} />
              <input value={callerInput} onChange={e=>setCallerInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&addBonus(null,null,scatInput)}
                placeholder="Caller" style={{...inp, height:52, fontSize:18, padding:'0 14px'}} />
              <input type="number" value={betInput} onChange={e=>setBetInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&addBonus(null,null,scatInput)}
                placeholder="Bet $" style={{...inp, height:52, fontSize:18, padding:'0 14px'}} />
              <div style={{display:'flex',gap:3,alignItems:'center'}}>
                <button onClick={()=>setScatInput(3)} title="Bonus (3 scatter)" style={{background:'transparent',border:`2px solid ${scatInput===3?accent:'transparent'}`,borderRadius:8,padding:2,cursor:'pointer',transition:'all .12s',transform:scatInput===3?'scale(1.1)':'scale(1)'}}>
                  <svg width="48" height="48" viewBox="0 0 72 72"><defs><radialGradient id="sS" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#fff7a0"/><stop offset="60%" stopColor="#ffcc00"/><stop offset="100%" stopColor="#e07000"/></radialGradient></defs><g fill="#ffaa00" stroke="#cc6600" strokeWidth="0.5"><polygon points="36,3 38,26 40,3 39,26"/><polygon points="36,69 38,46 40,69 39,46"/><polygon points="3,36 26,38 3,40 26,39"/><polygon points="69,36 46,38 69,40 46,39"/><polygon points="9,9 27,28 11,7 28,27"/><polygon points="63,9 45,28 61,7 44,27"/><polygon points="9,63 27,44 11,65 28,45"/><polygon points="63,63 45,44 61,65 44,45"/><polygon points="5,22 26,33 4,20 25,32"/><polygon points="67,22 46,33 68,20 47,32"/><polygon points="5,50 26,39 4,52 25,40"/><polygon points="67,50 46,39 68,52 47,40"/></g><circle cx="36" cy="36" r="22" fill="url(#sS)" stroke="#cc7700" strokeWidth="1.5"/><text x="36" y="40" textAnchor="middle" fontFamily="'Chakra Petch',sans-serif" fontSize="13" fontWeight="900" fill="#3d1a00" letterSpacing="1.5" paintOrder="stroke" stroke="#ffe066" strokeWidth="3">BONUS</text></svg>
                </button>
                <button onClick={()=>setScatInput(4)} title="Super Bonus (4 scatter)" style={{background:'transparent',border:`2px solid ${scatInput===4?G.gold:'transparent'}`,borderRadius:8,padding:2,cursor:'pointer',transition:'all .12s',transform:scatInput===4?'scale(1.1)':'scale(1)'}}>
                  <svg width="48" height="48" viewBox="0 0 72 72"><defs><radialGradient id="sG" cx="35%" cy="25%" r="75%"><stop offset="0%" stopColor="#f0c8ff"/><stop offset="50%" stopColor="#aa44ff"/><stop offset="100%" stopColor="#440088"/></radialGradient></defs><g fill="#cc66ff" opacity="0.7"><polygon points="36,4 37.5,15 39,4 38,15"/><polygon points="36,68 37.5,57 39,68 38,57"/><polygon points="4,36 15,37.5 4,39 15,38"/><polygon points="68,36 57,37.5 68,39 57,38"/><polygon points="12,12 24,24 10,10 23,23"/><polygon points="60,12 48,24 62,10 49,23"/><polygon points="12,60 24,48 10,62 23,49"/><polygon points="60,60 48,48 62,62 49,49"/></g><polygon points="36,10 58,26 58,48 36,62 14,48 14,26" fill="url(#sG)" stroke="#cc44ff" strokeWidth="1.5"/><line x1="36" y1="10" x2="36" y2="62" stroke="#f0aaff" strokeWidth="0.8" opacity="0.4"/><line x1="14" y1="26" x2="58" y2="48" stroke="#f0aaff" strokeWidth="0.8" opacity="0.4"/><line x1="58" y1="26" x2="14" y2="48" stroke="#f0aaff" strokeWidth="0.8" opacity="0.4"/><ellipse cx="28" cy="24" rx="5" ry="3" fill="white" opacity="0.25" transform="rotate(-20,28,24)"/><text x="36" y="34" textAnchor="middle" fontFamily="'Chakra Petch',sans-serif" fontSize="9.5" fontWeight="900" fill="#ffffff" letterSpacing="1" paintOrder="stroke" stroke="#660099" strokeWidth="2.5">SUPER</text><text x="36" y="46" textAnchor="middle" fontFamily="'Chakra Petch',sans-serif" fontSize="9.5" fontWeight="900" fill="#ffffff" letterSpacing="1" paintOrder="stroke" stroke="#660099" strokeWidth="2.5">BONUS</text></svg>
                </button>
                <button onClick={()=>setScatInput(5)} title="Super Super Bonus (5 scatter)" style={{background:'transparent',border:`2px solid ${scatInput===5?G.green:'transparent'}`,borderRadius:8,padding:2,cursor:'pointer',transition:'all .12s',transform:scatInput===5?'scale(1.1)':'scale(1)'}}>
                  <svg width="48" height="48" viewBox="0 0 72 72"><defs><radialGradient id="sD1" cx="38%" cy="28%" r="72%"><stop offset="0%" stopColor="#eefffe"/><stop offset="30%" stopColor="#88eeff"/><stop offset="70%" stopColor="#00aaff"/><stop offset="100%" stopColor="#0033cc"/></radialGradient><radialGradient id="sD2" cx="38%" cy="28%" r="72%"><stop offset="0%" stopColor="#ccffff"/><stop offset="100%" stopColor="#004499"/></radialGradient></defs><g fill="#44ddff" opacity="0.65"><polygon points="36,2 37.5,13 39,2 38,13"/><polygon points="36,70 37.5,59 39,70 38,59"/><polygon points="2,36 13,37.5 2,39 13,38"/><polygon points="70,36 59,37.5 70,39 59,38"/><polygon points="8,8 19,19 6,6 18,18"/><polygon points="64,8 53,19 66,6 54,18"/><polygon points="8,64 19,53 6,66 18,54"/><polygon points="64,64 53,53 66,66 54,54"/></g><polygon points="36,8 54,24 36,20 18,24" fill="#ccf5ff" stroke="#00bbff" strokeWidth="1"/><polygon points="18,24 54,24 58,36 14,36" fill="#88ddff" stroke="#00aaee" strokeWidth="0.8"/><polygon points="14,36 36,64 36,36" fill="url(#sD1)" stroke="#0099dd" strokeWidth="1"/><polygon points="58,36 36,64 36,36" fill="url(#sD2)" stroke="#0088cc" strokeWidth="1"/><polygon points="24,14 30,20 20,22 18,24 22,19" fill="white" opacity="0.4"/><line x1="36" y1="20" x2="36" y2="64" stroke="#aaeeff" strokeWidth="0.7" opacity="0.35"/><text x="36" y="30" textAnchor="middle" fontFamily="'Chakra Petch',sans-serif" fontSize="7" fontWeight="900" fill="#ffffff" letterSpacing="0.5" paintOrder="stroke" stroke="#003399" strokeWidth="2.5">SUPER SUPER</text><text x="36" y="40" textAnchor="middle" fontFamily="'Chakra Petch',sans-serif" fontSize="8" fontWeight="900" fill="#ffffff" letterSpacing="0.5" paintOrder="stroke" stroke="#003399" strokeWidth="2.5">BONUS</text></svg>
                </button>
              </div>
              <button onClick={()=>addBonus(null,null,scatInput)} style={{height:52,padding:'0 18px',background:accent,color:'#000',border:'none',borderRadius:3,fontFamily:G.body,fontSize:13,fontWeight:700,cursor:'pointer'}}>+ Add</button>
            </div>
          )}

          {/* Table header */}
          <div style={{display:'grid',gridTemplateColumns:'28px minmax(0,1fr) 140px 160px 120px 32px',background:G.sur,borderBottom:`2px solid ${accent}`,flexShrink:0}}>
            {['','SLOT','BET','WIN','MULT',''].map((h,i)=>(
              <div key={i} style={{padding:'10px 12px',fontFamily:G.mono,fontSize:12,color:G.t3,letterSpacing:'0.12em',fontWeight:700,
                textAlign: i>=2 && i<=4 ? 'center' : 'left',
                cursor:h==='BET'&&canEdit?'pointer':'default',
                borderBottom:h==='BET'&&canEdit?`1px dashed ${G.t3}`:'none'}}
                onClick={()=>{if(h==='BET'&&canEdit){const v=prompt('Set bet for all:');if(v!=null){const b=parseFloat(v);if(!isNaN(b))upd(h=>({...h,bonuses:h.bonuses.map(x=>({...x,bet:b}))}));}}}}>
                {h}
              </div>
            ))}
          </div>

          {/* Bonus rows */}
          <div style={{flex:1,overflowY:'auto'}}>
            {sortedBonuses.length===0?(
              <div style={{fontFamily:G.mono,fontSize:14,color:G.t4,textAlign:'center',padding:'3rem',letterSpacing:'0.04em'}}>No bonuses yet</div>
            ):sortedBonuses.map(b=>{
              const mult=b.bet>0&&b.win>0?b.win/b.bet:null;
              const mc=mult?(mult>=100?G.green:G.red):G.t3;
              const isP=currentSlot===b.id;
              return (
                <div key={b.id} className="row-hover"
                  draggable={canEdit}
                  onDragStart={()=>setDragBonusId(b.id)}
                  onDragOver={e=>e.preventDefault()}
                  onDrop={()=>{
                    if(!dragBonusId||dragBonusId===b.id)return;
                    upd(h=>{
                      const arr=h.bonuses.slice();
                      const fi=arr.findIndex(x=>x.id===dragBonusId),ti=arr.findIndex(x=>x.id===b.id);
                      const[m]=arr.splice(fi,1);arr.splice(ti,0,m);
                      return{...h,bonuses:arr};
                    });
                    setDragBonusId(null);
                  }}
                  style={{display:'grid',gridTemplateColumns:'28px minmax(0,1fr) 140px 160px 120px 32px',
                    borderBottom:`1px solid ${G.bdr}`,
                    background:isP?`${acDim}`:undefined,
                    opacity:b.win>0?1:.5,
                    cursor:canEdit?'grab':'default',
                    transition:'background .08s',
                    minHeight:56}}>
                  <div style={{padding:'8px',fontFamily:G.mono,fontSize:14,color:isP?accent:G.t4,cursor:'pointer',userSelect:'none',alignSelf:'center',textAlign:'center'}}
                    onClick={()=>!readOnly&&setCurrentSlot(prev=>prev===b.id?null:b.id)}>
                    {isP?'▶':'·'}
                  </div>
                  <div style={{padding:'8px 10px',alignSelf:'center',display:'flex',alignItems:'center',gap:10,minWidth:0}}>
                    <SlotThumb slot={b.slot} storedThumb={b.thumb||null} storedSlug={b.slug||null} storedProvider={b.provider||null} width={48} height={36} />
                    <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:2}}>
                      {canEdit
                        ? <input value={b.slot} onChange={e=>updateBonus(b.id,'slot',e.target.value)}
                            style={{width:'100%',background:'transparent',border:'none',color:G.t1,fontFamily:G.body,fontSize:16,fontWeight:700,padding:0,outline:'none',textOverflow:'ellipsis'}}/>
                        : <span style={{fontFamily:G.body,fontSize:16,fontWeight:700,color:G.t1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.slot}</span>
                      }
                      {(b.caller || b.scat>3) && (
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          {b.caller && <span style={{fontFamily:G.mono,fontSize:11,color:G.t3,letterSpacing:'0.03em'}}>{b.caller}</span>}
                          {b.scat>3 && <span style={{fontFamily:G.mono,fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:2,background:b.scat===5?G.gndim:G.gdim,color:b.scat===5?G.green:G.gold,letterSpacing:'0.05em'}}>{b.scat}S</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{padding:'8px 12px',fontFamily:G.mono,fontSize:18,fontWeight:600,color:G.t2,alignSelf:'center',textAlign:'center'}}>
                    {canEdit?<input type="number" defaultValue={b.bet||''} onInput={e=>updateBonus(b.id,'bet',e.target.value)} placeholder="—" style={{width:'100%',background:'transparent',border:'none',color:G.t2,fontFamily:G.mono,fontSize:18,padding:0,outline:'none',textAlign:'center'}}/>:fmt(b.bet)}
                  </div>
                  <div style={{padding:'8px 12px',fontFamily:G.mono,fontSize:18,fontWeight:600,color:G.t2,alignSelf:'center',textAlign:'center'}}>
                    {canEdit?<input type="number" defaultValue={b.win>0?b.win:''} placeholder="—" onInput={e=>updateBonus(b.id,'win',e.target.value)} style={{width:'100%',background:'transparent',border:'none',color:G.t2,fontFamily:G.mono,fontSize:18,padding:0,outline:'none',textAlign:'center'}}/>:(b.win>0?fmt(b.win):'—')}
                  </div>
                  <div style={{padding:'8px 12px',fontFamily:G.display,fontSize:'1.5rem',fontWeight:700,color:mc,alignSelf:'center',letterSpacing:'0.02em',textAlign:'center'}}>
                    {mult?mult.toFixed(1)+'x':'—'}
                  </div>
                  <div style={{padding:'8px 4px',alignSelf:'center',textAlign:'center'}}>
                    {canEdit&&<button className="icon-btn-danger" onClick={()=>removeBonus(b.id)} style={{background:'none',border:'none',cursor:'pointer',color:G.t4,fontSize:18,lineHeight:1}}>×</button>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Buttons */}
          {canEdit&&(
            <div style={{padding:'8px 10px',borderTop:`1px solid ${G.bdr}`,display:'flex',gap:6,flexShrink:0,background:G.bg2}}>
              <button onClick={()=>{setShowWinners(true);if(onEndHunt)onEndHunt();}}
                style={{height:32,padding:'0 16px',background:'transparent',border:`1px solid ${accent}`,borderRadius:3,fontFamily:G.body,fontSize:12,fontWeight:700,color:accent,cursor:'pointer',letterSpacing:'0.02em'}}>
                🏁 End & Results
              </button>
              {showWinners&&<button onClick={copyResults} style={{height:32,padding:'0 14px',background:'transparent',border:`1px solid ${G.green}`,borderRadius:3,fontFamily:G.body,fontSize:12,fontWeight:600,color:G.green,cursor:'pointer'}}>
                {copyResult?'✓ Copied':'📋 Discord'}
              </button>}
              <button onClick={onResetHunt} style={{height:32,padding:'0 12px',background:'transparent',border:`1px solid ${G.bdr}`,borderRadius:3,fontFamily:G.body,fontSize:12,color:G.t3,cursor:'pointer'}}>Reset</button>
            </div>
          )}
        </div>

        {/* ── RIGHT: Equity ── */}
        <div style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
          {/* Header */}
          <div style={{padding:'8px 12px',borderBottom:`1px solid ${G.bdr}`,display:'flex',alignItems:'center',justifyContent:'space-between',background:G.bg2,flexShrink:0}}>
            <span style={{fontFamily:G.display,fontSize:16,fontWeight:700,letterSpacing:'0.06em',color:G.t1}}>{isVip?'VIP EQUITY':'EQUITY'}</span>
            {canEdit&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,position:'relative'}}>
              {isVip && <button
                onMouseEnter={()=>setEqTooltip('discord')} onMouseLeave={()=>setEqTooltip(null)}
                onClick={()=>{setShowDcImport(v=>!v);setEqTooltip(null);}}
                style={{height:34,padding:'0 11px',background:showDcImport?'rgba(88,101,242,0.3)':'rgba(88,101,242,0.15)',border:`1px solid rgba(88,101,242,${showDcImport?'0.7':'0.45'})`,borderRadius:6,fontFamily:G.mono,fontSize:11,fontWeight:700,color:'#a5b4fc',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                Discord Import
                {eqTooltip==='discord'&&<div style={{position:'absolute',top:'110%',left:0,zIndex:99,background:G.lift,border:`1px solid ${G.bdr}`,borderRadius:6,padding:'8px 12px',minWidth:220,pointerEvents:'none',boxShadow:'0 8px 24px rgba(0,0,0,0.4)'}}>
                  <div style={{fontFamily:G.body,fontSize:12,color:G.t1,fontWeight:600,marginBottom:4}}>Discord Import</div>
                  <div style={{fontFamily:G.mono,fontSize:10,color:G.t3,lineHeight:1.5}}>Paste the VIP Discord message to import all winners. Existing equity is preserved and combined.</div>
                </div>}
              </button>}
              {isVip && <button
                onMouseEnter={()=>setEqTooltip('winners')} onMouseLeave={()=>setEqTooltip(null)}
                onClick={()=>{parseDiscordWinners(defAmt);setEqTooltip(null);}} disabled={dcWinners}
                style={{height:34,padding:'0 11px',background:'rgba(145,70,255,0.15)',border:'1px solid rgba(145,70,255,0.45)',borderRadius:6,fontFamily:G.mono,fontSize:11,fontWeight:700,color:'#d8b4fe',cursor:'pointer',opacity:dcWinners?0.5:1,display:'flex',alignItems:'center',gap:6,position:'relative'}}>
                🏆 {dcWinners?'Importing…':'Roll Winners'}
                {eqTooltip==='winners'&&<div style={{position:'absolute',top:'110%',right:0,zIndex:99,background:G.lift,border:`1px solid ${G.bdr}`,borderRadius:6,padding:'8px 12px',minWidth:220,pointerEvents:'none',boxShadow:'0 8px 24px rgba(0,0,0,0.4)'}}>
                  <div style={{fontFamily:G.body,fontSize:12,color:G.t1,fontWeight:600,marginBottom:4}}>Auto-import Roll Winners</div>
                  <div style={{fontFamily:G.mono,fontSize:10,color:G.t3,lineHeight:1.5}}>Scans Discord for the latest winners list and adds them all automatically at ${'{'}defAmt{'}'} each.</div>
                </div>}
              </button>}
              {isVip&&<button
                onMouseEnter={()=>setEqTooltip('rollwin')} onMouseLeave={()=>setEqTooltip(null)}
                onClick={()=>{addRollWinner();setEqTooltip(null);}}
                style={{height:34,padding:'0 11px',background:'rgba(198,241,53,0.12)',border:`1px solid rgba(198,241,53,0.4)`,borderRadius:6,fontFamily:G.mono,fontSize:11,fontWeight:700,color:G.gold,cursor:'pointer',display:'flex',alignItems:'center',gap:6,position:'relative'}}>
                🎲 Roll Win <span style={{fontSize:10,color:'rgba(198,241,53,0.6)',fontWeight:400}}>${defAmt}</span>
                {eqTooltip==='rollwin'&&<div style={{position:'absolute',top:'110%',left:0,zIndex:99,background:G.lift,border:`1px solid ${G.bdr}`,borderRadius:6,padding:'8px 12px',minWidth:220,pointerEvents:'none',boxShadow:'0 8px 24px rgba(0,0,0,0.4)'}}>
                  <div style={{fontFamily:G.body,fontSize:12,color:G.t1,fontWeight:600,marginBottom:4}}>Manual Roll Winner</div>
                  <div style={{fontFamily:G.mono,fontSize:10,color:G.t3,lineHeight:1.5}}>Adds a blank roll winner row at the standard ${'{'}defAmt{'}'} per person amount. Enter their name after.</div>
                </div>}
              </button>}
              <button
                onMouseEnter={()=>setEqTooltip('extra')} onMouseLeave={()=>setEqTooltip(null)}
                onClick={()=>{addPerson();setEqTooltip(null);}}
                style={{height:34,padding:'0 11px',background:'rgba(251,146,60,0.15)',border:'1px solid rgba(251,146,60,0.4)',borderRadius:6,fontFamily:G.mono,fontSize:11,fontWeight:700,color:'#fb923c',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,position:'relative'}}>
                💰 {isVip?'Extra Equity':'Add Equity'}
                {eqTooltip==='extra'&&<div style={{position:'absolute',top:'110%',right:0,zIndex:99,background:G.lift,border:`1px solid ${G.bdr}`,borderRadius:6,padding:'8px 12px',minWidth:220,pointerEvents:'none',boxShadow:'0 8px 24px rgba(0,0,0,0.4)'}}>
                  <div style={{fontFamily:G.body,fontSize:12,color:G.t1,fontWeight:600,marginBottom:4}}>{isVip?'Extra Equity':'Add Equity'}</div>
                  <div style={{fontFamily:G.mono,fontSize:10,color:G.t3,lineHeight:1.5}}>{isVip?'Add someone with a custom amount outside the roll pool — like Bean or a one-off contributor.':'Add a person to the equity split with a custom amount.'}</div>
                </div>}
              </button>
            </div>}
          </div>

          {/* Discord username notice */}
          {canEdit&&(
            <div style={{padding:'5px 12px',borderBottom:`1px solid ${G.bdr}`,background:G.bg2,flexShrink:0}}>
              <div style={{fontFamily:G.mono,fontSize:11,color:G.t3}}>Enter Discord usernames below — members can add slot calls</div>
            </div>
          )}

          {/* VIP defaults */}
          {isVip&&canEdit&&(
            <div style={{padding:'8px 12px',borderBottom:`1px solid ${G.bdr}`,display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,flexShrink:0}}>
              {[['$ per Person',defAmt,v=>{setDefAmt(v);recalc(v,beanAmt);}],['Bean ($)',beanAmt,v=>{setBeanAmt(v);recalc(defAmt,v);}]].map(([lbl,val,setter])=>(
                <div key={lbl}>
                  <div style={{fontFamily:G.mono,fontSize:11,fontWeight:600,color:G.t3,marginBottom:4}}>{lbl}</div>
                  <input type="number" value={val} onChange={e=>setter(parseFloat(e.target.value)||0)} style={{...inp,height:34,fontSize:14,fontWeight:600}} />
                </div>
              ))}
            </div>
          )}

          {/* Live winnings — scrollable, all together */}
          {equityDisplay.filter(e=>e.name||e.amount>0).length>0&&totalPot>0&&(
            <div style={{borderBottom:`1px solid ${G.bdr}`,flexShrink:0,display:'flex',flexDirection:'column'}}>
              <div style={{padding:'6px 12px 4px',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{fontFamily:G.mono,fontSize:8,fontWeight:700,color:G.t3,letterSpacing:'0.1em',textTransform:'uppercase'}}>LIVE WINNINGS</div>
                <div style={{fontFamily:G.mono,fontSize:8,color:G.t4}}>{equityDisplay.filter(e=>e.name||e.amount>0).length} members</div>
              </div>
              <div style={{overflowY:'auto',minHeight:0,maxHeight:'calc(4 * 130px)',padding:'0 12px 8px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,alignContent:'start'}}>
                {equityDisplay.filter(e=>e.name||e.amount>0).map(e=>{
                  const pct=totalPot>0?(e.amount/totalPot)*100:0;
                  const share=totalPot>0?(e.amount/totalPot)*totalWon:0;
                  const pl=share-e.amount;const hw=totalWon>0;
                  const isFlipped = flippedCard===e.id;
                  const cardInfo = cardInfoMap[e.id];
                  return (
                    <div key={e.id}
                      onClick={()=>{
                        if(flippedCard===e.id){setFlippedCard(null);return;}
                        setFlippedCard(e.id);
                        if(!cardInfoMap[e.id]&&e.id&&e.id!=='bean_auto'&&e.id!=='creator_auto'){
                          // Fetch settings + hunt history for this member
                          Promise.all([
                            apiFetch(`/api/settings/${e.id}`).catch(()=>({})),
                            apiFetch('/api/hunts/archived').catch(()=>[]),
                          ]).then(([settings, archived])=>{
                            // Compute total payout across all archived hunts
                            let totalOut=0, huntCount=0;
                            const memberName=(e.name||'').toLowerCase().trim();
                            (archived||[]).forEach(h=>{
                              const eq=(h.equity||[]).find(x=>(x.id===e.id)||(x.name||'').toLowerCase().trim()===memberName);
                              if(eq){
                                const pot=(h.equity||[]).reduce((s,x)=>s+x.amount,0);
                                const won=(h.bonuses||[]).reduce((s,b)=>s+b.win,0);
                                if(pot>0){ totalOut+=((eq.amount/pot)*won); huntCount++; }
                              }
                            });
                            setCardInfoMap(prev=>({...prev,[e.id]:{
                              rainbetName: settings?.rainbetName||'',
                              totalPayout: totalOut,
                              huntCount,
                              loaded:true,
                            }}));
                          });
                        }
                      }}
                      style={{background:G.card,border:`1px solid ${isFlipped?accent:(e.isRollWinner?'rgba(198,241,53,0.3)':G.bdr)}`,borderRadius:6,
                        position:'relative',cursor:'pointer',minHeight:90,
                        transition:'border-color .15s',userSelect:'none',
                        perspective:600,
                      }}>
                      {/* Front face */}
                      <div style={{
                        position:'absolute',inset:0,borderRadius:6,padding:'8px 10px',
                        backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden',
                        transition:'transform .35s cubic-bezier(.4,0,.2,1)',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        transformStyle:'preserve-3d',
                      }}>
                        <div style={{fontFamily:G.body,fontWeight:700,fontSize:14,color:'#ffffff',display:'flex',alignItems:'center',gap:5,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',marginBottom:2}}>
                          {iconFor(e,13)}
                          <span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{e.name||'—'}</span>
                        </div>
                        <div style={{fontFamily:G.mono,fontSize:11,color:G.t3,marginBottom:4}}>
                          {pct.toFixed(1)}% · {e.rollAmount>0&&(e.amount-e.rollAmount)>0
                            ? <span title={`Base: ${fmt(e.amount-e.rollAmount)} + Roll: ${fmt(e.rollAmount)}`}>{fmt(e.amount-e.rollAmount)} + {fmt(e.rollAmount)}</span>
                            : fmt(e.amount)}
                        </div>
                        <div style={{fontFamily:G.display,fontSize:'1.3rem',fontWeight:700,color:hw&&totalWon>0?(share>=e.amount?G.green:G.red):G.t3,letterSpacing:'0.02em'}}>{hw&&totalWon>0?fmt(share):'—'}</div>
                        {hw&&totalWon>0&&<div style={{fontFamily:G.mono,fontSize:11,fontWeight:600,color:pl>=0?G.green:G.red,marginTop:1}}>{fmtS(pl)}</div>}
                        <div style={{position:'absolute',bottom:6,right:8,fontFamily:G.mono,fontSize:8,color:G.t4,letterSpacing:'0.04em'}}>tap to flip</div>
                      </div>
                      {/* Back face */}
                      <div style={{
                        position:'absolute',inset:0,borderRadius:6,padding:'8px 10px',
                        backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden',
                        transition:'transform .35s cubic-bezier(.4,0,.2,1)',
                        transform: isFlipped ? 'rotateY(0deg)' : 'rotateY(-180deg)',
                        transformStyle:'preserve-3d',
                        background: G.lift,
                        display:'flex',flexDirection:'column',gap:4,
                      }}>
                        {/* Name header */}
                        <div style={{fontFamily:G.mono,fontSize:8,fontWeight:700,color:accent,letterSpacing:'0.1em',textTransform:'uppercase'}}>{e.name||'—'}</div>

                        {/* Discord + Rainbet row */}
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                          <div>
                            <div style={{fontFamily:G.mono,fontSize:7,color:G.t4,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:1}}>Discord</div>
                            <div style={{fontFamily:G.body,fontSize:11,color:G.t2,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.name||'—'}</div>
                          </div>
                          <div>
                            <div style={{fontFamily:G.mono,fontSize:7,color:G.t4,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:1}}>Rainbet</div>
                            <div style={{fontFamily:G.body,fontSize:11,color:G.t2,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                              {!cardInfo ? <span style={{color:G.t4}}>…</span>
                                : cardInfo.rainbetName || <span style={{color:G.t4}}>not set</span>}
                            </div>
                          </div>
                        </div>

                        {/* Divider */}
                        <div style={{height:1,background:G.bdr,flexShrink:0}}/>

                        {/* Current hunt payout — the tip number */}
                        <div>
                          <div style={{fontFamily:G.mono,fontSize:7,color:accent,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:1}}>Current Hunt Payout</div>
                          <div style={{fontFamily:G.display,fontSize:'1.45rem',fontWeight:700,letterSpacing:'0.02em',
                            color:hw&&totalWon>0?(share>=e.amount?G.green:G.red):G.t3}}>
                            {hw&&totalWon>0 ? fmt(share) : '—'}
                          </div>
                          {hw&&totalWon>0&&(
                            <div style={{fontFamily:G.mono,fontSize:10,fontWeight:600,color:pl>=0?G.green:G.red}}>
                              {fmtS(pl)} ({pct.toFixed(1)}% · in {fmt(e.amount)})
                            </div>
                          )}
                        </div>

                        {/* All-time payout — small at bottom */}
                        <div style={{marginTop:'auto',paddingTop:2,borderTop:`1px solid ${G.bdr}`}}>
                          <div style={{fontFamily:G.mono,fontSize:7,color:G.t4,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:1}}>All-time payout</div>
                          <div style={{display:'flex',alignItems:'baseline',gap:6}}>
                            <div style={{fontFamily:G.mono,fontSize:12,fontWeight:700,color:cardInfo?.totalPayout>0?G.t2:G.t4}}>
                              {!cardInfo ? '…' : cardInfo.huntCount>0 ? fmt(cardInfo.totalPayout) : '—'}
                            </div>
                            {cardInfo?.huntCount>0&&<div style={{fontFamily:G.mono,fontSize:8,color:G.t4}}>{cardInfo.huntCount} hunt{cardInfo.huntCount!==1?'s':''}</div>}
                          </div>
                        </div>

                        <div style={{position:'absolute',bottom:6,right:8,fontFamily:G.mono,fontSize:8,color:G.t4,letterSpacing:'0.04em'}}>tap to flip</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Equity inputs */}
          {canEdit&&(
            <div style={{flex:1,overflowY:'auto',maxHeight:'calc(4 * 50px + 180px)',padding:'8px 12px'}}>
              {(equity).map(e=>(
                <div key={e.id}
                  draggable onDragStart={()=>setDragEquityId(e.id)}
                  onDragOver={ev=>ev.preventDefault()}
                  onDrop={()=>{
                    if(!dragEquityId||dragEquityId===e.id)return;
                    upd(h=>{const a=h.equity.slice(),fi=a.findIndex(x=>x.id===dragEquityId),ti=a.findIndex(x=>x.id===e.id);const[m]=a.splice(fi,1);a.splice(ti,0,m);return{...h,equity:a};});
                    setDragEquityId(null);
                  }}
                  style={{display:'grid',gridTemplateColumns:'14px 1fr 70px auto',gap:4,alignItems:'center',marginBottom:5,cursor:'grab'}}>
                  <span style={{fontFamily:G.mono,color:G.t4,fontSize:11,textAlign:'center',userSelect:'none'}}>⋮</span>
                  <div style={{position:'relative'}}>
                    <input placeholder={e.isRollWinner?'Roll winner name':e.amount>0?'Name or Discord username':'Discord username'} defaultValue={e.name} onChange={ev=>updatePerson(e.id,'name',ev.target.value)} style={{...inp,height:30,fontSize:12,fontWeight:500,paddingLeft:(e.id==='bean_auto'||e.id==='creator_auto'||(runnerName&&(e.name||'').toLowerCase().trim()===runnerName)||e.isRollWinner||e.isMod||e.name||e.amount>0)?26:10}} />
                    <span style={{position:'absolute',left:7,top:'50%',transform:'translateY(-50%)',pointerEvents:'none',display:'flex',alignItems:'center'}}>
                      {iconFor(e,12)}
                    </span>
                  </div>
                  {e.rollAmount>0 && (e.amount-e.rollAmount)>0 ? (
                    <div style={{display:'flex',gap:3}}>
                      <div style={{position:'relative',flex:1}}>
                        <input key={`${e.id}-b`} type="number"
                          defaultValue={(e.amount-e.rollAmount).toFixed(0)}
                          onChange={ev=>{const base=parseFloat(ev.target.value)||0;updatePerson(e.id,'amount',base+(e.rollAmount||0));}}
                          style={{...inp,height:30,fontSize:11,paddingTop:10,width:'100%'}} />
                        <span style={{position:'absolute',top:3,left:6,fontFamily:G.mono,fontSize:7,fontWeight:700,color:'#fb923c',pointerEvents:'none',letterSpacing:'0.05em'}}>ADDED</span>
                      </div>
                      <div style={{position:'relative',flex:1}}>
                        <input key={`${e.id}-r`} type="number"
                          defaultValue={e.rollAmount.toFixed(0)}
                          onChange={ev=>{const roll=parseFloat(ev.target.value)||0;const base=e.amount-(e.rollAmount||0);updatePerson(e.id,'amount',base+roll);upd(h=>({...h,equity:h.equity.map(x=>x.id===e.id?{...x,rollAmount:roll}:x)}));}}
                          style={{...inp,height:30,fontSize:11,paddingTop:10,width:'100%'}} />
                        <span style={{position:'absolute',top:3,left:6,fontFamily:G.mono,fontSize:7,fontWeight:700,color:G.gold,pointerEvents:'none',letterSpacing:'0.05em'}}>ROLL WIN</span>
                      </div>
                    </div>
                  ) : (
                    <input key={e.id} type="number" defaultValue={e.amount>0?e.amount:''} onChange={ev=>updatePerson(e.id,'amount',ev.target.value)} style={{...inp,height:30,fontSize:12,fontWeight:600}} />
                  )}
                  <div style={{display:'flex',gap:2,alignItems:'center'}}>
                    <button onClick={()=>{
                      const add=parseFloat(window.prompt(`Add equity to ${e.name||'this person'} (current: ${fmt(e.amount)}):`, ''));
                      if(!add||isNaN(add)||add<=0)return;
                      upd(h=>({...h,equity:h.equity.map(x=>x.id===e.id?{...x,amount:parseFloat((x.amount+add).toFixed(2)),rollAmount:parseFloat(((x.rollAmount||0)+add).toFixed(2))}:x)}));
                    }} title="Add more equity to this person"
                    style={{height:30,width:26,background:'rgba(74,222,128,0.1)',border:`1px solid rgba(74,222,128,0.35)`,borderRadius:4,cursor:'pointer',color:G.green,fontSize:16,fontFamily:G.mono,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}
                    onMouseEnter={ev=>ev.currentTarget.style.background='rgba(74,222,128,0.22)'}
                    onMouseLeave={ev=>ev.currentTarget.style.background='rgba(74,222,128,0.1)'}>+</button>
                    <button onClick={()=>{
                      const others=equity.filter(x=>x.id!==e.id&&x.name);
                      if(!others.length){alert('No other members to split to.');return;}
                      if(!window.confirm(`Divvy up ${e.name||'this person'}'s ${fmt(e.amount)} equally among ${others.length} others?`))return;
                      const pp=parseFloat((e.amount/others.length).toFixed(2));
                      upd(h=>({...h,equity:h.equity.filter(x=>x.id!==e.id).map(x=>others.find(o=>o.id===x.id)?{...x,amount:parseFloat((x.amount+pp).toFixed(2))}:x)}));
                    }} title="Divvy up this person's equity among everyone else"
                    style={{height:30,width:30,background:'rgba(198,241,53,0.1)',border:`1px solid rgba(198,241,53,0.35)`,borderRadius:4,cursor:'pointer',color:G.gold,fontSize:16,fontFamily:'serif',fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center'}}
                    onMouseEnter={ev=>{ev.currentTarget.style.background='rgba(198,241,53,0.18)';ev.currentTarget.style.borderColor='rgba(198,241,53,0.5)';}}
                    onMouseLeave={ev=>{ev.currentTarget.style.background='rgba(198,241,53,0.08)';ev.currentTarget.style.borderColor='rgba(198,241,53,0.25)';}}>÷</button>
                    <button onClick={()=>removePerson(e.id)} className="icon-btn-danger" style={{background:'none',border:'none',cursor:'pointer',color:G.t3,fontSize:16,padding:'0 2px',height:30,display:'flex',alignItems:'center'}}>×</button>
                  </div>
                </div>
              ))}
              {/* Starting balance inline */}
              {canEdit && <div style={{margin:'10px 0 4px',padding:'10px 12px',background:G.bg2,border:`1px solid ${G.bdr}`,borderRadius:6,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontFamily:G.mono,fontSize:12,fontWeight:700,color:G.t3,letterSpacing:'0.06em',textTransform:'uppercase'}}>Starting Balance</span>
                <span style={{fontFamily:G.display,fontSize:'1.8rem',fontWeight:700,color:G.gold}}>{fmt(totalPot)}</span>
              </div>}
            </div>
          )}

          {/* Read-only members */}
          {readOnly&&equityDisplay.length>0&&(
            <div style={{padding:'8px 12px',flex:1,overflowY:'auto'}}>
              <div style={{fontFamily:G.mono,fontSize:8,color:G.t4,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:6}}>MEMBERS</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                {equityDisplay.map(e=>{const pct=totalPot>0?(e.amount/totalPot)*100:0;return(
                  <div key={e.id} style={{background:G.sur,border:`1px solid ${G.bdr}`,borderRadius:3,padding:'6px 8px'}}>
                    <div style={{fontFamily:G.body,fontWeight:700,fontSize:13,color:G.t1,display:'flex',alignItems:'center',gap:5}}>
                      {iconFor(e,13)}
                      <span>{e.name}</span>
                    </div>
                    <div style={{fontFamily:G.mono,fontSize:9,color:G.t3}}>{pct.toFixed(1)}% · {fmt(e.amount)}</div>
                  </div>
                );})}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Paste Slot Calls Modal ── */}
      {canEdit && showPasteCalls && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowPasteCalls(false)}>
          <div style={{background:G.card,border:`1px solid rgba(198,241,53,0.3)`,borderRadius:10,padding:'1.5rem',width:540,maxWidth:'90vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <span style={{fontFamily:G.display,fontSize:18,fontWeight:700,color:G.gold,letterSpacing:'0.04em'}}>📋 PARSE SLOT CALLS</span>
              <button onClick={()=>setShowPasteCalls(false)} style={{background:'none',border:'none',cursor:'pointer',color:G.t3,fontSize:20}}>×</button>
            </div>
            <p style={{fontFamily:G.mono,fontSize:11,color:G.t3,marginBottom:10,lineHeight:1.6}}>
              Paste Discord chat or plain slot names. Discord format auto-detects caller names and only imports calls from equity members.
            </p>
            <textarea value={pasteCallsText} onChange={e=>setPasteCallsText(e.target.value)} rows={10} autoFocus
              placeholder={"Paste Discord chat or plain slot names here…"}
              style={{width:'100%',background:G.bg,border:`1px solid ${G.bdr}`,borderRadius:6,padding:'10px 12px',fontFamily:G.mono,fontSize:12,color:G.t1,resize:'vertical',lineHeight:1.6,marginBottom:10}}/>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <button onClick={()=>{
                const existing = new Set((hunt.calls||[]).map(c=>(c.slot||'').toLowerCase().trim()));
                const text = pasteCallsText.trim();
                const newCalls = [];
                const equityNames = equity.filter(e=>e.name).map(e=>e.name.toLowerCase().trim());
                const skippedCallers = new Set();

                // Detect Discord format: any line has an em/en dash + timestamp keyword
                const isDiscordFormat = /[—–]\s*(Yesterday|Today|\d{1,2}:\d{2}|\d{1,2}\/\d{1,2})/i.test(text);

                if (isDiscordFormat) {
                  // Block header pattern: optional "N. " prefix, then name, then " — Yesterday/Today/time"
                  const HEADER_RE = /^(\d+\.\s+)?(.+?)\s*[—–]\s*(Yesterday|Today|\d{1,2}:\d{2}|\d{1,2}\/\d{1,2})/i;

                  // Split lines into message blocks
                  const rawLines = text.split('\n');
                  const blocks = [];
                  let cur = null;
                  for (const line of rawLines) {
                    const stripped = line.trim();
                    if (!stripped) continue;
                    if (HEADER_RE.test(stripped)) {
                      if (cur) blocks.push(cur);
                      cur = { header: stripped, lines: [] };
                    } else if (cur) {
                      cur.lines.push(stripped);
                    }
                  }
                  if (cur) blocks.push(cur);

                  for (const block of blocks) {
                    const hm = block.header.match(HEADER_RE);
                    if (!hm) continue;
                    // Group 2 is the raw caller field — strip all Discord noise
                    let caller = hm[2]
                      .replace(/Role\s*icon/gi, '')        // "Role icon" badge text
                      .replace(/\[.*?\]/g, '')              // [BEAN] [LR] [GUNZ] [VIP] etc
                      .replace(/\bVIP\b/gi, '')             // standalone "VIP" label
                      .replace(/,\s*$/, '')                 // trailing comma
                      .trim();
                    if (!caller) continue;

                    const callerLow = caller.toLowerCase().trim();
                    const callerNoSp = callerLow.replace(/\s+/g,'');
                    const inEquity = equityNames.some(n => {
                      const nNoSp = n.replace(/\s+/g,'');
                      return n === callerLow || nNoSp === callerNoSp || n.includes(callerLow) || callerLow.includes(n);
                    });
                    if (!inEquity) { skippedCallers.add(caller); continue; }

                    // Use the canonical equity name (as stored) rather than the raw parsed caller
                    const equityEntry = equity.find(e => {
                      if (!e.name) return false;
                      const n = e.name.toLowerCase().trim();
                      const nNoSp = n.replace(/\s+/g,'');
                      return n===callerLow||nNoSp===callerNoSp||n.includes(callerLow)||callerLow.includes(n);
                    });
                    const canonicalCaller = equityEntry?.name || caller;

                    // Extract anything after the timestamp on the header line itself
                    const afterTimestamp = block.header
                      .replace(HEADER_RE, '')
                      .replace(/^\s*at\s+\d{1,2}:\d{2}\s*(AM|PM)?\s*/i, '')
                      .trim();
                    const allLines = [...(afterTimestamp ? [afterTimestamp] : []), ...block.lines];

                    // Slot lookup — fuzzy match against cached slot list, return canonical name + thumb
                    const resolveSlot = (raw) => {
                      const q = raw.toLowerCase().trim();
                      const normPunct = s => s.replace(/[,!.]/g, '').replace(/\s+/g, ' ').trim();
                      const qNorm = normPunct(q);
                      const qWords = qNorm.split(/\s+/);
                      const pool = _slotCache.get();
                      if (!pool.length) return { name: raw.replace(/\b\w/g, c => c.toUpperCase()), thumb: null };

                      // 1. Exact match (with and without punctuation)
                      let m = pool.find(s => s.name.toLowerCase() === q || normPunct(s.name.toLowerCase()) === qNorm);
                      if (m) return { name: m.name, thumb: m.thumb || null };

                      // 2. Slot name starts with query, only slightly longer
                      const sw2 = pool.filter(s => normPunct(s.name.toLowerCase()).startsWith(qNorm));
                      if (sw2.length) {
                        const best = sw2.reduce((a,b) => (a.name.length - q.length) < (b.name.length - q.length) ? a : b);
                        if (best.name.length - q.length <= 12) return { name: best.name, thumb: best.thumb || null };
                      }

                      // 3. Query starts with slot name, at least 65% length ratio
                      const sw3 = pool.filter(s => s.name.length > 4 && qNorm.startsWith(normPunct(s.name.toLowerCase())) && s.name.length / q.length >= 0.65);
                      if (sw3.length) {
                        const best = sw3.reduce((a,b) => a.name.length > b.name.length ? a : b);
                        return { name: best.name, thumb: best.thumb || null };
                      }

                      // 4. All query words appear in slot name
                      const sw4 = pool.filter(s => qWords.every(w => normPunct(s.name.toLowerCase()).includes(w)));
                      if (sw4.length) {
                        const best = sw4.reduce((a,b) => Math.abs(a.name.length - q.length) < Math.abs(b.name.length - q.length) ? a : b);
                        return { name: best.name, thumb: best.thumb || null };
                      }

                      // 5. All slot name words (2+) appear in query, length ratio >= 0.6
                      const sw5 = pool.filter(s => {
                        const sWords = normPunct(s.name.toLowerCase()).split(/\s+/);
                        return sWords.length >= 2 && sWords.every(w => qNorm.includes(w)) && s.name.length / q.length >= 0.6;
                      });
                      if (sw5.length) {
                        const best = sw5.reduce((a,b) => a.name.length > b.name.length ? a : b);
                        return { name: best.name, thumb: best.thumb || null };
                      }

                      return { name: raw.replace(/\b\w/g, c => c.toUpperCase()), thumb: null };
                    };
                    // Does this block have any @mention lines? If so it's a slot call block
                    const blockHasAtMention = allLines.some(l => /@\S+/.test(l));

                    for (const line of allLines) {
                      const hasAtMention = /@\S+/.test(line);
                      // Strip @mentions to get slot content
                      const content = line.replace(/@\S+\s*/g,'').trim();
                      if (!content) continue;

                      // A line is slot content if:
                      // - It directly has an @mention, OR
                      // - The block has @mentions AND this line is a plain list (comma/slash separated)
                      //   AND it's not obviously chat
                      const isList = content.includes(',') || content.includes('/');
                      if (!hasAtMention && !(blockHasAtMention && isList)) continue;

                      // Skip chat lines — first-person sentences, common chat phrases
                      if (/\b(im|i'm|ill|i'll|i\s+will|i\s+need|i\s+want|going|gonna|playing|play|snooker|profit|hour|boys|earphone|worry|present|lighting|good enough|loss|streak|checked|check\s+in|lol|lmao|gz|gg|wtf|omg|same|nvm|crazy|thank|sorry|reroll|deal|twice|plz)\b/i.test(content)) continue;
                      if (/[?!]$/.test(content.trim())) continue;
                      // Skip lines that start with first person
                      if (/^(i\b|im\b|ill\b)/i.test(content.trim())) continue;

                      // Strip intro noise like "my slot calls CULT. " or "my calls:"
                      const cleaned = content.replace(/^(my\s+slot\s+calls?\s*\w*\s*[.:]?\s*)/i,'');

                      // Split on comma, slash, and ". " (period-space between words = separator)
                      const parts = cleaned.split(/[,/]|(?<=[a-zA-Z])\.\s+(?=[A-Za-z])/);
                      for (const p of parts) {
                        let slotRaw = p
                          .replace(/:[a-zA-Z0-9_]+:/g,'')  // :discord_emoji:
                          .replace(/\[.*?\]/g,'')            // [tags]
                          .trim();
                        // Skip bare numbers or "N."
                        if (!slotRaw || /^\d+\.?$/.test(slotRaw)) continue;
                        if (slotRaw.length < 2 || slotRaw.length > 80) continue;
                        if (!existing.has(slotRaw.toLowerCase().trim())) {
                          existing.add(slotRaw.toLowerCase().trim());
                          const { name: slot, thumb } = resolveSlot(slotRaw);
                          newCalls.push({id:uid(), slot, thumb, user:canonicalCaller, status:'pending'});
                        }
                      }
                    }
                  }
                } else {
                  // Plain format: one per line or comma separated, no caller attribution
                  // (resolveSlot not available here — define inline)
                  const resolveSlotPlain = (raw) => {
                    const q = raw.toLowerCase().trim();
                    const normPunct = s => s.replace(/[,!.]/g,'').replace(/\s+/g,' ').trim();
                    const qNorm = normPunct(q);
                    const pool = _slotCache.get();
                    if (!pool.length) return { name: raw.replace(/\b\w/g,c=>c.toUpperCase()), thumb: null };
                    let m = pool.find(s=>s.name.toLowerCase()===q||normPunct(s.name.toLowerCase())===qNorm); if(m) return {name:m.name,thumb:m.thumb||null};
                    const sw2=pool.filter(s=>normPunct(s.name.toLowerCase()).startsWith(qNorm));
                    if(sw2.length){const b=sw2.reduce((a,c)=>(a.name.length-q.length)<(c.name.length-q.length)?a:c);if(b.name.length-q.length<=12)return{name:b.name,thumb:b.thumb||null};}
                    const sw3=pool.filter(s=>s.name.length>4&&qNorm.startsWith(normPunct(s.name.toLowerCase()))&&s.name.length/q.length>=0.65);
                    if(sw3.length){const b=sw3.reduce((a,c)=>a.name.length>c.name.length?a:c);return{name:b.name,thumb:b.thumb||null};}
                    const qWords=qNorm.split(/\s+/);
                    const sw4=pool.filter(s=>qWords.every(w=>normPunct(s.name.toLowerCase()).includes(w)));
                    if(sw4.length){const b=sw4.reduce((a,c)=>Math.abs(a.name.length-q.length)<Math.abs(c.name.length-q.length)?a:c);return{name:b.name,thumb:b.thumb||null};}
                    const sw5=pool.filter(s=>{const sw=normPunct(s.name.toLowerCase()).split(/\s+/);return sw.length>=2&&sw.every(w=>qNorm.includes(w))&&s.name.length/q.length>=0.6;});
                    if(sw5.length){const b=sw5.reduce((a,c)=>a.name.length>c.name.length?a:c);return{name:b.name,thumb:b.thumb||null};}
                    return{name:raw.replace(/\b\w/g,c=>c.toUpperCase()),thumb:null};
                  };
                  const raw = text
                    .split(/[\n,]/)
                    .map(s => s.replace(/^[#\-•*\d.]+\s*/,'').replace(/:[a-zA-Z0-9_]+:/g,'').trim())
                    .filter(s => s.length > 1 && s.length < 80 && !existing.has(s.toLowerCase().trim()));
                  const unique = [...new Map(raw.map(s=>[s.toLowerCase(),s])).values()];
                  unique.forEach(slotRaw => {
                    const { name: slot, thumb } = resolveSlotPlain(slotRaw);
                    newCalls.push({id:uid(), slot, thumb, user:'', status:'pending'});
                  });
                }

                if (!newCalls.length) {
                  const msg = skippedCallers.size
                    ? `No calls added. Skipped non-equity callers: ${[...skippedCallers].join(', ')}`
                    : 'No new slot calls found.';
                  alert(msg); return;
                }
                upd(h=>({...h,calls:[...(h.calls||[]),...newCalls]}));
                setPasteCallsText('');
                setShowPasteCalls(false);
                const skipMsg = skippedCallers.size ? ` (skipped non-equity: ${[...skippedCallers].join(', ')})` : '';
                alert(`✅ Added ${newCalls.length} slot call${newCalls.length!==1?'s':''}${skipMsg}`);
              }} style={{height:38,padding:'0 20px',background:G.gold,color:'#000',border:'none',borderRadius:6,fontFamily:G.body,fontSize:13,fontWeight:700,cursor:'pointer'}}>
                Import Calls
              </button>
              <button onClick={()=>setPasteCallsText('')} style={{height:38,padding:'0 14px',background:'transparent',border:`1px solid ${G.bdr}`,borderRadius:6,fontFamily:G.body,fontSize:13,color:G.t3,cursor:'pointer'}}>Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Call Request Popup ── */}
      {canEdit && showReqPopup && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowReqPopup(false)}>
          <div style={{background:G.card,border:`1px solid rgba(251,146,60,0.4)`,borderRadius:10,padding:'1.5rem',width:420,maxWidth:'90vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <span style={{fontFamily:G.display,fontSize:18,fontWeight:700,color:'#fb923c',letterSpacing:'0.04em'}}>🔔 SLOT CALL REQUESTS</span>
              <button onClick={()=>setShowReqPopup(false)} style={{background:'none',border:'none',cursor:'pointer',color:G.t3,fontSize:20}}>×</button>
            </div>
            {callRequests.length===0
              ? <div style={{fontFamily:G.mono,fontSize:12,color:G.t3,textAlign:'center',padding:'1rem'}}>No pending requests</div>
              : callRequests.map(req=>(
                <div key={req.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid ${G.bdr}`}}>
                  {req.avatar
                    ? <img src={req.avatar} alt="" style={{width:36,height:36,borderRadius:'50%',flexShrink:0}}/>
                    : <div style={{width:36,height:36,borderRadius:'50%',background:G.lift,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:G.display,fontSize:16,color:G.t2,flexShrink:0}}>{(req.displayName||'?')[0].toUpperCase()}</div>
                  }
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:G.body,fontWeight:700,fontSize:14,color:G.t1}}>{req.displayName}</div>
                    <div style={{fontFamily:G.mono,fontSize:10,color:G.t3}}>wants to add slot calls</div>
                  </div>
                  <div style={{display:'flex',gap:6,flexShrink:0}}>
                    <button onClick={async()=>{
                      try {
                        await apiFetch(`/api/hunts/${hunt.user?.id}/call-requests/${req.id}`, { method:'POST', body: JSON.stringify({ action:'grant' }) });
                        setCallRequests(prev => prev.filter(r => r.id !== req.id));
                      } catch(e) { alert(e.message||'Failed to grant'); }
                    }} style={{height:28,padding:'0 12px',background:'rgba(198,241,53,0.15)',border:`1px solid rgba(198,241,53,0.4)`,borderRadius:4,fontFamily:G.mono,fontSize:10,fontWeight:700,color:G.gold,cursor:'pointer'}}>✓ Allow</button>
                    <button onClick={async()=>{
                      try {
                        await apiFetch(`/api/hunts/${hunt.user?.id}/call-requests/${req.id}`, { method:'POST', body: JSON.stringify({ action:'deny' }) });
                        setCallRequests(prev => prev.filter(r => r.id !== req.id));
                      } catch(e) { alert(e.message||'Failed to deny'); }
                    }} style={{height:28,padding:'0 12px',background:'rgba(255,68,68,0.1)',border:`1px solid rgba(255,68,68,0.35)`,borderRadius:4,fontFamily:G.mono,fontSize:10,fontWeight:700,color:G.red,cursor:'pointer'}}>✗ Deny</button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── Discord Import Modal ── */}
      {isVip&&canEdit&&showDcImport&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowDcImport(false)}>
          <div style={{background:G.card,border:`1px solid rgba(88,101,242,0.5)`,borderRadius:10,padding:'1.5rem',width:500,maxWidth:'90vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#a5b4fc"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                <span style={{fontFamily:G.display,fontSize:20,fontWeight:700,color:'#a5b4fc',letterSpacing:'0.04em'}}>Discord Import</span>
              </div>
              <button onClick={()=>setShowDcImport(false)} style={{background:'none',border:'none',cursor:'pointer',color:G.t3,fontSize:22,lineHeight:1,padding:'0 4px'}}>×</button>
            </div>
            <p style={{fontFamily:G.mono,fontSize:11,color:G.t3,marginBottom:12,lineHeight:1.6}}>Paste the VIP Discord message below. Winners will be added at <span style={{color:G.gold}}>${'{'}defAmt{'}'} each</span>. Existing equity is preserved and combined.</p>
            <textarea value={discordText} onChange={e=>setDiscordText(e.target.value)} rows={8}
              placeholder="Paste VIP Discord message here…"
              autoFocus
              style={{width:'100%',background:G.bg,border:`1px solid ${G.bdr}`,borderRadius:6,padding:'10px 12px',fontFamily:G.mono,fontSize:12,color:G.t1,resize:'vertical',lineHeight:1.6,marginBottom:10}} />
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <button onClick={()=>{
                  const lines=discordText.split('\n'),winners=[],hosts=[];
                  lines.forEach(line=>{
                    line=line.trim();if(!line)return;
                    if(line[0]==='#'){
                      const m=line.match(/^#\d+\s+(.+?)\s+\d+\.\d+/);
                      if(m&&m[1].toLowerCase()!=='name')winners.push(m[1].trim());
                    }else if(line.toLowerCase().startsWith('host:')){
                      const p=line.split(/\s+/);if(p.length>=2)hosts.push(p.slice(1).join(' '));
                    }
                  });
                  if(!winners.length&&!hosts.length){setParseHint('No names found.');return;}
                  const allWinnerNames = new Set(winners.map(n=>n.toLowerCase().trim()));
                  const mergedEq = equity.map(e => {
                    const n = (e.name||'').toLowerCase().trim();
                    if (n === 'bean' || e.id === 'bean_auto') return e;
                    if (n && allWinnerNames.has(n)) {
                      allWinnerNames.delete(n);
                      const rollAmt = defAmt;
                      const prevRoll = e.rollAmount||0;
                      return {...e, amount: parseFloat((e.amount + rollAmt).toFixed(2)), rollAmount: parseFloat((prevRoll + rollAmt).toFixed(2)), isRollWinner: true};
                    }
                    return e;
                  });
                  const existingNames = new Set(mergedEq.map(e=>(e.name||'').toLowerCase().trim()));
                  const hostEntry = hosts[0] && !existingNames.has(hosts[0].toLowerCase().trim())
                    ? [{id:uid(),name:hosts[0],amount:defAmt,isRollWinner:false,isMod:true}] : [];
                  const newWinners = [...allWinnerNames]
                    .map(n=>({id:uid(),name:winners.find(w=>w.toLowerCase().trim()===n)||n,amount:defAmt,isRollWinner:true}));
                  const newEq = [...mergedEq, ...hostEntry, ...newWinners];
                  const combined = equity.length - mergedEq.filter((e,i)=>e===equity[i]).length;
                  upd(h=>({...h,equity:newEq}));
                  setParseHint(`✓ ${'{'}newWinners.length{'}'} new, ${'{'}combined{'}'} combined`);
                  setTimeout(()=>{setShowDcImport(false);setDiscordText('');setParseHint('');},1200);
              }} style={{height:38,padding:'0 20px',background:'rgba(88,101,242,0.8)',color:'#fff',border:'none',borderRadius:6,fontFamily:G.body,fontSize:13,fontWeight:700,cursor:'pointer'}}>
                Import
              </button>
              <button onClick={()=>{setDiscordText('');setParseHint('');}} style={{height:38,padding:'0 14px',background:'transparent',border:`1px solid ${G.bdr}`,borderRadius:6,fontFamily:G.body,fontSize:13,color:G.t3,cursor:'pointer'}}>Clear</button>
              {parseHint&&<span style={{fontFamily:G.mono,fontSize:11,color:parseHint.startsWith('✓')?G.green:G.red}}>{parseHint}</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── Winners ── */}
      {showWinners&&totalWon>0&&equityDisplay.length>0&&(
        <div style={{padding:'1rem 1.25rem',borderTop:`1px solid ${G.bdr}`,background:G.bg2}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem',flexWrap:'wrap',gap:8}}>
            <h2 style={{fontFamily:G.display,fontSize:'1.6rem',fontWeight:700,color:G.gold,letterSpacing:'0.06em'}}>
              🏆 {isVip?'VIP':'COMMUNITY'} HUNT RESULTS
            </h2>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{fontFamily:G.display,fontSize:'1.3rem',color:G.green,letterSpacing:'0.03em'}}>POT: {fmt(totalWon)}</span>
              <button onClick={copyResults} style={{height:30,padding:'0 14px',background:'transparent',border:`1px solid ${G.green}`,borderRadius:3,fontFamily:G.body,fontSize:11,fontWeight:600,color:G.green,cursor:'pointer'}}>
                {copyResult?'✓ Copied':'📋 Copy for Discord'}
              </button>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:6}}>
            {equityDisplay.slice().sort((a,b)=>b.amount-a.amount).map((e,i)=>{
              const pct=totalPot>0?(e.amount/totalPot)*100:0,share=totalPot>0?(e.amount/totalPot)*totalWon:0,pl=share-e.amount;
              return(
                <div key={e.id} style={{background:i===0?G.gdim:G.sur,border:`1px solid ${i===0?`${G.gold}44`:G.bdr}`,borderRadius:4,padding:'10px 12px',borderLeft:`3px solid ${i===0?G.gold:(pl>=0?G.green:G.red)}`}}>
                  <div style={{fontFamily:G.body,fontWeight:700,fontSize:15,marginBottom:3,color:G.t1}}>{['🥇 ','🥈 ','🥉 '][i]||''}{e.name}</div>
                  <div style={{fontFamily:G.mono,fontSize:10,color:G.t3,marginBottom:5}}>{pct.toFixed(1)}% · invested {fmt(e.amount)}</div>
                  <div style={{fontFamily:G.display,fontSize:'1.6rem',color:i===0?G.gold:G.green,letterSpacing:'0.03em'}}>{fmt(share)}</div>
                  <div style={{fontFamily:G.mono,fontSize:10,color:pl>=0?G.green:G.red}}>{fmtS(pl)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modals ── */}

      {/* Bet prompt */}
      {betPrompt&&(
        <div style={modalBg}>
          <div style={{...modal,width:300}}>
            <div style={{fontFamily:G.mono,fontSize:9,color:G.green,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:6}}>GOT IN!</div>
            <div style={{fontFamily:G.display,fontSize:'1.8rem',color:G.t1,marginBottom:12,letterSpacing:'0.03em'}}>{betPrompt.slot}</div>
            <div style={{fontFamily:G.mono,fontSize:9,color:G.t3,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>SCATTER COUNT</div>
            <div style={{display:'flex',gap:8,marginBottom:12,justifyContent:'center'}}>
              <button onClick={()=>setActiveScat(3)} title="Bonus (3 scatter)" style={{background:'transparent',border:`2px solid ${activeScat===3?accent:'transparent'}`,borderRadius:8,padding:2,cursor:'pointer',transition:'all .12s',transform:activeScat===3?'scale(1.1)':'scale(1)'}}>
                <svg width="48" height="48" viewBox="0 0 72 72"><defs><radialGradient id="bS" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#fff7a0"/><stop offset="60%" stopColor="#ffcc00"/><stop offset="100%" stopColor="#e07000"/></radialGradient></defs><g fill="#ffaa00" stroke="#cc6600" strokeWidth="0.5"><polygon points="36,3 38,26 40,3 39,26"/><polygon points="36,69 38,46 40,69 39,46"/><polygon points="3,36 26,38 3,40 26,39"/><polygon points="69,36 46,38 69,40 46,39"/><polygon points="9,9 27,28 11,7 28,27"/><polygon points="63,9 45,28 61,7 44,27"/><polygon points="9,63 27,44 11,65 28,45"/><polygon points="63,63 45,44 61,65 44,45"/></g><circle cx="36" cy="36" r="22" fill="url(#bS)" stroke="#cc7700" strokeWidth="1.5"/><text x="36" y="40" textAnchor="middle" fontFamily="'Chakra Petch',sans-serif" fontSize="13" fontWeight="900" fill="#3d1a00" letterSpacing="1.5" paintOrder="stroke" stroke="#ffe066" strokeWidth="3">BONUS</text></svg>
              </button>
              <button onClick={()=>setActiveScat(4)} title="Super Bonus (4 scatter)" style={{background:'transparent',border:`2px solid ${activeScat===4?G.gold:'transparent'}`,borderRadius:8,padding:2,cursor:'pointer',transition:'all .12s',transform:activeScat===4?'scale(1.1)':'scale(1)'}}>
                <svg width="48" height="48" viewBox="0 0 72 72"><defs><radialGradient id="bG" cx="35%" cy="25%" r="75%"><stop offset="0%" stopColor="#f0c8ff"/><stop offset="50%" stopColor="#aa44ff"/><stop offset="100%" stopColor="#440088"/></radialGradient></defs><g fill="#cc66ff" opacity="0.7"><polygon points="36,4 37.5,15 39,4 38,15"/><polygon points="36,68 37.5,57 39,68 38,57"/><polygon points="4,36 15,37.5 4,39 15,38"/><polygon points="68,36 57,37.5 68,39 57,38"/><polygon points="12,12 24,24 10,10 23,23"/><polygon points="60,12 48,24 62,10 49,23"/><polygon points="12,60 24,48 10,62 23,49"/><polygon points="60,60 48,48 62,62 49,49"/></g><polygon points="36,10 58,26 58,48 36,62 14,48 14,26" fill="url(#bG)" stroke="#cc44ff" strokeWidth="1.5"/><text x="36" y="34" textAnchor="middle" fontFamily="'Chakra Petch',sans-serif" fontSize="9.5" fontWeight="900" fill="#ffffff" letterSpacing="1" paintOrder="stroke" stroke="#660099" strokeWidth="2.5">SUPER</text><text x="36" y="46" textAnchor="middle" fontFamily="'Chakra Petch',sans-serif" fontSize="9.5" fontWeight="900" fill="#ffffff" letterSpacing="1" paintOrder="stroke" stroke="#660099" strokeWidth="2.5">BONUS</text></svg>
              </button>
              <button onClick={()=>setActiveScat(5)} title="Super Super Bonus (5 scatter)" style={{background:'transparent',border:`2px solid ${activeScat===5?G.green:'transparent'}`,borderRadius:8,padding:2,cursor:'pointer',transition:'all .12s',transform:activeScat===5?'scale(1.1)':'scale(1)'}}>
                <svg width="48" height="48" viewBox="0 0 72 72"><defs><radialGradient id="bD1" cx="38%" cy="28%" r="72%"><stop offset="0%" stopColor="#eefffe"/><stop offset="30%" stopColor="#88eeff"/><stop offset="70%" stopColor="#00aaff"/><stop offset="100%" stopColor="#0033cc"/></radialGradient><radialGradient id="bD2" cx="38%" cy="28%" r="72%"><stop offset="0%" stopColor="#ccffff"/><stop offset="100%" stopColor="#004499"/></radialGradient></defs><g fill="#44ddff" opacity="0.65"><polygon points="36,2 37.5,13 39,2 38,13"/><polygon points="36,70 37.5,59 39,70 38,59"/><polygon points="2,36 13,37.5 2,39 13,38"/><polygon points="70,36 59,37.5 70,39 59,38"/><polygon points="8,8 19,19 6,6 18,18"/><polygon points="64,8 53,19 66,6 54,18"/><polygon points="8,64 19,53 6,66 18,54"/><polygon points="64,64 53,53 66,66 54,54"/></g><polygon points="36,8 54,24 36,20 18,24" fill="#ccf5ff" stroke="#00bbff" strokeWidth="1"/><polygon points="18,24 54,24 58,36 14,36" fill="#88ddff" stroke="#00aaee" strokeWidth="0.8"/><polygon points="14,36 36,64 36,36" fill="url(#bD1)" stroke="#0099dd" strokeWidth="1"/><polygon points="58,36 36,64 36,36" fill="url(#bD2)" stroke="#0088cc" strokeWidth="1"/><text x="36" y="30" textAnchor="middle" fontFamily="'Chakra Petch',sans-serif" fontSize="7" fontWeight="900" fill="#ffffff" letterSpacing="0.5" paintOrder="stroke" stroke="#003399" strokeWidth="2.5">SUPER SUPER</text><text x="36" y="40" textAnchor="middle" fontFamily="'Chakra Petch',sans-serif" fontSize="8" fontWeight="900" fill="#ffffff" letterSpacing="0.5" paintOrder="stroke" stroke="#003399" strokeWidth="2.5">BONUS</text></svg>
              </button>
            </div>
            <div style={{fontFamily:G.mono,fontSize:9,color:G.t3,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>BET SIZE</div>
            <input autoFocus type="number" id="bet-inp-modal" placeholder="0.00"
              onKeyDown={e=>{if(e.key==='Enter'){const bet=parseFloat(e.target.value)||0;addBonus(betPrompt.slot,bet,activeScat,betPrompt.caller);setCallStatus(betPrompt.callId,'in');setBetPrompt(null);}if(e.key==='Escape')setBetPrompt(null);}}
              style={{width:'100%',height:46,background:G.sur,border:`1px solid ${G.bdr}`,borderRadius:3,padding:'0 14px',fontFamily:G.mono,fontSize:20,color:G.t1,marginBottom:12,outline:'none',textAlign:'center'}} />
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>{const bet=parseFloat(document.getElementById('bet-inp-modal')?.value)||0;addBonus(betPrompt.slot,bet,activeScat,betPrompt.caller);setCallStatus(betPrompt.callId,'in');setBetPrompt(null);}} style={{flex:1,...btnPrimary}}>Add to Tracker</button>
              <button onClick={()=>setBetPrompt(null)} style={btnGhost}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add call */}
      {callModal&&(
        <div style={modalBg}>
          <div style={{...modal,width:340}}>
            <div style={{fontFamily:G.display,fontSize:'1.4rem',fontWeight:700,color:G.t1,letterSpacing:'0.06em',marginBottom:14}}>ADD SLOT CALL</div>
            {canEdit?(
              <>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
                  <div style={{fontFamily:G.mono,fontSize:9,color:G.t3,textTransform:'uppercase',letterSpacing:'0.1em'}}>WHO'S CALLING?</div>
                  <div style={{fontFamily:G.mono,fontSize:8,color:G.t4,letterSpacing:'0.04em'}}>(optional)</div>
                </div>
                <select value={equity.map(e=>e.name).filter(Boolean).includes(callName)?callName:'__custom__'}
                  onChange={e=>{if(e.target.value!=='__custom__')setCallName(e.target.value);else setCallName('');}}
                  style={{...inp,height:36,marginBottom:6}}>
                  <option value="">Select caller…</option>
                  {equity.map(e=>e.name).filter(Boolean).map(n=><option key={n} value={n}>{n}</option>)}
                  <option value="__custom__">+ Add username…</option>
                </select>
                {!equity.map(e=>e.name).filter(Boolean).includes(callName)&&(
                  <input value={callName} onChange={e=>setCallName(e.target.value)} placeholder="Type caller name…" style={{...inp,height:34,marginBottom:8}} />
                )}
              </>
            ):(
              <div style={{fontFamily:G.body,fontSize:13,color:G.t2,background:G.sur,border:`1px solid ${G.bdr}`,borderRadius:3,padding:'8px 10px',marginBottom:8}}>
                Calling as <strong style={{color:G.t1}}>{callName}</strong>
              </div>
            )}
            <div style={{fontFamily:G.mono,fontSize:9,color:G.t3,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:5}}>SLOT NAME</div>
            <SlotInput value={callSlot} onChange={setCallSlot} placeholder="Search or type slot name…" />
            <div style={{display:'flex',gap:6,marginTop:12}}>
              <button onClick={addCall} style={{flex:1,...btnPrimary}}>Add Call</button>
              <button onClick={()=>{setCallModal(false);setCallName('');setCallSlot('');}} style={btnGhost}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Slot count */}
      {slotCountModal&&(
        <div style={modalBg}>
          <div style={{...modal,width:260,textAlign:'center'}}>
            <div style={{fontFamily:G.display,fontSize:'1.5rem',color:G.t1,letterSpacing:'0.04em',marginBottom:6}}>GENERATE CALLS</div>
            <div style={{fontFamily:G.body,fontSize:13,color:G.t3,marginBottom:14}}>How many slots?</div>
            <input autoFocus type="number" value={slotCountInput} onChange={e=>setSlotCountInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')generateRandom();if(e.key==='Escape')setSlotCountModal(false);}}
              min="1" max="70"
              style={{width:'100%',height:52,background:G.sur,border:`1px solid ${G.bdr}`,borderRadius:3,padding:'0 14px',fontFamily:G.mono,fontSize:24,color:G.t1,marginBottom:12,textAlign:'center',outline:'none'}} />
            <div style={{display:'flex',gap:6}}>
              <button onClick={generateRandom} style={{flex:1,...btnPrimary}}>Generate</button>
              <button onClick={()=>setSlotCountModal(false)} style={btnGhost}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Limit */}
      {limitModal&&(
        <div style={modalBg}>
          <div style={{...modal,width:260,textAlign:'center'}}>
            <div style={{fontFamily:G.display,fontSize:'1.5rem',color:G.t1,letterSpacing:'0.04em',marginBottom:6}}>CALL LIMIT</div>
            <div style={{fontFamily:G.body,fontSize:13,color:G.t3,marginBottom:14}}>Max per person (0 = unlimited)</div>
            <input autoFocus type="number" value={limitInput} onChange={e=>setLimitInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')setLimit();if(e.key==='Escape')setLimitModal(false);}}
              min="0"
              style={{width:'100%',height:52,background:G.sur,border:`1px solid ${G.bdr}`,borderRadius:3,padding:'0 14px',fontFamily:G.mono,fontSize:24,color:G.t1,marginBottom:12,textAlign:'center',outline:'none'}} />
            <div style={{display:'flex',gap:6}}>
              <button onClick={setLimit} style={{flex:1,...btnPrimary}}>Set Limit</button>
              <button onClick={()=>setLimitModal(false)} style={btnGhost}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Invite */}
      {inviteModal&&(
        <div style={modalBg}>
          <div style={{...modal,width:360}}>
            <div style={{fontFamily:G.display,fontSize:'1.5rem',color:G.t1,letterSpacing:'0.04em',marginBottom:4}}>INVITE CO-EDITOR</div>
            <div style={{fontFamily:G.body,fontSize:13,color:G.t3,marginBottom:14,lineHeight:1.6}}>Enter their Discord display name. They'll get full edit access next time they open the hunt.</div>
            {inviteList.length>0&&(
              <div style={{background:G.sur,border:`1px solid ${G.bdr}`,borderRadius:3,padding:'8px 10px',marginBottom:10}}>
                <div style={{fontFamily:G.mono,fontSize:8,color:G.t4,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:6}}>CURRENT EDITORS</div>
                {inviteList.map(u=>(
                  <div key={u} style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontFamily:G.body,fontSize:12,color:G.t2,marginBottom:3}}>
                    <span>{u}</span>
                    <button onClick={()=>removeInvite(u)} style={{background:'none',border:'none',color:G.red,cursor:'pointer',fontSize:11,fontFamily:G.mono}}>Remove</button>
                  </div>
                ))}
              </div>
            )}
            <input autoFocus value={inviteUser} onChange={e=>setInviteUser(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')sendInvite();if(e.key==='Escape')setInviteModal(false);}}
              placeholder="Discord username"
              style={{...inp,height:40,fontSize:14,marginBottom:10}} />
            <div style={{display:'flex',gap:6}}>
              <button onClick={sendInvite} style={{flex:1,...btnPrimary}}>Invite</button>
              <button onClick={()=>setInviteModal(false)} style={btnGhost}>Done</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
