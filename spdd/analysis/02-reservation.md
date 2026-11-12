# Analiza 02: Rezervacija stola s akontacijom i QR potvrda

Izvor: spdd/stories/02-reservation.md, CLAUDE.md, canvas 01 (implementiran).
Cilj: prodajni demo/MVP. Pravo placanje i trajna baza su izvan opsega; servisni sloj mora ostati zamjenjiv (Supabase, naplatni sustav).

## Domenski pojmovi
- **Drzanje (hold)**: privremena rezervacija dok gost placa; status `held` s `holdExpiresAt`.
- **Akontacija**: 30 % min. potrosnje termina; uracunava se u min. potrosnju (canvas 01).
- **Ostatak u klubu**: min. potrosnja - akontacija.
- **Demo placanje**: simulirani naplatni korak bez pravog novca i bez podataka kartice.
- **Potvrda**: stranica s kodom rezervacije i QR-om koji osoblje skenira na ulazu (prica 03).
- **Kod rezervacije**: kratki, necitljivi za pogadanje identifikator (npr. 8 znakova) u QR-u i URL-u potvrde.

## Entiteti i promjene
- **Reservation** (postoji): dodati `guestName`, `guestContact` (telefon ili e-mail), `code`, `depositCents`, `minSpendCents` (cijena zamrznuta u trenutku rezervacije), `paidAt?`, `confirmedAt?`.
- **Venue.policy** (postoji): dodati `holdMinutes`.
- **PaymentAttempt** (novo, demo): `reservationId`, `amountCents`, `result: succeeded|failed`, `createdAt`. Priprema za pravi naplatni sustav.
- Prijelazi statusa: `held -> paid -> confirmed`, `held -> cancelled` (istek ili odustajanje). Za demo `paid` i `confirmed` mogu se dogoditi u istom koraku (vidi pitanje 2).

## Pravila (prijedlog za canvas 02)
1. Rezervacija je moguca samo za slobodan stol i termin od danas nadalje.
2. `partySize` je 1..kapacitet stola.
3. Pri stvaranju se cijena racuna i zamrzava (promjena cjenika ne mijenja postojecu rezervaciju).
4. Drzanje traje `holdMinutes`; istekla `held` rezervacija se tretira kao neaktivna (stol slobodan) i pri sljedecem citanju prelazi u `cancelled`.
5. Placanje je dopusteno samo dok drzanje nije isteklo; neuspjelo placanje ostavlja drzanje aktivnim do isteka.
6. Pravilo iz canvasa 01 vrijedi i dalje: najvise jedna aktivna rezervacija po (stol, event), provjereno atomski pri stvaranju.

## Ovisnosti
- Canvas 01: pricing, table-status, servisni sloj, panel stola.
- `qrcode` (vec instaliran) za QR na potvrdi.
- **Pohrana**: trenutni podaci su staticni JSON. Za rezervacije treba zapisivanje. Prijedlog za demo: in-memory spremiste u servisnom sloju, inicijalizirano iz seeda (resetira se restartom servera); isti potpis funkcija kasnije za Supabase.
- Server Actions (Next 16) za stvaranje rezervacije i placanje.

## Rizici
- **Utrka dva gosta za isti stol**: rjesava se provjerom i upisom u jednom koraku u servisu (u memoriji jednostavno; u Supabaseu unique indeks na aktivne (table, event)).
- **In-memory pohrana na hostingu** (npr. Vercel serverless) ne dijeli stanje izmedu instanci i gubi ga restartom. Za demo na jednom serveru (npr. `next start`) radi; za javni demo treba Supabase ili slicno.
- **Osobni podaci (ime, kontakt)**: u demo pohrani samo u memoriji; ne logirati, ne slati vani. GDPR obavijest u UI-ju potrebna prije pravog koristenja.
- **Cache Components**: stranice s rezervacijama ovise o zahtjevu (status se mijenja), moraju biti dinamicke.
- **Istek drzanja bez pozadinskog procesa**: rijeseno "lijenim" istekom pri citanju (pravilo 4), bez cron posla.

## Otvorena pitanja (s mojim prijedlogom)
1. Koliko traje drzanje? **Prijedlog: 10 minuta**, u configu kluba.
2. Je li rezervacija `confirmed` odmah nakon placanja ili tek kad je klub odobri? **Prijedlog: odmah** (`paid` pa automatski `confirmed`); rucno odobravanje kasnije ako klub zeli.
3. Koje podatke trazimo od gosta? **Prijedlog: ime + broj mobitela**; e-mail opcionalno. Bez registracije.
4. Moze li gost sam otkazati iz potvrde (link)? **Prijedlog: ne u ovoj prici**; uvjeti otkazivanja se prikazuju, otkazivanje radi osoblje (prica 03).
5. Povrat akontacije pri otkazivanju na vrijeme? Nije definirano. **Prijedlog: izvan opsega dema**; samo tekst uvjeta.
6. Demo placanje: zaseban ekran s gumbima "Plati (uspjeh)" / "Simuliraj odbijanje"? **Prijedlog: da**, jasno oznaceno kao demo bez naplate.
7. Pohrana za demo: in-memory (brzo, resetira se) ili odmah Supabase? **Prijedlog: in-memory sada**, Supabase kad krenu pravi klubovi.
8. Promotor: treba li gost moci unijeti promo kod pri rezervaciji? **Prijedlog: ne sada** (kasnija prica).
