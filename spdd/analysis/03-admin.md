# Analiza 03: Pregled rezervacija i check-in za osoblje kluba

Izvor: spdd/stories/03-admin.md, CLAUDE.md, canvas 01 i 02 (implementirani).
Cilj: prodajni demo/MVP. Prava autentikacija korisnika (racuni, uloge) je izvan opsega.

## Domenski pojmovi
- **Osoblje**: svatko tko zna PIN kluba; jedna zajednicka uloga.
- **Sesija osoblja**: potpisani httpOnly kolacic nakon ispravnog PIN-a, vrijedi za jedan klub.
- **Check-in**: gost je stigao; confirmed/paid -> checked_in.
- **No-show**: potvrdeni gost nije dosao; stol se oslobada (canvas 01).
- **Rucna rezervacija**: osoblje upisuje rezervaciju za gosta (telefon, poznati gost, promotor).
- **Akontacija izvan aplikacije**: osoblje potvrduje da je akontacija primljena na drugi nacin (gotovina, uplata).

## Entiteti i promjene
- Venue: + adminPinHash (SHA-256 PIN-a; demo PIN-ovi u README-u).
- Reservation: + checkedInAt?, + noShowAt?, + source: guest | staff | seed.
- PaymentAttempt: + method: demo | venue (venue = akontacija primljena izvan aplikacije).

## Rizici
- **PIN je slaba zastita**: dovoljno za demo; ogranicenje pokusaja (5 u 10 min po klubu i IP-u) i httpOnly potpisani kolacic. Za produkciju prave prijave (Supabase Auth).
- **Server Actions su javni POST endpointi**: svaka akcija osoblja mora sama provjeriti sesiju (Next.js upozorenje).
- **Tajna za potpis sesije**: iz env varijable; u razvoju zadana vrijednost uz upozorenje u logu.
- **Osobni podaci**: ime i mobitel vidi samo osoblje s valjanom sesijom; ne logiraju se.
- **Skeniranje QR-a**: kamera u pregledniku (BarcodeDetector) ne radi na iOS Safariju; zahtijevala bi novu biblioteku.

## Otvorena pitanja (s mojim prijedlogom)
1. Kako se skenira QR? **Prijedlog: ugradenom kamerom mobitela.** QR otvara stranicu potvrde; ako je osoblje prijavljeno, ondje se pojavljuje gumb "Oznaci dolazak". Plus rucni unos koda u adminu. Bez skenera u aplikaciji.
2. Kada je check-in dopusten? **Prijedlog: od 3 h prije do 8 h nakon pocetka termina**, samo za paid/confirmed.
3. Kada se smije oznaciti no-show? **Prijedlog: nakon pocetka termina**, samo za paid/confirmed. Akontacija se ne vraca (samo tekst, bez povrata).
4. Moze li osoblje otkazati rezervaciju? **Prijedlog: da**, held/paid/confirmed prije check-ina (razlog staff). Povrat akontacije izvan opsega.
5. Rucna rezervacija - status? **Prijedlog: dvije opcije**: (a) potvrdena uz oznaku "akontacija primljena izvan aplikacije" (cuva pravilo da je potvrda tek nakon akontacije), (b) drzanje do pocetka termina (VIP/promotor), kao seed drzanja.
6. Podaci kod rucne rezervacije? **Prijedlog: ime obavezno, mobitel opcionalan**, broj osoba, stol, termin.
7. Odabir stola u adminu? **Prijedlog: tlocrt kao kod gosta**, tap na stol otvara panel s akcijama osoblja (za demo vizualno najjace).
8. Vise osoba osoblja istovremeno? Da, isti PIN; nema pracenja tko je sto napravio (samo vremena).
