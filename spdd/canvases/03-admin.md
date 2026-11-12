# Canvas 03: Pregled rezervacija i check-in za osoblje kluba

Izvor: spdd/stories/03-admin.md, spdd/analysis/03-admin.md (prijedlozi 1-8), canvas 01 i 02.
Status: implementirano (Operations 1-7), 2026-11-12.

## R - Requirements
Osoblje se na /k/<slug>/admin prijavi PIN-om kluba i za odabrani termin vidi tlocrt i popis rezervacija. Gost na ulazu pokazuje QR; osoblje ga skenira kamerom mobitela i na stranici potvrde oznaci dolazak. Osoblje rucno dodaje rezervacije, otkazuje ih i oznacava no-show.
Gotovo kad: s PIN-om 1234 osoblje Demo Cluba vidi rezervacije za veceras, check-in preko QR-a ili koda mijenja status u checked_in, no-show oslobada stol, rucna rezervacija se pojavljuje na tlocrtu gosta; bez PIN-a nista od toga nije dostupno.

## E - Entities
- Venue: + adminPinHash (SHA-256 heks). Demo PIN-ovi: demo-club 1234, demo-club-2 4321.
- Reservation: + checkedInAt?, + noShowAt?, + source: guest | staff | seed (postojeci zapisi: seed; gost iz canvasa 02: guest).
- PaymentAttempt: + method: demo | venue.

## A - Approach
Prijava i sesija:
1. PIN se usporeduje s adminPinHash vremenski konstantnom usporedbom.
2. Najvise 5 pogresnih pokusaja u 10 minuta po (klub, IP); nakon toga privremena blokada s porukom.
3. Ispravan PIN daje httpOnly, SameSite=Lax, Secure (u produkciji) kolacic s HMAC-SHA256 potpisom: slug + istek (12 h). Tajna iz ADMIN_SESSION_SECRET; u razvoju zadana vrijednost uz upozorenje.
4. Svaka stranica i svaka Server Action osoblja provjerava sesiju za taj klub; bez nje preusmjerava na prijavu ili vraca gresku.

Pravila osoblja:
5. Check-in: samo paid/confirmed, od startsAt - 3 h do startsAt + 8 h; postavlja checkedInAt. Ponovljeni check-in vraca "vec oznacen" (bez promjene).
6. No-show: samo paid/confirmed, nakon startsAt; postavlja noShowAt; stol postaje slobodan.
7. Otkazivanje: held/paid/confirmed prije check-ina; cancelReason = staff.
8. Rucna rezervacija: ista pravila kao gost (slobodan stol, termin nije poceo, partySize 1..kapacitet), ime 2-60 znakova, mobitel opcionalan; cijena se zamrzava. Dvije vrste:
   a) potvrdena: status confirmed, paidAt = confirmedAt = now, PaymentAttempt(method venue, succeeded) - akontacija primljena izvan aplikacije;
   b) drzanje: status held, holdExpiresAt = startsAt termina.
   source = staff.
9. Osoblje vidi ime i mobitel gosta; gost i javne stranice nikad ne vide tudje podatke.

Prikaz:
- Admin pocetna: odabir datuma (ukljucujuci danasnji termin i nakon pocetka), brojke (rezervirano / stiglo / ceka se / drzano), tlocrt s istim bojama, popis rezervacija po stolu.
- Tap na stol u adminu otvara panel osoblja: rezervacija (ako postoji) s akcijama check-in / no-show / otkazi, ili "Rucna rezervacija" za slobodan stol.
- Rucni unos koda (8 znakova, razmaci dopusteni) vodi na stranicu rezervacije.
- Stranica potvrde /k/<slug>/r/<code>: s valjanom sesijom osoblja prikazuje traku osoblja s gumbom "Oznaci dolazak" (i no-show/otkazi prema pravilima 5-7).

## S - Structure
/lib/admin (PIN, sesija, ogranicenje pokusaja), /lib/reservations/staff.ts (pravila 5-8), /lib/services (funkcije osoblja), /app/k/[slug]/admin (prijava, nadzorna ploca), /app/k/[slug]/admin/actions.ts, /components/admin, /messages/hr.json, README (demo PIN-ovi i ADMIN_SESSION_SECRET).

## O - Operations
1. Sheme i seed: adminPinHash, checkedInAt, noShowAt, source, PaymentAttempt.method. Gotovo: typecheck i testovi shema.
2. /lib/admin: provjera PIN-a, potpis i provjera sesije (istek, krivi klub, krivotvoreni potpis), ogranicenje pokusaja. Gotovo: testovi za pravila 1-3.
3. /lib/reservations/staff.ts: check-in, no-show, otkazivanje, rucna rezervacija (a/b). Gotovo: testovi za pravila 5-8 s injektiranim vremenom.
4. Servisi osoblja: popis rezervacija termina (s gostom, stolom, zonom), akcije 5-8, pretraga po kodu. Gotovo: testovi; no-show i otkazivanje oslobadaju stol na tlocrtu gosta.
5. Prijava i odjava: /k/<slug>/admin trazi PIN; zastita svih admin stranica i akcija. Gotovo: bez kolacica nema podataka; pogresan PIN 5x blokira.
6. Nadzorna ploca: datum, brojke, tlocrt s panelom osoblja, popis, rucni unos koda, rucna rezervacija. Gotovo: tok u pregledniku na tabletu i mobitelu.
7. Traka osoblja na stranici potvrde (check-in nakon skeniranja QR-a). Gotovo: QR -> stranica -> "Oznaci dolazak" -> checked_in.

## N - Norms
Kao canvas 01/02. Dodatno: admin je tablet-first, ali radi na mobitelu; dodirne mete >= 44px.

## S - Safeguards
- Bez valjane sesije nijedna stranica ni akcija osoblja ne otkriva ni mijenja podatke.
- PIN se ne sprema u cistom obliku; sesija se ne moze krivotvoriti bez tajne.
- Ime i mobitel gosta samo osoblju; ne logiraju se.
- Pravila canvasa 01/02 vrijede i za osoblje (jedna aktivna rezervacija po stolu i terminu).
- Izvan opsega: korisnicki racuni i uloge, povrat akontacije, skener u aplikaciji, promotori, e-mail/SMS.
- Nista izvan Operations 1-7.

## Odluke za pregled
- [x] QR se skenira kamerom mobitela (bez skenera u aplikaciji).
- [x] Check-in od 3 h prije do 8 h nakon pocetka; no-show tek nakon pocetka.
- [x] Rucna rezervacija: "potvrdena, akontacija primljena izvan aplikacije" ili "drzanje do pocetka termina".
- [x] Demo PIN-ovi 1234 / 4321.

## Napomene iz implementacije
- Bez ADMIN_SESSION_SECRET generira se nasumicna tajna po procesu (sesije vrijede do restarta, kao i podaci u memoriji) - umjesto zadane razvojne vrijednosti.
- Kolacic osoblja je Secure u produkciji; ADMIN_COOKIE_INSECURE=1 dopusta lokalni demo preko http.
- Klub koji se salje u preglednik nikad ne sadrzi adminPinHash (javni oblik kluba u servisnom sloju).
