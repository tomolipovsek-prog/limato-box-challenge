# LiMATO Box Challenge v0.6.2 — Arena Beta

**Hard Mode Update**

v0.6.2 is an additive upgrade on top of v0.6.1. Existing Solo, Invite Room, automatic Arena, Turn & Timer, Community Voice, player registration, analytics and Supabase data stay intact.

## New in v0.6.2

- Adds selectable **Normal / 🔥 HARD** difficulty.
- In HARD mode, a player can confirm an incorrect selected sum.
- Every incorrect confirmation adds **+2 penalty points**.
- The selected/open numbers are not closed after the mistake; the player tries again.
- In Arena, the round timer keeps running while the player corrects the mistake.
- HARD rules are added to in-game Help.
- Version/cache markers are updated to v0.6.2.

## Unchanged

- Arena order follows queue order.
- Whole-round Arena timers remain 40 / 45 / 50 / 60 seconds with the existing experience handicap.
- v0.5 Invite Room remains intact.
- Payments / EUR / Pi entry logic are not activated.
- Tournament UI remains a future feature.

## Deployment

No new Supabase migration is required for this client-side Hard Mode update.

Upload/replace on GitHub:
- `index.html`
- `arena-v062-patch.js`
- `README.md`
- `README-v0.6.2.md`
- `NAVODILA-v0.6.2-SLO.txt`

Keep all existing v0.6.0 and v0.6.1 files, including `arena-v061-patch.js` and `supabase-v061-migration.sql`.

Suggested commit:
`LiMATO Box Challenge v0.6.2 - Hard Mode Update`
