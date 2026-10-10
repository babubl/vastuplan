# VastuPlan

Vastu-aligned concept floor plans for Indian homes. Enter a plot size and facing; get three ranked layouts drawn to scale with furniture, an interactive plan, a 3D model you can walk into, a rule-by-rule Vastu and building-code report, and interior schemes. Apartments get a room-by-room Vastu audit and furnished layouts.

## How the engine works (`src/engine`)
- **Program** (`program.ts`): rooms and architects' size ranges for the chosen BHK, floors and extras.
- **Layout** (`layout.ts`, `design.ts`): the house is planned in front / middle / rear bands. Every assignment of flexible rooms to bands and every ordering within a band is tried at real sizes; extra depth stays open on the north/east. Plans with an unreachable room are discarded. Runs in a Web Worker.
- **Openings** (`openings.ts`): main door in the auspicious padas (E3–E4, S3–S4, W3–W4, N3–N5), interior doors off the hall, windows on outside walls.
- **Scoring** (`checks.ts`, `vastu.ts`): Vastu rules (entrance, kitchen SE, master SW, pooja NE, toilets, Brahmasthan, stairs, sleeping and cooking direction, open space) and livability (access, NBC 2016 minimum sizes, daylight, ventilation, proportions).
- **Furniture** (`furniture.ts`) and **interiors** (`interior.ts`): furniture to scale with Vastu orientation; six styles with zone-based wall colours.

`npm test` runs the engine tests across facings, plot sizes, BHK and G+1 (rooms tile the footprint, no overlaps, all rooms reachable, furniture inside rooms).

## Ask the architect (Gemini) and feedback
`worker/` is a Cloudflare Worker that keeps the Gemini key server-side and stores feedback in Workers KV.

| Route | What it does |
| --- | --- |
| `POST /ask` | Sends the conversation and a plan summary to Gemini (`GEMINI_MODEL`, default `gemini-flash-latest`) |
| `POST /feedback` | Stores a feedback note in KV for one year (hashed IP, no raw IP) |
| `GET /feedback?token=…` | Lists the latest 200 notes; needs `FEEDBACK_ADMIN_TOKEN` |
| `GET /health` | `{ ok, ai, feedback }` |

The deploy workflow sets it all up when these **repository secrets** exist (Settings → Secrets and variables → Actions):

- `CLOUDFLARE_API_TOKEN`: a Cloudflare API token from the "Edit Cloudflare Workers" template, with **Workers KV Storage: Edit** added.
- `CLOUDFLARE_ACCOUNT_ID`: from the Cloudflare dashboard sidebar.
- `GEMINI_API_KEY`: from Google AI Studio (aistudio.google.com → Get API key).
- `FEEDBACK_ADMIN_TOKEN` (optional): any long random string; lets you read feedback at `<worker-url>/feedback?token=…`.

On the next push to `main`, the workflow creates the `vastuplan-feedback` KV namespace, deploys the worker, sets its secrets and builds the site with `VITE_ASK_URL` pointing at it. Without the secrets the site still works: Ask answers from the plan itself and feedback opens a GitHub issue. Allowed origins are set in `worker/wrangler.toml` (`ALLOWED_ORIGINS`); add your domain there when you move.

## Run and deploy
```
npm install && npm run dev        # http://localhost:5173/vastuplan/
npm test && npm run build
```
GitHub Pages: Settings → Pages → Source: GitHub Actions. The workflow in `.github/workflows/deploy.yml` tests, builds and deploys `main`.

`npm run build` also runs `scripts/postbuild.mjs`, which writes a page per route with its own title, description and link-preview tags, plus `404.html`, `sitemap.xml` and `robots.txt`. Set the repository variable `VITE_SITE_URL` (and `BASE_PATH`, e.g. `/` for a custom domain) when the site moves. The link-preview image is `public/og.png`.

Architect's sweep across plot sizes, facings and BHKs (slow; prints failed checks per case):
```
SWEEP=1 SWEEP_OUT=sweep.txt npx vitest run src/gen/sweep
```

## Disclaimer
Concept plans only. Setbacks and FAR vary by authority (CMDA, DTCP, BBMP…). A licensed architect must prepare approval drawings and a structural engineer must design the structure.

## Plot studies
The homepage studies are drawn by the engine. After changing the engine, regenerate them:
```
GEN_STUDIES=1 npx vitest run src/gen
```
