# VastuPlan

Vastu-aligned concept floor plans for Indian homes. Enter a plot size and facing; get three ranked layouts drawn to scale with furniture, an interactive plan, a 3D model you can walk into, a rule-by-rule Vastu and building-code report, and interior schemes. Apartments get a room-by-room Vastu audit and furnished layouts.

## How the engine works (`src/engine`)
- **Program** (`program.ts`): rooms and architects' size ranges for the chosen BHK, floors and extras.
- **Layout** (`layout.ts`, `design.ts`): the house is planned in front / middle / rear bands. Every assignment of flexible rooms to bands and every ordering within a band is tried at real sizes; extra depth stays open on the north/east. Plans with an unreachable room are discarded. Runs in a Web Worker.
- **Openings** (`openings.ts`): main door in the auspicious padas (E3–E4, S3–S4, W3–W4, N3–N5), interior doors off the hall, windows on outside walls.
- **Scoring** (`checks.ts`, `vastu.ts`): Vastu rules (entrance, kitchen SE, master SW, pooja NE, toilets, Brahmasthan, stairs, sleeping and cooking direction, open space) and livability (access, NBC 2016 minimum sizes, daylight, ventilation, proportions).
- **Furniture** (`furniture.ts`) and **interiors** (`interior.ts`): furniture to scale with Vastu orientation; six styles with zone-based wall colours.

`npm test` runs 29 engine tests across facings, plot sizes, BHK and G+1 (rooms tile the footprint, no overlaps, all rooms reachable, furniture inside rooms).

## Ask the architect (Gemini)
`worker/` is a Cloudflare Worker that keeps the Gemini key server-side.
```
cd worker && npx wrangler deploy && npx wrangler secret put GEMINI_API_KEY
```
Then set the repository variable `VITE_ASK_URL` to the worker URL. Without it, the site answers from the plan itself.

## Run and deploy
```
npm install && npm run dev        # http://localhost:5173/vastuplan/
npm test && npm run build
```
GitHub Pages: Settings → Pages → Source: GitHub Actions. The workflow in `.github/workflows/deploy.yml` tests, builds and deploys `main`.

## Disclaimer
Concept plans only. Setbacks and FAR vary by authority (CMDA, DTCP, BBMP…). A licensed architect must prepare approval drawings and a structural engineer must design the structure.
