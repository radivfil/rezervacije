# Canvas 01: Temelj, tlocrt i gostinski prikaz

## R - Requirements
Rezervacija postaje potvrdena tek nakon akontacije (30% min. potrosnje). Prototip je prodajni demo, mobile first, white-label.
Gotovo kad: gost na /k/demo-club bira datum, vidi 2 etaze s 90 stolova u bojama, klikne stol i vidi min. potrosnju, akontaciju i uvjete; /k/demo-club-2 izgleda drukcije bez oznake proizvoda.

## E - Entities
Venue, Floor, Zone (minSpend, depositPercent), Table (floorId, zoneId, x, y, rotation, width, height, shape, capacity), Decoration, Event (priceMultiplier), Reservation (status: held|paid|confirmed|checked_in|no_show|cancelled), Promoter.

## A - Approach
Multi-tenant po slugu. Config i raspored kao JSON. Tematizacija CSS varijablama. Servisni sloj nad JSON-om. cijena = zona.minSpend x event.priceMultiplier; akontacija = cijena x depositPercent.

## S - Structure
/app/k/[slug], /app/k/[slug]/admin, /components/floorplan, /lib/services, /lib/pricing, /data/venues/*.json, /scripts/seed.ts, /messages/hr.json

## O - Operations
1. Tipovi i zod sheme za sve entitete. Gotovo: typecheck prolazi.
2. Pricing modul + testovi (cetvrtak 0.6, petak 1, subota 1.3, event 1.5).
3. Seed: Demo Club - prizemlje 50 stolova (Standard 30 @150, Premium 16 @300, Platinum 4 @800), kat 40 stolova (Lounge 24 @250, VIP 12 @500, Balkon 4 @1000); bar, DJ, podij, stepenice, WC; ~40 nasumicnih rezervacija. Drugi klub s drugim logom i bojama.
4. Tematizacija iz configa (logo, boje, font) bez naziva proizvoda.
5. Tlocrt (react-konva): tabovi etaza, zoom/pan, boje statusa, legenda.
6. Bottom sheet za stol: zona, kapacitet, min. potrosnja, akontacija, uvjeti.
7. Odabir datuma mijenja cijene i statuse stolova.

## N - Norms
TypeScript strict, bez any. Male komponente bez poslovne logike. Dodirne mete >= 44px. hr-HR formati. Testovi za sve u /lib.

## S - Safeguards
Nikad dvije aktivne rezervacije za isti (stol, event). Nikakav naziv proizvoda u UI-ju. Bez pravih placanja i osobnih podataka u seedu. Nista izvan Operations 1-7.
