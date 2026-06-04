# MediTrack - läkemedelshantering för moderna vårdflöden

MediTrack är en fullstack-prototyp för att hantera läkemedelsregister, beställningar och lagerstatus per vårdenhet. Jag har prioriterat tydliga flöden, enkelhet för stressade vårdanvändare och en arkitektur som går att prata om, utmana och vidareutveckla.

## Min tolkning av caset

Jag har tolkat MediTrack som ett internt verktyg för vårdenheter som behöver beställa läkemedel till sitt lokala lager. Därför betyder vald vårdenhet: **den vårdenhet som ska få leveransen**.

- När en order skapas, skickas eller bekräftas ändras inte lagret.
- När ordern markeras som `Levererad` ökar lagret för just den valda vårdenheten.
- Om systemet senare även ska hantera förbrukning/utdelning till patienter bör det modelleras som separata stock events, inte blandas ihop med beställningsflödet.

Det här valet gjorde jag för att flödet ska vara lätt att förstå och för att minska risken för fel i ett patientsäkerhetsnära system.

## Varför jag byggde lösningen så här

Casebeskrivningen handlar inte bara om CRUD, utan om patientsäkerhet: rätt information behöver nå rätt person i rätt tid. Därför valde jag att lägga tyngdpunkten på:

- **Tydlig beställningsprocess**: Utkast -> Skickad -> Bekräftad -> Levererad.
- **Lager per vårdenhet**: samma läkemedelsregister, men lokala lagersaldon och miniminivåer.
- **Automatisk lageruppdatering vid leverans**: för att undvika manuella fel.
- **Varningar vid lågt lagersaldo**: tydligt i UI och i AI-insikterna.
- **Audit log**: eftersom vårdkontexten kräver spårbarhet.
- **AI-beslutsstöd**: prediktiva påfyllnadsförslag baserade på historisk förbrukning.

## Tech stack

### Frontend

- React + TypeScript + Vite
- CSS utan tungt UI-bibliotek, för att visa egna UX-val och hålla prototypen snabb
- Lokal state management med tydliga API-anrop, eftersom appens komplexitet inte kräver Redux eller global state ännu

### Backend

- Node.js 22.16+ / Node 24 rekommenderas + Express + TypeScript
- SQLite via Nodes inbyggda `node:sqlite`
- Zod för validering
- Tydlig separation mellan routes, services och repositories
- Node test runner för testning

Jag valde TypeScript i både frontend och backend för att få bättre kontrakt kring läkemedel, vårdenheter, beställningsrader och statusövergångar. Medovias stack nämner TypeScript och React som relevant, och lösningen ligger nära min egen erfarenhet från frontend, UX och API-nära utveckling.

## Funktioner

### Obligatoriskt

- Lista läkemedel med namn, ATC-kod, form, styrka, lokalt lagersaldo och threshold.
- Lägg till, redigera och ta bort läkemedel.
- Sök och filtrera på namn, ATC-kod och form.
- Skapa beställning med flera läkemedelsrader.
- Statusflöde: Utkast -> Skickad -> Bekräftad -> Levererad.
- Beställningshistorik per vårdenhet.
- Automatisk lageruppdatering när order blir Levererad.
- Varning när läkemedel ligger under definierad miniminivå.

### Extra funktioner

- AI-driven påfyllnadsrekommendation baserad på historiska stock events.
- Audit log som visar vem som gjorde vad och när.
- In-app-varningar för lågt lager.
- CSV-export av beställningshistorik.
- Mockad rollhantering via headers/rollväljare: sjuksköterska, apotekare, admin.

## Kom igång lokalt

### Rekommenderad Node-version

Projektet använder Nodes inbyggda SQLite-modul. Använd därför Node 22.16+ eller helst Node 24.

```bash
node -v
```

Om du får problem i PowerShell på Windows kan du köra `npm.cmd` i stället för `npm`, t.ex. `npm.cmd install`.


```bash
npm install
npm run seed
npm run dev
```

Öppna sedan:

- Frontend: http://localhost:5173
- Backend health check: http://localhost:4000/health

Om du har kört en äldre version av projektet och databasen känns fel kan du återställa testdatan med:

```bash
npm run reset
```


## Demoanvändare / roller

I UI finns en rollväljare högst upp. Den skickar enkla headers till API:t:

- `nurse` - kan skapa beställningar och följa flödet.
- `pharmacist` - kan hantera läkemedel och leverera beställningar.
- `admin` - kan göra allt, inklusive radera läkemedel.

Detta är **inte riktig autentisering**, utan en medveten avgränsning för att visa hur auktorisering skulle kunna kopplas in senare.

## API-exempel

```bash
curl "http://localhost:4000/api/medications?careUnitId=unit-city"
curl "http://localhost:4000/api/orders?careUnitId=unit-city"
curl "http://localhost:4000/api/ai/replenishment-suggestions?careUnitId=unit-city"
```

