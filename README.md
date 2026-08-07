# ProcureGuard AI

Government procurement fraud detection and network analysis. Upload a tender/bid dataset
(CSV or Excel) and ProcureGuard builds a vendor–director–tender relationship graph, runs a
multi-rule fraud detection engine, scores every vendor 0–100, and generates a plain-English
investigation dossier explaining exactly why each company was flagged.

Runs entirely in the browser — no backend, no API keys, no data leaves the user's machine.

## Run locally

```bash
npm install --legacy-peer-deps
npm run dev
```

Open http://localhost:3000 and click **Load Demo Dataset**.

## Build

```bash
npm run build      # outputs to dist/public
npm run preview
```

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes to
GitHub Pages. Enable it once under **Settings → Pages → Source → GitHub Actions**.

The workflow sets `BASE_PATH` to the repository name so assets resolve under
`https://<user>.github.io/<repo>/`, and copies `index.html` to `404.html` so client-side
routes load on direct navigation.

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · ECharts · vis-network · SheetJS (xlsx)
