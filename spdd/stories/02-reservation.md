# Prica 02: Rezervacija stola s akontacijom (demo placanje) i QR potvrda
Kao gost nocnog kluba, zelim rezervirati odabrani stol i platiti akontaciju na mobitelu, kako bih bio siguran da je stol moj i na ulazu pokazao potvrdu.
Kao vlasnik kluba, zelim da stol bude drzan samo kratko dok gost placa, kako mi neplaceni stolovi ne bi blokirali prodaju.

Kriteriji prihvacanja:
- Iz panela slobodnog stola gost klikne "Rezerviraj", unese broj osoba (do kapaciteta), ime i kontakt.
- Stol se drzi ogranicno vrijeme (odbrojavanje); drugi gost u tom vremenu vidi stol kao drzan (zuto).
- Ako drzanje istekne prije placanja, stol je opet slobodan, a gost dobiva poruku da je vrijeme isteklo.
- Demo placanje akontacije (bez pravog naplatnog sustava): uspjeh i neuspjeh se mogu odabrati.
- Nakon uspjesnog placanja rezervacija je potvrdena, stol je zauzet (crveno), gost vidi potvrdu s QR kodom, iznosom akontacije i ostatkom potrosnje u klubu.
- Dva gosta ne mogu istovremeno rezervirati isti stol za isti termin.
- Potvrda i QR nose samo podatke kluba, nigdje naziv proizvoda.
