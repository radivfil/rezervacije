# Prica 03: Pregled rezervacija i check-in za osoblje kluba
Kao osoblje kluba, zelim na tabletu vidjeti tlocrt i popis rezervacija za veceras te na ulazu skenirati QR, kako bih brzo smjestio goste.
Kao vlasnik kluba, zelim rucno dodati rezervaciju (telefon, poznati gost) i oznaciti no-show, kako bi tlocrt odgovarao stvarnom stanju.

Kriteriji prihvacanja:
- /k/<slug>/admin je zasticen jednostavnim PIN-om iz configa kluba (demo razina zastite).
- Popis rezervacija za odabrani termin: stol, broj osoba, ime, status, akontacija.
- Skeniranje QR-a (kamera) ili unos koda oznacava gosta kao checked_in.
- Rucna rezervacija i promjena statusa (no_show, cancelled) uz ista pravila kao kod gosta.
