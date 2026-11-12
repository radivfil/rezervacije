# Rezervacije stolova (prodajni prototip)

White-label aplikacija za rezervaciju stolova u nocnim klubovima. Pravila projekta: `CLAUDE.md`. Poslovna logika: `spdd/canvases/`.

## Pokretanje
```bash
npm install
npm run seed            # demo podaci od danas (8 tjedana termina)
npm run build && npm start
```
Za razvoj: `npm run dev`. Provjere: `npm run typecheck`, `npm run lint`, `npm test`.

## Demo
| Stranica | URL |
|---|---|
| Gost, prvi klub | `/k/demo-club` |
| Gost, drugi klub | `/k/demo-club-2` |
| Osoblje, prvi klub | `/k/demo-club/admin` (PIN `1234`) |
| Osoblje, drugi klub | `/k/demo-club-2/admin` (PIN `4321`) |

Tok za demo: gost odabere stol i datum, rezervira, plati akontaciju demo placanjem i dobije QR. Osoblje skenira QR kamerom mobitela (ili upise kod u adminu) i oznaci dolazak od 3 h prije pocetka termina.

## Javni demo (Render)
U repozitoriju je `render.yaml`. Na render.com: New -> Blueprint -> odaberite ovaj repozitorij -> Apply.
Build generira demo termine od dana deploya. Besplatni plan uspava servis nakon neaktivnosti; budenje traje oko minutu i brise rezervacije.

## Vazno za demo
- Rezervacije su u memoriji servera: brisu se restartom i ne rade na serverless hostingu (Vercel). Pokrenite jedan server (`npm start`).
- `ADMIN_SESSION_SECRET` (min. 16 znakova) potpisuje sesije osoblja. Bez nje se koristi privremena tajna do restarta.
- Kolacic osoblja je `Secure` u produkciji; za lokalni `npm start` preko `http://` postavite `ADMIN_COOKIE_INSECURE=1`.
- Placanje je simulirano; nema pravog naplatnog sustava ni unosa kartice.