Skapa order:

```bash
curl -X POST http://localhost:4000/api/orders \
  -H "Content-Type: application/json" \
  -H "x-user-name: Suzana" \
  -H "x-user-role: nurse" \
  -d '{
    "careUnitId": "unit-city",
    "lines": [
      { "medicationId": "med-paracetamol", "quantity": 30 },
      { "medicationId": "med-insulin", "quantity": 10 }
    ]
  }'
```

## Arkitektur

```text
apps/
  api/
    src/
      db/             SQLite schema + seed
      middleware/     request context, errors, validation
      repositories/   SQL och persistence
      routes/         REST endpoints
      services/       affärslogik, statusflöde, AI-insikter
      tests/          Node test runner
  web/
    src/
      api/            fetch-klient
      components/     UI-komponenter
      App.tsx         vylogik och sammansättning
```

Jag har försökt hålla affärslogiken i backend services, inte i routes eller frontend. Det gör det lättare att testa och lättare att byta databas eller frontend senare.

## Datamodell

- `care_units` - vårdenheter.
- `medications` - läkemedelsregister med namn, ATC, form och styrka.
- `inventory_levels` - lagersaldo och threshold per vårdenhet och läkemedel.
- `orders` - beställningens huvuddata och status.
- `order_lines` - läkemedel och kvantitet per order.
- `stock_events` - historik för lagerförändringar per vårdenhet, används även av AI-insikten.
- `audit_logs` - spårbarhet för viktiga ändringar.

Jag separerade `medications` från `inventory_levels` eftersom samma läkemedel kan finnas på flera vårdenheter men med olika lokalt saldo och olika miniminivå. Det gör också lösningen enklare att skala från en vårdenhet till många.

## Statusflöde och concurrent updates

Orderstatus får bara gå framåt:

```text
Utkast -> Skickad -> Bekräftad -> Levererad
```

När en order markeras som `Levererad` uppdateras lagersaldot för orderns vårdenhet i samma transaktion som statusändringen. Backend gör dessutom en villkorad update:

```sql
UPDATE orders SET status = ? WHERE id = ? AND status = ?
```

Det minskar risken att två samtidiga requests levererar samma order två gånger. I produktion hade jag kompletterat med ännu tydligare transaktionsnivå/row locking beroende på databas, t.ex. PostgreSQL och `SELECT ... FOR UPDATE`.

## AI-funktion

Jag implementerade **prediktiv påfyllnad**: systemet analyserar historiska stock events per vårdenhet och räknar fram genomsnittlig daglig förbrukning, dagar till beräknad brist och rekommenderad beställningsmängd.

Det är medvetet byggt utan extern LLM-nyckel för att projektet ska gå att köra lokalt direkt. Jag valde bort en halvfärdig chattassistent i UI:t, eftersom ett vårdverktyg hellre ska ha få men pålitliga beslutsstöd än många osäkra features. Om jag skulle fortsätta hade jag lagt till en LLM-adapter ovanpå samma domändata, med tydliga guardrails, källhänvisningar och loggning.

## Testning

Kör:

```bash
npm test
```

Testet fokuserar på den viktigaste patientsäkerhetsnära logiken: att lagersaldo för rätt vårdenhet bara uppdateras när en order går till `Levererad`, och att statusflödet inte kan hoppa fritt.

## Kända brister och vad jag hade gjort med mer tid

- Byta SQLite mot PostgreSQL för bättre concurrency och produktionsliknande transaktioner.
- Implementera riktig autentisering med OIDC/BankID/SAML beroende på vårdkontext.
- Mer testtäckning: API-integrationstester, frontendtester och edge cases kring parallella uppdateringar.
- Mer tillgänglighetstestning med skärmläsare och tangentbordsflöde.
- Mer avancerad AI: LLM-baserad assistent med retrieval från audit/order/lagerdata, men endast med tydliga säkerhetsgränser, källor och mänskligt godkännande.
- Behörighetsmodell per vårdenhet, inte bara global roll.
- Pagination och server-side sorting när datamängden växer.
- Soft delete/inaktivering av läkemedel i stället för hård radering.

## Det jag är mest nöjd med

Jag är mest nöjd med att lageruppdateringen inte ligger i frontend. Frontend visar flödet, men backend äger den kritiska affärslogiken: statusövergångar, transaktioner, audit log och stock events. Det är viktigt i ett vårdflöde där UI-fel eller dubbla klick inte ska skapa fel lagerstatus.

## Det jag hade förbättrat först

Jag hade först förbättrat autentisering/auktorisering och concurrency för en mer produktionsnära lösning. Just nu är rollhanteringen mockad för att visa tänket, men i en riktig vårdmiljö behöver behörighet, spårbarhet och säkerhet vara mycket mer robust.
