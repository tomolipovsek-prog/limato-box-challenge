# LiMATO Box Challenge v0.6.0 — Arena Beta

Additive upgrade for the existing v0.5.0 Public Beta.

## What stays
The current core game, Invite Room, analytics, ratings, branding, icons and existing Supabase tables stay intact.

## New files
- `arena-v060.css`
- `arena-db-v060.js`
- `arena-v060.js`
- `supabase-v060-migration.sql`

`index.html` is the only existing file replaced by this package.

## Arena
- 2–6 players
- automatic matchmaking by Box + rounds + player count
- random seat order
- sequential live turns
- live spectator board snapshots
- per-round deadlines: 20 / 25 / 30 / 45 seconds
- server-side timeout watchdog RPC
- opponent-selected AI personalities provoke the active player
- legacy room-code mode remains available for friend invites

## Player account
The first seven newly completed matches after the upgrade are a trial. Afterwards an anonymous v0.6 identity can be linked to email with Supabase Auth. Enable **Allow manual linking** before testing this.

## Community Voice
User submissions are limited to 75 characters and always enter the database as `pending`. The client has a first-pass blocker for obvious threats/heavy abuse/sexual obscenity. Rejected raw text is not stored; only a category can be logged.

For public-scale automated moderation, add a trusted server/Edge Function later. Never put secret or service-role keys in GitHub.

## Payments / Pi
Not active. Database fields are placeholders only.

## Tournaments
Schema foundation exists for 4/8/16/32/64/128-player tournaments. UI is intentionally not enabled yet.
