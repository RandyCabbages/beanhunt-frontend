# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Commands
```bash
npm start        # Dev server
npm run build    # Production build
# No lint or test scripts configured
# Vercel auto-deploys on push to main
```

## Project Structure
```
src/
  components/
    HuntTracker.js   ← MAIN FILE — all hunt UI logic (~1350 lines)
  pages/
    MyHunt.js        ← renders HuntTracker for VIP + Community hunts
    WatchHunt.js     ← viewer/spectator page
    Hub.js           ← landing/lobby page
    Overlay.js       ← OBS browser source overlay
    HuntHistory.js   ← analytics: per-slot stats, multipliers, ROI
  App.js
  api.js
  index.js
  styles.css
```

## Key Architecture
- `HuntTracker.js` is one large component used for both VIP and Community hunts; `MyHunt.js` passes `huntMode` prop to differentiate
- Real-time updates via Socket.IO (`api.js` exports `socket`); `WatchHunt` subscribes to individual hunt + reinvite events
- State debounces to backend every 500ms; backend is source of truth for logged-in users; offline hunts stored in browser only
- Slot autocomplete hits `/api/slots/search?q=` (slot.report API cache); `allSlots` loaded on mount from `/api/slots` (5000+ names)
- Undo history: last 30 states tracked in `huntHistory` ref

## Design System
All tokens live in the `G` object at the top of `HuntTracker.js`:
```javascript
const G = {
  bg:'#161618', bg2:'#1c1c1f', sur:'#222226', card:'#26262a', lift:'#2c2c32',
  gold:'#c6f135',   // primary accent, community hunts
  green:'#4ade80',  // gains/positive
  red:'#f87171',    // losses/negative
  purple:'#c084fc', // VIP accent
  t1:'#ffffff', t2:'#e8e8e8', t3:'#b0b0b0', t4:'#808080',
  bdr:'rgba(255,255,255,0.15)',
  // Font: Chakra Petch everywhere (display/body/mono all same)
}
```
Styling is inline throughout — `styles.css` only covers scrollbars, selection, and global resets.

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
- **Bean** = the streamer/owner, gets 👑 crown icon; Discord ID `135203806676779008` (permanent, used for VIP/admin auth — never rely on display name)
- **Hunt creator** gets ⚔️ sword icon
- Priority order: Bean → Mod/Creator → Regular → Roll Winner

## Hunt Modes & Equity
- Hunt modes: `creating` → `rolling` → `spinning`
- VIP hunts auto-include Bean + creator in equity; community hunts start empty
- Call queue uses round-robin fairness rotation by caller (`buildQueue()` helper)

## Known Issues
- `showPasteCalls` state must exist or app crashes on render
- Mobile CSS attempts have broken desktop twice — be very careful with responsive changes

## Pending Items
- [ ] Placeholder text in slot + caller name inputs
- [ ] Held base-games vault — move to end of list, must NOT affect multiplier
- [ ] Community Hunt — punt calculator at bottom of equity section
- [ ] Verify Share button captures full equity section (html2canvas + `data-equity-section`)
- [ ] Responsive/mobile pass on equity layout
