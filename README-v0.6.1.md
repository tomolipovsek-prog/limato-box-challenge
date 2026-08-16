# LiMATO Box Challenge v0.6.1 — Arena Beta

**Turn & Timer Update**

LiMATO Box Challenge is a browser-based number, logic and strategy game with Solo,
Invite Room and automatic Arena multiplayer.

## New in v0.6.1

- Arena play order now follows **queue order**:
  - first player who joins = seat #1 = starts,
  - then seat #2, #3, etc.
- Timer now covers the **entire player's round**, not a single dice throw.
- New Arena base times:
  - Classic 1–9: **40 s**
  - Extended 1–12: **45 s**
  - Pro 1–15: **50 s**
  - Master 1–18: **60 s**
- Experience handicap:
  - −1 second for every 1,000 completed matches,
  - maximum reduction: −5 seconds.
- If the timer expires, the round uses the **current state score**
  (remaining open numbers + penalties) and play advances.
- In-game Help now includes Arena timing/order and Community Voice rules.
- Community Voice submit button is disabled for empty/too-short comments.
- Existing v0.5 Invite Room and v0.6 Arena foundations remain intact.
- Hard Mode remains a future feature, not active in v0.6.1.

## Deployment order

1. In Supabase → SQL Editor, run:
   `supabase-v061-migration.sql`
2. Upload/replace on GitHub:
   - `index.html`
   - `arena-v061-patch.js`
   - `README.md`
   - `README-v0.6.1.md`
   - `NAVODILA-v0.6.1-SLO.txt`
   - keep existing v0.6.0 files.
3. Commit directly to `main`.
4. Wait for GitHub Pages deployment.
5. Hard refresh (`Ctrl + F5`) and test with at least two devices.

## Important security note

Never put the Supabase database password, Secret key or `service_role` key in GitHub.
Only the public Publishable key belongs in the browser configuration.

## Beta status

Arena matchmaking is free in this beta.
Payment / EUR / Pi entry logic and tournaments are foundations for later versions.
