# LiMATO Box Challenge v0.5.0 — Public Beta

**Numbers. Logic. Strategy. A touch of luck.**

Public Beta package prepared for GitHub Pages.

## New in v0.5.0
- iPhone safe-area correction: game controls stay below the iOS status area
- optional Online Challenge rooms: several players can play at the same time, each on their own device
- room code + shareable invite link
- live online leaderboard
- anonymous opt-in analytics: visits, players who start, completed matches, 30-day returners
- traffic source tracking via `utm_source` (Facebook, X, Instagram, TikTok, etc.)
- 5-star rating prompt after several completed games
- existing 24 languages, game modes, dice animation, Help system and LiMATO branding preserved

## Important
The core solo game works immediately on GitHub Pages.
Online rooms, shared statistics and star ratings require the one-time Supabase setup described in `SETUP-SUPABASE-SLO.md`.

Never put a Supabase Secret / service_role key in GitHub. Only the public **Publishable key** belongs in `supabase-config.js`.
