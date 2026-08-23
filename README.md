# LiMATO Box Challenge v0.6.3 — STABLE FIX-12

Konsolidiran GitHub paket. Ohranjen je celoten obstoječi sistem: Solo, Online soba – povabi, Arena, Community Voice, registracija, statistika, HARD Mode in AI Challenge.

## FIX-12
- ohranjeni vsi popravki FIX-11 (začetni met kdo začne, pravilni prehodi rund, timer igralca, sinhronizacija imena, brez fantomske dodatne runde),
- AI Master je usklajen z osnovno igro: Master 1–18 začne s **4 kockami**,
- AI logika preverja možne vsote do **24**, kar je potrebno pri 4 kockah,
- AI Mojster lahko strateško uporablja do 4 kocke,
- cache oznaka AI datoteke je dvignjena na `v=06312`.

## Namestitev
Datoteke iz tega paketa naloži v ROOT GitHub repozitorija `limato-box-challenge` in z njimi prepiši istoimenske datoteke. SQL migracij NE zaganjaj ponovno, če sta bili `supabase-v060-migration.sql` in `supabase-v061-migration.sql` že uspešno izvedeni.

Po GitHub Pages deployu naredi `Ctrl+F5`.

## Hiter test
1. Solo: Classic in Master, 3 runde.
2. HARD: napačna potrditev = +2, številke ostanejo odprte.
3. AI: preveri oba scenarija začetnega meta (igralec začne / AI začne).
4. AI Master: na začetku AI runde mora uporabljati 4 kocke.
5. Po vsaki človeški rundi AI odigra isto rundo; po zadnji rundi ni dodatne runde.
6. Invite Room in Arena morata ostati dostopna.
