# Sova Booking (interni naziv) - pravila projekta

## Cilj
White-label aplikacija za rezervaciju stolova u nocnim klubovima. Gost bira stol na interaktivnom tlocrtu, rezervacija postaje potvrdena tek nakon akontacije (30% min. potrosnje). Ovo je PRODAJNI PROTOTIP za vise klubova.

## Tvrda pravila
- WHITE-LABEL: nigdje u UI-ju, metapodacima, title/og tagovima, e-mail predlozcima ni QR potvrdi ne smije pisati "Sova" ni naziv proizvoda. Sve dolazi iz configa kluba.
- UI na hrvatskom, svi tekstovi u /messages/hr.json, formati hr-HR (datum, valuta EUR).
- Sav pristup podacima ide kroz /lib/services (kasnije zamjena Supabaseom bez izmjena UI-ja).
- Stack: Next.js App Router, TypeScript strict (bez any), Tailwind, react-konva, Zustand, zod, qrcode, vitest.
- Mobile first. Dodirne mete >= 44px.
- Ne implementiraj nista izvan aktivnog canvasa/zadatka.
- Nakon svakog zadatka pokreni: typecheck, lint, test. Sazmi sto radi.

## SPDD-lite
- Canvas u spdd/canvases/ je izvor istine za POSLOVNU LOGIKU (cijene, rezervacije, hold, otkazivanje).
- Ako se promijeni poslovno pravilo: prvo azuriraj canvas, pa kod.
- UI/izgled mozes iterirati slobodno bez canvasa.
- Naredbe: /spdd-analysis, /spdd-prompt, /spdd-generate, /spdd-sync.
