# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is
A community/VIP slot bonus hunt tracker for a Twitch streamer (Bean). Built in React, deployed on Vercel. Discord OAuth for auth. Users track slot game bonus hunts with equity splits, live winnings, call queues, and a real-time overlay.

## Live URLs
- Frontend: https://communityhunts.gg
- Backend: https://beanhunt-backend-production.up.railway.app
- Frontend repo: https://github.com/RandyCabbages/beanhunt-frontend
- Backend repo: https://github.com/RandyCabbages/beanhunt-backend

## Local Paths
- Frontend: `C:\Users\kylew\beanhunt-frontend`
- Backend: `C:\Users\kylew\beanhunt-backend`

## Commands
```bash
npm start        # Dev server
npm run build    # Production build
# No lint or test scripts configured
# Vercel auto-deploys on push to main
```

## Dependencies
- React 18, react-router-dom v6, socket.io-client v4

## Project Structure
```
src/
  components/
    HuntTracker.js   ← MAIN FILE — all hunt UI logic (~2273 lines)
    RandomHashtag.js ← rotating tagline displayed on Hub
    slotThumb.js     ← slot image handler (thumbnail lookup)
  pages/
    MyHunt.js        ← renders HuntTracker for VIP + Community hunts (online/offline)
    WatchHunt.js     ← viewer/spectator page; supports ?archivedAt=<ISO8601> for snapshots
    Hub.js           ← landing/lobby page; hunt cards grid, Twitch embed, leaderboard
    Overlay.js       ← OBS browser source overlay (transparent bg, auto-updates via socket)
    HuntHistory.js   ← analytics: per-slot stats, multipliers, ROI; admin Mitch/Cdew imports
    Settings.js      ← user settings page
  App.js             ← router, auth param parsing, Socket.IO init
  api.js             ← API client, Socket.IO config, token-based auth fallback
  index.js
  styles.css         ← only scrollbars, selection, global resets; all other styling is inline
```

## Key Architecture
- `HuntTracker.js` is one large component used for both VIP and Community hunts; `MyHunt.js` passes `huntMode` prop to differentiate
- Real-time updates via Socket.IO (`api.js` exports `socket`); `WatchHunt` subscribes to individual hunt + reinvite events
- State debounces to backend every 500ms (`upd()` helper); backend is source of truth for logged-in users; offline hunts stored in browser only
- Slot autocomplete hits `/api/slots/search?q=`; `allSlots` loaded on mount from `/api/slots` (5000+ names); cached in module-level `_slotCache` closure
- Undo history: last 30 states tracked in `huntHistory` ref
- `MyHunt.js` supports offline mode (no persistence, "📴 Offline mode" footer bar) with a "Login to go live" prompt

## Auth Flow
- Discord OAuth redirect flow managed by backend at `${API}/auth/discord`
- On return: URL params `?auth=<base64(userData)>&t=<token>&returnTo=/...` parsed in `App.js`
- Token stored in `localStorage` key `beanhunt_auth_token` as fallback for cookie-blocking browsers
- On load without params: `GET /auth/me` checks existing session

## Socket.IO Events
**Emit (client → server):** `watch:hunt`, `identify` (sends user.id), `leave:hunt`

**Listen (server → client):** `hunt:update` (full state refresh), `hunt:reinvite` (refetch perms), `bean:live` (Bean went live on Twitch), `calls:request:new`, `calls:request:update`, `calls:granted`, `calls:denied`

Always `.off()` handlers in `useEffect` cleanup to prevent duplicate listeners.

## Design System
All tokens live in the `G` object at the top of `HuntTracker.js`:
```javascript
const G = {
  bg:'#161618', bg2:'#1c1c1f', sur:'#222226', card:'#26262a', lift:'#2c2c32',
  ridge:'#36363e',
  gold:'#c6f135',   // primary accent, community hunts
  gold2:'#a970ff',  // roll winner accent
  green:'#4ade80',  // gains/positive
  red:'#f87171',    // losses/negative
  purple:'#c084fc', // VIP accent
  t1:'#ffffff', t2:'#e8e8e8', t3:'#b0b0b0', t4:'#808080',
  bdr:'rgba(255,255,255,0.22)',
  bb:'rgba(255,255,255,0.34)',  // bright border
  // gdim/gndim/rdim/pdim — dim color overlays at 0.12–0.14 opacity
  // Font: Chakra Petch (display), Inter (body/mono)
}
```
`Hub.js` has its own parallel `C` object with the same color values under different key names — keep them in sync if changing accent colors.

## Layout — 3 Column (DO NOT BREAK THIS)
```
300px fixed    |    1fr flexible    |    330px fixed
Slot Calls     |    Bonus Table     |    Equity Section
```
Never use CSS `data-active` rules that hide columns — this was done once and broke everything. Mobile changes must not interfere with desktop. Resizable panel dividers were added then fully reverted (broke layout) — no resizable panel code should exist.

## Section Naming (use this vocabulary)
1. **Page Header** — logo, hunt type, action buttons
2. **Slot Calls** — left panel: call queue, + Add Call, call cards
3. **Bonus Board** — stats row: Starting Balance, People in Hunt, Call Limit, Slots Called
4. **Add Slot** — input row: slot name, caller, bet $, bonus symbols, + Add
5. **Bonus Hunt Section** — middle table: SLOT | BET | WIN | MULT
6. **Equity Section** — right panel (order: Starting Balance → Live Winnings → $ per Person/Bean → equity input rows)
7. **Footer** — Start Hunt button

## Special Users
- **Bean** = the streamer/owner, gets 👑 crown icon; identified in code by `id === 'bean_auto'` or case-insensitive name match `'bean'`. Discord ID `135203806676779008` is used for backend VIP/admin auth — never rely on display name for backend checks.
- **Hunt creator** gets ⚔️ sword icon; identified by `id === 'creator_auto'`
- VIP hunts auto-inject Bean (`id:'bean_auto'`) + Creator (`id:'creator_auto'`) into equity on init; `injectedMembersRef` prevents duplicate merges on subsequent socket updates
- Priority order: Bean → Mod/Creator → Regular → Roll Winner

## Hunt Modes & Equity
- Hunt modes: `creating` → `spinning` → `rolling` (one-way, no restart mid-hunt)
- `spinning`: top 4 calls locked, can't reorder or jump to front of queue
- VIP hunts auto-include Bean + creator in equity; community hunts start empty
- Call queue uses round-robin fairness rotation by caller (`buildQueue()` helper)

## Slot Name Normalization
Applied identically in HuntTracker, HuntHistory, and Overlay — must stay in sync:
- Lowercase, replace `&` with ` and `, remove punctuation, normalize spaces, strip trailing `s` from last word (plural dedup)

## Known Issues
- Mobile CSS attempts have broken desktop twice — be very careful with responsive changes

## Pending Items
- [ ] Placeholder text in slot + caller name inputs
- [ ] Held base-games vault — move to end of list, must NOT affect multiplier
- [ ] Community Hunt — punt calculator at bottom of equity section
- [ ] Verify Share button captures full equity section (html2canvas + `data-equity-section`)
- [ ] Responsive/mobile pass on equity layout
