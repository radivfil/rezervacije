# Canvas 01: Temelj, tlocrt i gostinski prikaz

Status: implementirano (Operations 1-7). Zadnji sync s kodom: 2026-11-12.

## R - Requirements
Rezervacija postaje potvrdena tek nakon akontacije (30% min. potrosnje). Akontacija se uracunava u minimalnu potrosnju. Prototip je prodajni demo, mobile first, white-label.
Gotovo kad: gost na /k/demo-club bira datum, vidi 2 etaze s 90 stolova u bojama, klikne stol i vidi min. potrosnju, akontaciju i uvjete; /k/demo-club-2 izgleda drukcije bez oznake proizvoda.

## E - Entities
Venue (slug, name, timezone, theme {logoUrl, colors, fontFamily}, policy {freeCancellationHours}), Floor (order, width, height), Zone (minSpend, depositPercent, color), Table (floorId, zoneId, label, x, y, rotation, width, height, shape: round|rect, capacity), Decoration (kind: bar|dj|dancefloor|stairs|wc|void), Event (date, name, kind: regular|special, priceMultiplier), Reservation (eventId, tableId, status: held|paid|confirmed|checked_in|no_show|cancelled, partySize, promoterId?, createdAt, holdExpiresAt? samo za held), Promoter (name, code).

## A - Approach
Multi-tenant po slugu. Config i raspored kao JSON (/data/venues/<slug>.json, validiran zod shemom). Tematizacija CSS varijablama. Servisni sloj nad JSON-om.
Cijene (iznosi u centima, zaokruzeno na cent):
- cijena = zona.minSpend x event.priceMultiplier
- akontacija = cijena x depositPercent
- ostatak potrosnje u klubu = cijena - akontacija (akontacija se uracunava u min. potrosnju)
Termini: cetvrtak 0.6, petak 1, subota 1.3, posebni event 1.5. Nedjelja-srijeda nema redovnog termina.
Aktivne rezervacije (blokiraju stol): held, paid, confirmed, checked_in. cancelled i no_show oslobadaju stol.
Status stola za gosta: held -> drzan (zuto); paid|confirmed|checked_in -> zauzet (crveno); inace slobodan (zeleno).
Gost vidi samo termine od danas (vremenska zona kluba); odabrani datum je u URL-u (?datum=YYYY-MM-DD).

## S - Structure
/app/k/[slug], /components/floorplan, /components/venue, /lib/domain, /lib/services, /lib/pricing, /lib/floorplan, /lib/theme, /lib/seed, /data/venues/*.json, /scripts/seed.ts, /messages/hr.json
(/app/k/[slug]/admin jos ne postoji - dolazi u kasnijem canvasu.)

## O - Operations
1. Tipovi i zod sheme za sve entitete. Gotovo: typecheck prolazi.
2. Pricing modul + testovi (cetvrtak 0.6, petak 1, subota 1.3, event 1.5).
3. Seed: Demo Club - prizemlje 50 stolova (Standard 30 @150, Premium 16 @300, Platinum 4 @800), kat 40 stolova (Lounge 24 @250, VIP 12 @500, Balkon 4 @1000); bar, DJ, podij, stepenice, WC; ~40 nasumicnih rezervacija. Drugi klub s drugim logom i bojama.
4. Tematizacija iz configa (logo, boje, font) bez naziva proizvoda.
5. Tlocrt (react-konva): tabovi etaza, zoom/pan, boje statusa, legenda.
6. Bottom sheet za stol: zona, kapacitet, min. potrosnja, akontacija, ostatak u klubu, uvjeti.
7. Odabir datuma mijenja cijene i statuse stolova.

## N - Norms
TypeScript strict, bez any. Male komponente bez poslovne logike. Dodirne mete >= 44px (premalen stol se prvim dodirom priblizi). hr-HR formati. Testovi za sve u /lib.

## S - Safeguards
Nikad dvije aktivne rezervacije za isti (stol, event). Nikakav naziv proizvoda u UI-ju. Bez pravih placanja i osobnih podataka u seedu. Nista izvan Operations 1-7.

## Odluke iz synca (za potvrdu vlasnika)
- [ ] no_show oslobada stol (nije aktivna rezervacija).
- [ ] Istek drzanja (holdExpiresAt) se jos ne primjenjuje; drzan stol ostaje zut. Pravilo dolazi u canvasu 02.
- [ ] Rok besplatnog otkazivanja je po klubu u configu (Demo Club 48 h, drugi klub 24 h).
- [ ] Seed: svaka treca subota je posebni event (samo demo podaci).
