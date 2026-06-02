# BeanHunt Frontend — Claude Code Context

## What This Is
A community/VIP slot bonus hunt tracker for a Twitch streamer (Bean). Built in React, deployed on Vercel. Discord OAuth for auth. Users track slot game bonus hunts with equity splits, live winnings, call queues, and a real-time overlay.

## Live URLs
- Frontend: https://twitchbean-hunt.vercel.app
- Backend: https://beanhunt-backend-production.up.railway.app
- Frontend repo: https://github.com/RandyCabbages/beanhunt-frontend
- Backend repo: https://github.com/RandyCabbages/beanhunt-backend

## Local Paths
- Frontend: `C:\Users\kylew\beanhunt-frontend`
- Backend: `C:\Users\kylew\beanhunt-backend`

## Deploy Workflow
```bash
git pull origin main
git add .
git commit -m "message"
git push origin main
# Vercel auto-deploys on push
```

## Project Structure
```
src/
  components/
    HuntTracker.js   ← MAIN FILE — all hunt UI logic (~1350 lines)
    WatchHunt.js     ← viewer/spectator page
    MyHunt.js        ← renders HuntTracker for VIP + Community hunts
    Hub.js           ← landing/lobby page
    Overlay.js       ← OBS browser source overlay
  App.js
  api.js
  index.js
  styles.css
```

## Key Architecture
- `HuntTracker.js` is one large component used for both VIP and Community hunts
- `MyHunt.js` passes `huntMode` prop to differentiate
- Real-time updates via Socket.IO (`api.js` exports `socket`)
- Slot autocomplete hits backend `/api/slots/search?q=` (searches slot.report API cache)
- `allSlots` state loaded on mount from `/api/slots` (5000+ slot names)

## Design System
All tokens live in the `G` object at the top of `HuntTracker.js`:
```javascript
const G = {
  bg:'#161618', bg2:'#1c1c1f', sur:'#222226', card:'#26262a', lift:'#2c2c32',
  gold:'#c6f135',   // primary accent, Starting Balance
  green:'#4ade80',  // gains/positive
  red:'#f87171',    // losses/negative
  purple:'#c084fc', // secondary accent
  t1:'#ffffff', t2:'#e8e8e8', t3:'#b0b0b0', t4:'#808080',
  bdr:'rgba(255,255,255,0.15)',
  // Font: Chakra Petch everywhere (display/body/mono all same)
}
```

## Layout — 3 Column (DO NOT BREAK THIS)
```
300px fixed    |    1fr flexible    |    330px fixed
Slot Calls     |    Bonus Table     |    Equity Section
```
Never use CSS `data-active` rules that hide columns — this was done once and broke everything. Mobile changes must not interfere with desktop.

## Section Naming (use this vocabulary)
1. **Page Header** — logo, hunt type, action buttons
2. **Slot Calls** — left panel: call queue, + Add Call, call cards
3. **Bonus Board** — stats row: Starting Balance, People in Hunt, Call Limit, Slots Called
4. **Add Slot** — input row: slot name, caller, bet $, bonus symbols, + Add
5. **Bonus Hunt Section** — middle table: SLOT | BET | WIN | MULT
6. **Equity Section** — right panel: Starting Balance → Live Winnings → $ per Person/Bean → equity inputs
7. **Footer** — Start Hunt button

## Equity Section Order (right panel, top to bottom)
1. Starting Balance (large gold total)
2. Live Winnings (scrollable member cards)
3. $ per Person / Bean $ inputs
4. Equity input rows (name + amount + drag reorder)

## Special Users
- **Bean** = the streamer/owner, gets 👑 crown icon
- **Hunt creator** = gets ⚔️ sword icon
- Priority order for icons: Bean → Mod/Creator → Regular → Roll Winner

## Known Issues / History
- RAINBET_SLOTS hardcoded array was removed — uses `/api/slots` API now
- Resizable panel dividers were added then fully reverted (broke layout) — no resizable panel code should exist
- `showPasteCalls` state must exist or app crashes on render
- Mobile CSS attempts have broken desktop twice — be very careful

## Bug Fixed This Session
**Autocomplete dropdown selecting wrong slot name:**
- `addCall()` was reading stale `callSlot` state when triggered from dropdown click
- Fix: `addCall(slotOverride?)` now accepts optional override; `onCommit={(name)=>addCall(name)}`
- Also fixed: API POST body uses `slotVal` not `callSlot`

## Pending Items
- [ ] Placeholder text in slot + caller name inputs
- [ ] Held base-games vault — move to end of list, must NOT affect multiplier
- [ ] Community Hunt — punt calculator at bottom of equity section
- [ ] Verify Share button captures full equity section (html2canvas + `data-equity-section`)
- [ ] Responsive/mobile pass on equity layout

## Owner Info
- Discord ID: `135203806676779008` (permanent, used for VIP/admin auth)
- Discord username: `randycabbage_`
- Display name: `Cabbage` (changeable — auth must never rely on this)
