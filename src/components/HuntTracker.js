import { useState, useCallback, useEffect, useRef } from 'react';
import { apiFetch, socket } from '../api';

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

const fmt  = v => '$'+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtS = v => (v<0?'-':'+')+fmt(v);
const uid  = () => Math.random().toString(36).slice(2,8);

/* ── Slot list ───────────────────────────────────────────────────── */
const RAINBET_SLOTS = [
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
].sort();

function shuffle(a){const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}

function buildQueue(calls){
  const bu={},order=[];
  calls.forEach(c=>{if(!bu[c.user]){bu[c.user]=[];order.push(c.user);}bu[c.user].push(c);});
  const q=[];let r=0,any=true;
  while(any){any=false;order.forEach(u=>{if(bu[u][r]){q.push(bu[u][r]);any=true;}});r++;}
  return q;
}

/* ── Slot autocomplete input ─────────────────────────────────────── */
function SlotInput({ value, onChange, onCommit, placeholder, style }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const handleChange = v => {
    onChange(v);
    if (v.length >= 2) {
      const lv = v.toLowerCase();
      setSuggestions(RAINBET_SLOTS.filter(s => s.toLowerCase().startsWith(lv) || s.toLowerCase().includes(lv)).slice(0,7));
      setOpen(true);
    } else { setSuggestions([]); setOpen(false); }
  };

  const pick = s => { onChange(s); setSuggestions([]); setOpen(false); if (onCommit) onCommit(s); };

  return (
    <div ref={wrapRef} style={{ position:'relative', ...style }}>
      <input value={value} onChange={e => handleChange(e.target.value)}
        onFocus={() => value.length >= 2 && setSuggestions(RAINBET_SLOTS.filter(s=>s.toLowerCase().includes(value.toLowerCase())).slice(0,7))}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => {
          if (e.key === 'Enter' && suggestions.length > 0) { pick(suggestions[0]); }
          else if (e.key === 'Enter' && onCommit) { onCommit(value); }
          if (e.key === 'Escape') { setSuggestions([]); setOpen(false); }
        }}
        placeholder={placeholder || 'Slot name…'}
        style={{ width:'100%', height:34, background:G.sur, border:`1px solid ${G.bdr}`,
          borderRadius:3, padding:'0 10px', fontFamily:G.body, fontSize:13, color:G.t1, outline:'none' }}
      />
      {open && suggestions.length > 0 && (
        <div style={{ position:'absolute', top:'calc(100% + 2px)', left:0, right:0, background:G.card,
          border:`1px solid ${G.bb}`, borderRadius:3, zIndex:60, maxHeight:200, overflowY:'auto' }}>
          {suggestions.map((s,i) => (
            <div key={i} onMouseDown={() => pick(s)}
              style={{ padding:'8px 12px', fontFamily:G.body, fontSize:13, color:G.t2,
                cursor:'pointer', borderBottom:`1px solid ${G.bdr}`, letterSpacing:'0.01em',
                transition:'background .08s' }}
              onMouseEnter={e => e.currentTarget.style.background = G.lift}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {s}
            </div>
          ))}
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
export default function HuntTracker({ hunt, user, readOnly, offline, canAddCalls, onUpdateHunt, onEndHunt, onResetHunt, onBack }) {
  const isVip   = hunt.huntType === 'vip';
  const accent  = isVip ? G.purple : G.gold;
  const acDim   = isVip ? G.pdim   : G.gdim;
  const acStr   = isVip ? 'rgba(187,134,252,.6)' : 'rgba(255,179,0,.6)';

  const [huntMode,      setHuntMode]      = useState(hunt.huntMode||'creating');
  const [showWinners,   setShowWinners]   = useState(false);
  const [slotInput,     setSlotInput]     = useState('');
  const [betInput,      setBetInput]      = useState('');
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
  const [slotCountInput,setSlotCountInput]= useState('35');
  const [limitModal,    setLimitModal]    = useState(false);
  const [limitInput,    setLimitInput]    = useState(String(hunt.callLimit||0));
  const [dragCallId,    setDragCallId]    = useState(null);
  const [dragEquityId,  setDragEquityId]  = useState(null);
  const [huntHistory,   setHuntHistory]   = useState([]);
  const [beanLive,      setBeanLive]      = useState({isLive:false,title:''});
  const [dcImporting,   setDcImporting]   = useState(false);
  const [dcWinners,     setDcWinners]     = useState(false);
  const saveTimeout = useRef(null);
  const huntRef     = useRef(hunt);
  useEffect(() => { huntRef.current = hunt; }, [hunt]);

  useEffect(() => {
    const tick = () => {
      if (!hunt.startedAt) return setHuntTimer('');
      const m = Math.floor((Date.now()-new Date(hunt.startedAt))/60000);
      setHuntTimer(m<1?'<1m':m<60?`${m}m`:`${Math.floor(m/60)}h${m%60}m`);
    };
    tick(); const t = setInterval(tick,30000); return () => clearInterval(t);
  }, [hunt.startedAt]);

  useEffect(() => {
    apiFetch('/api/bean-live').then(setBeanLive).catch(()=>{});
    socket.on('bean:live', setBeanLive);
    return () => socket.off('bean:live', setBeanLive);
  }, []);

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

  const importDiscordCalls = useCallback(async () => {
    setDcImporting(true);
    try {
      const data = await apiFetch('/api/discord/import-calls');
      if (!data.imported?.length) { alert('No new slot calls found in the last 20 minutes.'); return; }
      upd(h => ({ ...h, calls: [...(h.calls||[]), ...data.imported] }));
      alert(`✅ Imported ${data.count} slot call${data.count!==1?'s':''} from Discord.`);
    } catch(e) { alert(`Discord import failed: ${e.message}`); }
    finally { setDcImporting(false); }
  }, [upd]);

  const parseDiscordWinners = useCallback(async (defAmt) => {
    setDcWinners(true);
    try {
      const data = await apiFetch('/api/discord/parse-winners');
      if (!data.winners?.length) { alert(data.raw || 'No winner results found.'); return; }
      const existing = new Set((hunt.equity||[]).map(e=>(e.name||'').toLowerCase().trim()));
      const newWinners = data.winners
        .filter(w => !existing.has(w.name.toLowerCase().trim()))
        .map(w => ({ id: `w_${w.place}_${Date.now()}`, name: w.name, amount: defAmt||100, isRollWinner: true, roll: w.roll, luck: w.luck }));
      if (!newWinners.length) { alert('All winners are already in equity.'); return; }
      upd(h => ({ ...h, equity: [...(h.equity||[]), ...newWinners] }));
      alert(`✅ Added ${newWinners.length} winner${newWinners.length!==1?'s':''} to equity.`);
    } catch(e) { alert(`Parse failed: ${e.message}`); }
    finally { setDcWinners(false); }
  }, [upd, hunt.equity]);

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
    upd(h=>({...h,bonuses:[...h.bonuses,{id:uid(),slot:slot||slotInput||'Unknown',bet:parseFloat(bet||betInput)||0,win:0,mult:0,scat,caller}]}));
    setSlotInput(''); setBetInput('');
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
    if (!canEdit && canAddCalls && user) setCallName(user.displayName||user.username||'');
    else setCallName(names.length===1?names[0]:'');
    setCallSlot(''); setCallModal(true);
  };

  const addCall = async () => {
    if (!callName||!callSlot.trim()) return;
    const slots = callSlot.split(',');
    const newCalls = [];
    for (const raw of slots) {
      const s=raw.trim(); if(!s) continue;
      if(calls.some(c=>c.slot.toLowerCase()===s.toLowerCase())){alert(`"${s}" is already in the queue`);continue;}
      newCalls.push({id:uid(),slot:s,user:callName,status:'pending'});
    }
    if (newCalls.length) {
      if (canAddCalls && !onUpdateHunt) {
        try { await apiFetch(`/api/hunts/${hunt.user?.id}/calls`,{method:'POST',body:JSON.stringify({slot:callSlot.trim()})}); }
        catch(e){alert(e.message);return;}
      } else if (huntMode==='creating') {
        upd(h=>({...h,calls:[...h.calls,...newCalls]}));
      } else {
        upd(h=>{
          const pending=h.calls.filter(c=>c.status==='pending');
          const others=h.calls.filter(c=>c.status!=='pending');
          const insertAt=Math.min(3,pending.length);
          const newP=[...pending.slice(0,insertAt),...newCalls,...pending.slice(insertAt)];
          return{...h,calls:[...newP,...others]};
        });
      }
    }
    setCallModal(false); setCallName(''); setCallSlot('');
  };

  const generateRandom = () => {
    const names=equity.map(e=>e.name).filter(Boolean).filter(n=>n!=='Bean');
    if(!names.length){alert('Add equity members first');return;}
    const count=parseInt(slotCountInput)||35;
    const existing=new Set(calls.map(c=>c.slot.toLowerCase()));
    const slots=shuffle(RAINBET_SLOTS).filter(s=>!existing.has(s.toLowerCase())).slice(0,count);
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
    if(!inviteUser.trim()) return;
    try { const res=await apiFetch('/api/my-hunt/invite',{method:'POST',body:JSON.stringify({username:inviteUser.trim()})});setInviteList(res.invitedEditors||[]);setInviteUser(''); }
    catch(e){alert('Failed — check the username');}
  };
  const removeInvite = async u => {
    try { const res=await apiFetch('/api/my-hunt/invite',{method:'DELETE',body:JSON.stringify({username:u})});setInviteList(res.invitedEditors||[]); }
    catch(e){}
  };
  const copyResults = () => {
    const sorted=equity.slice().sort((a,b)=>b.amount-a.amount);
    const lines=['🏆 Hunt Results',`Pot: ${fmt(totalWon)}`,''];
    sorted.forEach((e,i)=>{const share=totalPot>0?(e.amount/totalPot)*totalWon:0,pl=share-e.amount;const medal=['🥇','🥈','🥉'][i]||'  ';lines.push(`${medal} ${e.name}: ${fmt(share)} (${pl>=0?'+':''}${fmt(pl)})`);});
    navigator.clipboard.writeText(lines.join('\n'));
    setCopyResult(true); setTimeout(()=>setCopyResult(false),2000);
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
        @keyframes live-ring{0%{box-shadow:0 0 0 0 rgba(145,70,255,.6)}70%{box-shadow:0 0 0 6px rgba(145,70,255,0)}100%{box-shadow:0 0 0 0 rgba(145,70,255,0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
        .call-card:hover{background:${G.lift}!important}
        .row-hover:hover{background:rgba(255,255,255,.02)!important}
        .icon-btn:hover{color:${G.t1}!important}
        .icon-btn-danger:hover{color:${G.red}!important}
        .tag-btn:hover{opacity:1!important}
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
              <div style={{fontFamily:G.mono,fontSize:10,fontWeight:700,color:G.t4,letterSpacing:'0.12em',textTransform:'uppercase',lineHeight:1}}>BeanTards</div>
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
            <button onClick={()=>{navigator.clipboard.writeText(`${window.location.origin}/`);setShareCopied(true);setTimeout(()=>setShareCopied(false),2000);}} style={{height:30,padding:'0 12px',background:shareCopied?'rgba(198,241,53,0.15)':G.card,border:`1px solid ${shareCopied?G.gold:G.bdr}`,borderRadius:5,fontFamily:G.mono,fontSize:11,fontWeight:600,color:shareCopied?G.gold:G.t2,cursor:'pointer'}}>{shareCopied?'✓ Copied':'⇗ Share'}</button>
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
      <div style={{display:'grid',gridTemplateColumns:'300px 1fr 460px',height:'calc(100vh - 46px)',overflow:'hidden'}}>

        {/* ── LEFT: Slot calls ── */}
        <div style={{borderRight:`1px solid ${G.bdr}`,display:'flex',flexDirection:'column',overflow:'hidden'}}>
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
              <span style={{fontFamily:G.display,fontSize:18,fontWeight:700,letterSpacing:'0.04em',color:G.t1}}>SLOT CALLS</span>
              {pending.length>8&&huntMode!=='creating'&&(
                <span style={{fontFamily:G.mono,fontSize:9,color:accent,background:acDim,border:`1px solid ${accent}44`,borderRadius:2,padding:'1px 6px',letterSpacing:'0.06em'}}>+{pending.length-8}</span>
              )}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              {canEdit && <>
                <button onClick={importDiscordCalls} disabled={dcImporting} title="Import slot calls from Discord (last 20 mins)" style={{height:24,padding:'0 9px',background:'rgba(88,101,242,0.1)',border:'1px solid rgba(88,101,242,0.35)',borderRadius:3,fontFamily:G.mono,fontSize:10,fontWeight:700,color:'#a5b4fc',cursor:'pointer',opacity:dcImporting?0.5:1}}>
                  {dcImporting?'…':'⬇ Discord'}
                </button>
                <button className="icon-btn" onClick={()=>setSlotCountModal(true)} title="Generate random" style={{background:'none',border:'none',cursor:'pointer',color:G.t3,fontSize:15,padding:'2px',lineHeight:1}}>🎲</button>
                <button className="icon-btn" onClick={randomizeCalls} title="Shuffle" style={{background:'none',border:'none',cursor:'pointer',color:G.t3,padding:'2px'}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16l-4 4-1.4-1.4 2.6-2.6H3v-2h14.8l-2.6-2.6L16.6 10l4 4-4 4zm0-8l-4-4-1.4 1.4 2.6 2.6H3v2h14.8l-2.6 2.6L16.6 14l4-4z"/></svg>
                </button>
                <button className="icon-btn-danger" onClick={()=>{if(window.confirm('Clear all slot calls?'))upd(h=>({...h,calls:[]}));}} title="Clear all" style={{background:'none',border:'none',cursor:'pointer',color:G.t3,padding:'2px'}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
                <button onClick={()=>{setLimitInput(String(callLimit));setLimitModal(true);}} title={callLimit?`Call limit: ${callLimit} per person`:'Set call limit per person'}
                  style={{height:28,width:28,background:callLimit?acDim:'transparent',border:`1px solid ${callLimit?accent:G.bdr}`,borderRadius:4,cursor:'pointer',color:callLimit?accent:G.t3,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,position:'relative'}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {callLimit>0&&<span style={{position:'absolute',top:-5,right:-5,background:accent,color:'#000',borderRadius:'50%',width:14,height:14,fontSize:8,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:G.mono}}>{callLimit}</span>}
                </button>
              </>}
              <span style={{fontFamily:G.mono,fontSize:10,color:G.t3}}>{pending.length}</span>
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
                  <div style={{fontFamily:G.body,fontWeight:700,fontSize:15,color:G.t1,paddingRight:14}}>{c.slot}</div>
                  <div style={{fontFamily:G.mono,fontSize:12,fontWeight:600,color:G.t3,marginTop:3,letterSpacing:'0.02em'}}>{c.user}</div>
                  {canCall&&(
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
            <div style={{padding:'8px 10px',borderBottom:`1px solid ${G.bdr}`,display:'grid',gridTemplateColumns:'1fr 90px auto',gap:6,flexShrink:0,background:G.bg2}}>
              <SlotInput value={slotInput} onChange={setSlotInput} placeholder="e.g. Gates of Olympus" />
              <input type="number" value={betInput} onChange={e=>setBetInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&addBonus()}
                placeholder="Bet $" style={{...inp, height:34}} />
              <button onClick={()=>addBonus()} style={{height:34,padding:'0 14px',background:accent,color:'#000',border:'none',borderRadius:3,fontFamily:G.body,fontSize:13,fontWeight:700,cursor:'pointer'}}>+ Add</button>
            </div>
          )}

          {/* Table header */}
          <div style={{display:'grid',gridTemplateColumns:'28px 1fr 70px 90px 70px 28px',background:G.sur,borderBottom:`2px solid ${accent}`,flexShrink:0}}>
            {['','SLOT','BET','WIN','MULT',''].map((h,i)=>(
              <div key={i} style={{padding:'7px 8px',fontFamily:G.mono,fontSize:11,color:G.t3,letterSpacing:'0.1em',fontWeight:700,
                cursor:h==='BET'&&canEdit?'pointer':'default',
                borderBottom:h==='BET'&&canEdit?`1px dashed ${G.t3}`:'none',display:'inline-block'}}
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
                  style={{display:'grid',gridTemplateColumns:'28px 1fr 70px 90px 70px 28px',
                    borderBottom:`1px solid ${G.bdr}`,
                    background:isP?`${acDim}`:undefined,
                    opacity:b.win>0?1:.5,
                    transition:'background .08s'}}>
                  <div style={{padding:'8px',fontFamily:G.mono,fontSize:14,color:isP?accent:G.t4,cursor:'pointer',userSelect:'none',alignSelf:'center',textAlign:'center'}}
                    onClick={()=>!readOnly&&setCurrentSlot(prev=>prev===b.id?null:b.id)}>
                    {isP?'▶':'·'}
                  </div>
                  <div style={{padding:'7px 6px',alignSelf:'center'}}>
                    {canEdit
                      ? <SlotInput value={b.slot} onChange={v=>updateBonus(b.id,'slot',v)} style={{}} />
                      : <span style={{fontFamily:G.body,fontSize:14,fontWeight:700,color:G.t1}}>{b.slot}</span>
                    }
                    {b.scat>3&&<span style={{fontFamily:G.mono,fontSize:8,padding:'1px 4px',borderRadius:2,marginLeft:5,background:b.scat===5?G.gndim:G.gdim,color:b.scat===5?G.green:G.gold,letterSpacing:'0.05em'}}>{b.scat}S</span>}
                    {b.caller&&<div style={{fontFamily:G.mono,fontSize:9,color:G.t3,marginTop:2,letterSpacing:'0.03em'}}>({b.caller})</div>}
                  </div>
                  <div style={{padding:'8px 6px',fontFamily:G.mono,fontSize:13,fontWeight:600,color:G.t2,alignSelf:'center'}}>
                    {canEdit?<input type="number" defaultValue={b.bet||''} onInput={e=>updateBonus(b.id,'bet',e.target.value)} style={{width:'100%',background:'transparent',border:'none',color:G.t2,fontFamily:G.mono,fontSize:12,padding:0,outline:'none'}}/>:fmt(b.bet)}
                  </div>
                  <div style={{padding:'8px 6px',fontFamily:G.mono,fontSize:13,fontWeight:600,color:G.t2,alignSelf:'center'}}>
                    {canEdit?<input type="number" defaultValue={b.win>0?b.win:''} placeholder="—" onInput={e=>updateBonus(b.id,'win',e.target.value)} style={{width:'100%',background:'transparent',border:'none',color:G.t2,fontFamily:G.mono,fontSize:12,padding:0,outline:'none'}}/>:(b.win>0?fmt(b.win):'—')}
                  </div>
                  <div style={{padding:'8px 6px',fontFamily:G.display,fontSize:'1.2rem',fontWeight:700,color:mc,alignSelf:'center',letterSpacing:'0.02em'}}>
                    {mult?mult.toFixed(1)+'x':'—'}
                  </div>
                  <div style={{padding:'8px',alignSelf:'center',textAlign:'center'}}>
                    {canEdit&&<button className="icon-btn-danger" onClick={()=>removeBonus(b.id)} style={{background:'none',border:'none',cursor:'pointer',color:G.t4,fontSize:15,lineHeight:1}}>×</button>}
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
            {canEdit&&<div style={{display:'flex',gap:5,flexWrap:'wrap',justifyContent:'flex-end'}}>
              {isVip && <button onClick={()=>parseDiscordWinners(defAmt)} disabled={dcWinners} title="Scan Discord for the latest winners list and auto-import them" style={{height:30,padding:'0 11px',background:'rgba(88,101,242,0.15)',border:'1px solid rgba(88,101,242,0.45)',borderRadius:5,fontFamily:G.mono,fontSize:11,fontWeight:700,color:'#a5b4fc',cursor:'pointer',opacity:dcWinners?0.5:1,display:'flex',alignItems:'center',gap:5}}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>
                {dcWinners?'Importing…':'Discord Winners'}
              </button>}
              <button onClick={addRollWinner} title={`Add a roll winner — gets $${defAmt} equity (the standard per-person amount)`} style={{height:30,padding:'0 11px',background:'rgba(198,241,53,0.12)',border:`1px solid rgba(198,241,53,0.4)`,borderRadius:5,fontFamily:G.mono,fontSize:11,fontWeight:700,color:G.gold,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
                🎲 Roll Winner <span style={{fontFamily:G.mono,fontSize:10,color:'rgba(198,241,53,0.6)',fontWeight:400}}>${defAmt}</span>
              </button>
              <button onClick={addPerson} title="Add someone with a custom equity amount — not part of the standard per-person pool" style={{height:30,padding:'0 11px',background:G.card,border:`1px solid ${G.bb}`,borderRadius:5,fontFamily:G.mono,fontSize:11,fontWeight:600,color:G.t2,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
                + Extra Equity
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
                  return (
                    <div key={e.id} style={{background:G.card,border:`1px solid ${e.isRollWinner?'rgba(198,241,53,0.3)':G.bdr}`,borderRadius:6,padding:'8px 10px'}}>
                      <div style={{fontFamily:G.body,fontWeight:700,fontSize:14,color:'#ffffff',display:'flex',alignItems:'center',gap:5,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',marginBottom:2}}>
                        {e.isRollWinner&&<span style={{fontSize:11,flexShrink:0}}>🎲</span>}
                        <span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{e.name||'—'}</span>
                      </div>
                      <div style={{fontFamily:G.mono,fontSize:11,color:G.t3,marginBottom:4}}>{pct.toFixed(1)}% · {fmt(e.amount)}</div>
                      <div style={{fontFamily:G.display,fontSize:'1.3rem',fontWeight:700,color:hw?(share>=e.amount?G.green:G.red):G.t3,letterSpacing:'0.02em'}}>{hw?fmt(share):'—'}</div>
                      {hw&&<div style={{fontFamily:G.mono,fontSize:11,fontWeight:600,color:pl>=0?G.green:G.red,marginTop:1}}>{fmtS(pl)}</div>}
                      {canEdit&&<button onClick={()=>{
                        const others=equity.filter(x=>x.id!==e.id&&x.name);
                        if(!others.length){alert('No other members to split to.');return;}
                        if(!window.confirm(`Divvy up ${e.name}'s ${fmt(e.amount)} equally among ${others.length} others?`))return;
                        const pp=parseFloat((e.amount/others.length).toFixed(2));
                        upd(h=>({...h,equity:h.equity.filter(x=>x.id!==e.id).map(x=>others.find(o=>o.id===x.id)?{...x,amount:parseFloat((x.amount+pp).toFixed(2))}:x)}));
                      }} style={{marginTop:6,width:'100%',height:24,background:'rgba(198,241,53,0.1)',border:'1px solid rgba(198,241,53,0.3)',borderRadius:4,fontFamily:G.mono,fontSize:11,fontWeight:700,color:G.gold,cursor:'pointer'}}
                      onMouseEnter={ev=>ev.currentTarget.style.background='rgba(198,241,53,0.22)'}
                      onMouseLeave={ev=>ev.currentTarget.style.background='rgba(198,241,53,0.1)'}>÷ Divvy Up</button>}
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
                  style={{display:'grid',gridTemplateColumns:'14px 1fr 65px auto',gap:4,alignItems:'center',marginBottom:5,cursor:'grab'}}>
                  <span style={{fontFamily:G.mono,color:G.t4,fontSize:11,textAlign:'center',userSelect:'none'}}>⋮</span>
                  <div style={{position:'relative'}}>
                    <input placeholder={e.isRollWinner?'Roll winner name':'Discord username'} defaultValue={e.name} onChange={ev=>updatePerson(e.id,'name',ev.target.value)} style={{...inp,height:34,fontSize:13,fontWeight:500,paddingLeft:e.isRollWinner?28:10}} />
                    {e.isRollWinner&&<span style={{position:'absolute',left:7,top:'50%',transform:'translateY(-50%)',fontSize:11,pointerEvents:'none'}}>🎲</span>}
                  </div>
                  <input type="number" defaultValue={e.amount>0?e.amount:''} onChange={ev=>updatePerson(e.id,'amount',ev.target.value)} style={{...inp,height:34,fontSize:13,fontWeight:600}} />
                  <div style={{display:'flex',gap:2}}>
                    <button onClick={()=>{
                      const others=equity.filter(x=>x.id!==e.id&&x.name);
                      if(!others.length){alert('No other members to split to.');return;}
                      if(!window.confirm(`Divvy up ${e.name||'this person'}'s ${fmt(e.amount)} equally among ${others.length} others?`))return;
                      const pp=parseFloat((e.amount/others.length).toFixed(2));
                      upd(h=>({...h,equity:h.equity.filter(x=>x.id!==e.id).map(x=>others.find(o=>o.id===x.id)?{...x,amount:parseFloat((x.amount+pp).toFixed(2))}:x)}));
                    }} title="Divvy up this person's equity among everyone else"
                    style={{height:34,padding:'0 10px',background:'rgba(198,241,53,0.1)',border:`1px solid rgba(198,241,53,0.35)`,borderRadius:4,cursor:'pointer',color:G.gold,fontSize:14,fontFamily:G.mono,fontWeight:700}}
                    onMouseEnter={ev=>{ev.currentTarget.style.background='rgba(198,241,53,0.18)';ev.currentTarget.style.borderColor='rgba(198,241,53,0.5)';}}
                    onMouseLeave={ev=>{ev.currentTarget.style.background='rgba(198,241,53,0.08)';ev.currentTarget.style.borderColor='rgba(198,241,53,0.25)';}}>÷</button>
                    <button onClick={()=>removePerson(e.id)} className="icon-btn-danger" style={{background:'none',border:'none',cursor:'pointer',color:G.t3,fontSize:15,padding:'0 2px'}}>×</button>
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
                    <div style={{fontFamily:G.body,fontWeight:700,fontSize:13,color:G.t1}}>{e.name}</div>
                    <div style={{fontFamily:G.mono,fontSize:9,color:G.t3}}>{pct.toFixed(1)}% · {fmt(e.amount)}</div>
                  </div>
                );})}
              </div>
            </div>
          )}

          {/* Discord import */}
          {isVip&&canEdit&&(
            <div style={{padding:'8px 12px',borderTop:`1px solid ${G.bdr}`,background:G.sur,flexShrink:0}}>
              <div style={{fontFamily:G.mono,fontSize:8,color:G.purple,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:6,display:'flex',alignItems:'center',gap:5}}>
                <span style={{width:5,height:5,borderRadius:'50%',background:G.purple,display:'inline-block'}}/>DISCORD IMPORT
              </div>
              <textarea value={discordText} onChange={e=>setDiscordText(e.target.value)} rows={2}
                placeholder="Paste VIP Discord message…"
                style={{width:'100%',background:G.bg,border:`1px solid ${G.bdr}`,borderRadius:3,padding:'7px 10px',fontFamily:G.mono,fontSize:11,color:G.t1,resize:'none',lineHeight:1.5}} />
              <div style={{display:'flex',gap:5,marginTop:5}}>
                <button onClick={()=>{
                  const lines=discordText.split('\n'),winners=[],hosts=[];
                  lines.forEach(line=>{line=line.trim();if(!line)return;if(line[0]==='#'){const p=line.split(/\s+/);if(p.length>=2&&p[1].toLowerCase()!=='name')winners.push(p[1]);}else if(line.toLowerCase().startsWith('host:')){const p=line.split(/\s+/);if(p.length>=2)hosts.push(p[1]);}});
                  if(!winners.length&&!hosts.length){setParseHint('No names found.');return;}
                  const newEq=[{id:uid(),name:'Bean',amount:beanAmt},...(hosts[0]?[{id:uid(),name:hosts[0]+' (mod)',amount:defAmt}]:[]),...winners.map(n=>({id:uid(),name:n,amount:defAmt}))];
                  upd(h=>({...h,equity:newEq}));setParseHint(`✓ Imported ${newEq.length} people`);
                }} style={{height:26,padding:'0 10px',background:G.purple,color:'#000',border:'none',borderRadius:2,fontFamily:G.body,fontSize:11,fontWeight:700,cursor:'pointer'}}>Parse</button>
                <button onClick={()=>{setDiscordText('');setParseHint('');}} style={{height:26,padding:'0 8px',background:'transparent',border:`1px solid ${G.bdr}`,borderRadius:2,fontFamily:G.body,fontSize:11,color:G.t3,cursor:'pointer'}}>Clear</button>
                {parseHint&&<span style={{fontFamily:G.mono,fontSize:10,color:parseHint.startsWith('✓')?G.green:G.red,alignSelf:'center'}}>{parseHint}</span>}
              </div>
            </div>
          )}
        </div>
      </div>

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
            <div style={{display:'flex',gap:4,marginBottom:12}}>
              {[3,4,5].map(n=>(
                <button key={n} onClick={()=>setActiveScat(n)} style={{flex:1,height:30,border:`1px solid ${activeScat===n?accent:`${G.bdr}`}`,borderRadius:2,background:activeScat===n?acDim:'transparent',fontFamily:G.mono,fontSize:11,color:activeScat===n?accent:G.t3,cursor:'pointer',letterSpacing:'0.06em'}}>
                  {n} SCAT
                </button>
              ))}
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
                <div style={{fontFamily:G.mono,fontSize:9,color:G.t3,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:5}}>WHO'S CALLING?</div>
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
            <SlotInput value={callSlot} onChange={setCallSlot} onCommit={()=>addCall()} placeholder="Search or type slot name…" />
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
            <div style={{fontFamily:G.body,fontSize:13,color:G.t3,marginBottom:14,lineHeight:1.6}}>They must be logged in with Discord. Enter their username.</div>
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
