# Competitive Intelligence Dashboard

A production-ready business intelligence dashboard for tracking competitor stock performance across major technology companies. The project is designed for Vercel deployment and includes a secure serverless API, professional high-contrast UI, and CSV export tooling for reports.

## Features

- **Serverless stock API** (`/api/stocks.js`) that fetches prices for Apple, Microsoft, Google, Meta, and Amazon via API Ninjas with robust error handling and graceful partial responses.
- **Responsive dashboard** (`index.html`) with loading, warning, and error states; data refresh and CSV export controls; and accessible high-contrast visuals suitable for executive presentations.
- **Intelligent insights** including automatic highlighting of highest/lowest performers and contextual change indicators relative to peer averages.
- **WCAG-friendly design** with keyboard-accessible controls, reduced-motion support, and optimized layouts for mobile and desktop presentations.

## Getting Started

### 1. Prerequisites

- [Vercel CLI](https://vercel.com/docs/cli) (`npm install -g vercel`) or use `npx vercel` commands.
- Node.js 18 or later (for native `fetch` support in serverless functions).

### 2. Environment variables

Create a `.env.local` file in the project root (Vercel automatically picks this up) and add your API Ninjas key:

```bash
# .env.local
API_KEY=sS5fygzw6GdXzdn6UCgi2w==UuQyP6ZQyAycFmLs
```

> 🔐 The `API_KEY` is read on the server only. Never expose it in client-side code.

The serverless function ships with the same key configured as a safe fallback for quick demos, but you should replace it with your own credential from [API Ninjas](https://api-ninjas.com/api/stockprice) before deploying to production.

### 3. Run locally with Vercel

```bash
npx vercel dev
```

The dashboard will be available at `http://localhost:3000` and the serverless endpoint at `http://localhost:3000/api/stocks`.

### 4. Refreshing data

Use the **Refresh Data** button to fetch the latest stock information on demand. The dashboard displays a timestamp for each fetch and warns you if any ticker data could not be retrieved.

### 5. Exporting data

Select **Export to CSV** to download the current dataset, including company names, tickers, formatted prices, and timestamps. The file is automatically timestamped for easy archival in presentations or spreadsheets.

## Deployment

1. Log in to Vercel and create a new project pointing to this repository.
2. In the Vercel dashboard, add the `API_KEY` environment variable (same value as in `.env.local`).
3. Trigger a deployment. Vercel will host `index.html` as the static frontend and `/api/stocks.js` as a serverless function.

## Data source

Stock prices are sourced from the [API Ninjas Stock Price API](https://api.api-ninjas.com/v1/stockprice). Each request is wrapped with timeouts, schema validation, and partial-error reporting to keep the dashboard resilient even if individual ticker lookups fail.

## Accessibility & design notes

- High contrast palette with semantic accent colors for positive/negative signals.
- Responsive grid/table layouts that remain legible on tablets and phones.
- Animated loading spinner respects `prefers-reduced-motion`.
- Status region uses `aria-live="polite"` for assistive technology compatibility and communicates partial failures when they occur.

## Project structure

```
.
├── api/
│   └── stocks.js    # Serverless function that gathers and normalizes stock data
├── index.html       # Dashboard UI, fetch logic, and CSV export controls
└── README.md        # Project documentation
```

---

Need help extending the dashboard (e.g., additional tickers or new visualizations)? Update `COMPANIES` in `api/stocks.js` and adjust the frontend rendering logic as required.
