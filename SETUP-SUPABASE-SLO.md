# LiMATO Box Challenge — nastavitev Online + statistike

To narediš samo ENKRAT. Solo igra deluje tudi brez tega.

## 1. Ustvari Supabase projekt
Odpri Supabase, ustvari nov projekt in počakaj, da je pripravljen.

## 2. Vključi Anonymous Sign-Ins
V Supabase Dashboard pojdi v **Authentication > Sign In / Providers** in vključi **Allow anonymous sign-ins**.
Igralcu zato ni treba vpisovati e-pošte ali gesla.

## 3. Zaženi SQL
Odpri **SQL Editor**, prilepi celotno vsebino datoteke `supabase-setup.sql` in izberi **Run**.
To ustvari:
- online sobe,
- igralce in live lestvico,
- anonimne dogodke statistike,
- ocene 1–5,
- zaščito Row Level Security,
- zasebna 30-dnevna pregleda statistike.

## 4. Kopiraj samo dva JAVNA podatka
V **Settings > API Keys** poišči:
- Project URL
- Publishable key (`sb_publishable_...`)

Odpri `supabase-config.js` in vpiši:

```js
window.LBC_SUPABASE = {
  url: "https://TVOJ-PROJEKT.supabase.co",
  key: "sb_publishable_TVOJ_KLJUC"
};
```

### NIKOLI
V `supabase-config.js`, GitHub ali browser NE vpisuj:
- Secret key,
- service_role key,
- gesla baze.

## 5. Naloži v GitHub
V repozitorij `limato-box-challenge` naloži oziroma zamenjaj VSE datoteke tega paketa.
Predlagan Commit message:

`LiMATO Box Challenge v0.5.0 - Public Beta`

GitHub Pages ostane nastavljen na:
- Branch: `main`
- Folder: `/(root)`

## Kako deluje online igra
1. Igralec izbere **Online soba**.
2. Prvi igralec klikne **USTVARI SOBO**.
3. Dobi 6-mestno kodo in gumb **KOPIRAJ LINK**.
4. Link pošlje prijateljem.
5. Vsak igra svoj Box NAENKRAT na svojem telefonu/računalniku.
6. Vsi vidijo skupno online lestvico.
7. Najnižji skupni rezultat zmaga.

To je za Public Beta namerno preprost in hiter multiplayer: igralci ne čakajo drug na drugega.

## Statistika samo za lastnika projekta
V Supabase > SQL Editor za zadnjih 30 dni zaženi:

```sql
select * from private.lbc_stats_30d;
```

Dobiš:
- `visitors_30d` — različni obiskovalci,
- `players_started_30d` — koliko različnih ljudi je začelo igrati,
- `returning_players_30d` — koliko jih je prišlo vsaj dva različna dneva,
- `matches_started_30d`,
- `matches_finished_30d`,
- `average_rating_30d`,
- `ratings_30d`.

Za primerjavo oglasnih kanalov:

```sql
select * from private.lbc_sources_30d;
```

Tako boš videl npr. Facebook vs X vs Instagram vs TikTok.

## Zasebnost
Anonimna statistika se začne šele, ko igralec izbere **DOVOLI**. Igra ne pošilja imena, e-pošte ali telefonske številke v tabelo statistike.
Online soba potrebuje anonimno tehnično prijavo, da lahko vsak igralec varno posodablja samo svoj rezultat.
