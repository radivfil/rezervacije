# Canvas 02: Rezervacija stola s akontacijom (demo placanje) i QR potvrda

Izvor: spdd/stories/02-reservation.md, spdd/analysis/02-reservation.md (prijedlozi 1-8 prihvaceni 2026-11-12), canvas 01.

## R - Requirements
Gost iz panela slobodnog stola rezervira stol: unese broj osoba, ime i mobitel, stol se drzi 10 minuta dok placa akontaciju demo placanjem, a nakon uspjeha dobiva potvrdu s QR kodom. Rezervacija je potvrdena odmah nakon placanja.
Gotovo kad: na /k/demo-club gost rezervira slobodan stol, za vrijeme drzanja drugi gost vidi taj stol zuto, nakon demo placanja stol je crven i gost vidi potvrdu s QR-om, iznosom akontacije i ostatkom u klubu; istekli hold vraca stol u slobodan; drugi pokusaj za isti stol i termin je odbijen.

## E - Entities
- Venue.policy: + holdMinutes (Demo Club i drugi klub: 10).
- Event: + startsAt (ISO datum i vrijeme pocetka; seed: 23:00 po vremenu kluba).
- Reservation: + code (8 znakova, abeceda bez 0/O/1/I/L), + guestName?, + guestPhone?, + minSpendCents, + depositCents (zamrznuto pri stvaranju), + paidAt?, + confirmedAt?, + cancelledAt?, + cancelReason? (hold_expired | payment_abandoned | staff).
  Podaci gosta su opcionalni u shemi (seed ih nema), a obavezni pri stvaranju od strane gosta.
- PaymentAttempt (novo, demo): id, reservationId, amountCents, result: succeeded | failed, createdAt.

## A - Approach
Pravila:
1. Rezervirati se moze samo slobodan stol za termin koji jos nije poceo (now < event.startsAt).
2. partySize je 1..kapacitet stola. Ime 2-60 znakova. Mobitel: hrvatski ili medunarodni format (+385..., 09...), normaliziran na E.164.
3. Pri stvaranju se racuna cijena (canvas 01) i zamrzava u minSpendCents/depositCents.
4. Nova rezervacija gosta: status held, holdExpiresAt = now + holdMinutes.
5. Lijeni istek: held s holdExpiresAt <= now je neaktivan (stol slobodan); pri sljedecem citanju/pisanju prelazi u cancelled s cancelReason = hold_expired. Bez pozadinskog procesa.
6. Demo placanje dopusteno samo za held koji nije istekao. Uspjeh: held -> paid -> confirmed u istom koraku (paidAt = confirmedAt = now). Neuspjeh: zapis PaymentAttempt(failed), rezervacija ostaje held do isteka.
7. Najvise jedna aktivna rezervacija po (stol, event): provjera i upis u jednom sinkronom koraku u spremistu (bez await izmedu), drugi zahtjev dobiva gresku "stol vise nije slobodan".
8. Seed rezervacije u statusu held su drzanja kluba/promotora: holdExpiresAt = startsAt termina (ostaju zute na demu).
9. Iznosi na potvrdi: akontacija (placeno) i ostatak u klubu = min. potrosnja - akontacija.

Tehnicki:
- Spremiste rezervacija u /lib/services kao sucelje ReservationRepository; implementacija u memoriji servera, inicijalizirana iz /data/venues/*.json (resetira se restartom; zamjena Supabaseom bez izmjena UI-ja). Singleton na globalThis da prezivi hot reload.
- Vrijeme (now) i generator koda se injektiraju, radi testova.
- Server Actions za: stvaranje rezervacije, demo placanje, odustajanje od drzanja. Validacija ulaza zod shemom na serveru.
- Stranice rezervacije su dinamicke (ovise o zahtjevu i vremenu).
- QR (paket qrcode, SVG) sadrzi apsolutni URL potvrde /k/<slug>/r/<code>; osoblje ga u prici 03 koristi za check-in.

## S - Structure
/lib/reservations (pravila, kod, istek, prijelazi statusa), /lib/services/reservations.ts (ReservationRepository + memorijska implementacija), /app/k/[slug]/rezerviraj (forma: ?stol=&datum=), /app/k/[slug]/r/[code] (drzanje + demo placanje / potvrda / isteklo), /app/k/[slug]/actions.ts (Server Actions), /components/reservation, /messages/hr.json.

## O - Operations
1. Sheme i seed: prosiriti Reservation, Venue.policy, Event (startsAt), dodati PaymentAttempt; seed held drzanja do pocetka termina. Gotovo: typecheck, postojeci i novi testovi shema prolaze.
2. Pravila u /lib/reservations: validacija zahtjeva, generator koda, lijeni istek, prijelazi held -> paid -> confirmed i held -> cancelled. Gotovo: testovi za svako pravilo 1-6 i 8-9 (uz injektirano vrijeme).
3. ReservationRepository u memoriji + getFloorplan cita iz njega (statusi ukljucuju nove rezervacije i istek). Gotovo: testovi ukljucujuci dva uzastopna zahtjeva za isti stol (drugi odbijen) i istek koji oslobada stol.
4. Gumb "Rezerviraj" u panelu (samo slobodan stol i termin koji nije poceo) -> forma: broj osoba (stepper, >= 44px), ime, mobitel, sazetak cijene; Server Action stvara drzanje i preusmjerava na /k/<slug>/r/<code>. Gotovo: greske validacije i "stol vise nije slobodan" prikazane na hrvatskom.
5. Stranica rezervacije u stanju held: odbrojavanje do isteka, iznos akontacije, demo placanje ("Plati akontaciju" / "Simuliraj odbijanje") s jasnom oznakom da je demo bez naplate, "Odustani". Isteklo: poruka i povratak na tlocrt. Gotovo: tok held -> confirmed i held -> isteklo radi u pregledniku.
6. Potvrda (confirmed): QR, kod rezervacije, klub, termin, stol, zona, broj osoba, placena akontacija, ostatak u klubu, uvjeti. Gotovo: QR se ucitava, nigdje naziv proizvoda, tlocrt nakon potvrde prikazuje stol crveno.

## N - Norms
Kao canvas 01: TypeScript strict bez any, male komponente bez poslovne logike, dodirne mete >= 44px, hr-HR formati, svi tekstovi u /messages/hr.json, testovi za sve u /lib, pristup podacima samo kroz /lib/services.

## S - Safeguards
- Nikad dvije aktivne rezervacije za isti (stol, event).
- Bez pravog placanja i bez unosa podataka kartice; demo placanje je jasno oznaceno.
- Ime i mobitel gosta: samo u memoriji servera, ne logiraju se, ne salju se vanjskim servisima, ne pojavljuju se u URL-u.
- Kod rezervacije nije pogodljiv (kriptografski slucajan); stranica rezervacije bez ispravnog koda vraca 404.
- Nigdje naziv proizvoda (potvrda, QR, metapodaci).
- Izvan opsega: otkazivanje od strane gosta, povrat akontacije, promo kodovi, admin i check-in (prica 03), e-mail/SMS.
- Nista izvan Operations 1-6.

## Odluke za pregled
- [ ] Event.startsAt 23:00 za sve seed termine.
- [ ] Seed held = drzanje kluba/promotora do pocetka termina (pravilo 8), da demo ima zute stolove.
- [ ] Forma na zasebnoj stranici /rezerviraj (ne u panelu) - jednostavnije na mobitelu i za Server Action.
- [ ] QR sadrzi URL potvrde (ne samo kod).
