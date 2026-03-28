# spark.date — AI-Powered Speed Dating App

A full-stack speed dating cross-match app with a Naive Bayes match predictor trained on the **Columbia University Speed Dating Experiment** dataset (Fisman et al., 2006).

## Features

- **Register** — name, age, self-rate 6 personality attributes, set preference weights
- **Rate Others** — see all registered users, rate each on 6 attributes
- **Results** — match probabilities for every pair: P(I like them), P(they like me), P(mutual), sorted by mutual probability
- **Host Dashboard** (`/host`) — see all registrations, rating matrix, self-rating stats, reset button

## Match Prediction Model

Uses a **Gaussian Naive Bayes** classifier — no external ML libraries needed, pure JS.

**Training data:** ~8,000 speed dates from Columbia University (2002–2004)  
**Reference:** Fisman, R., Iyengar, S., Kamenica, E., & Simonson, I. (2006). *Gender differences in mate selection.* The Quarterly Journal of Economics, 121(2), 673–697.

**21 features per prediction:**
- How you rated them (attr, sinc, intel, fun, amb, shar)
- How they rated you (attr_o … shar_o)
- Interest correlation (fixed at 0.21, population mean)
- Both ages
- Your preference importance weights

**Match threshold:** P ≥ 0.30

## Tech Stack

- **Next.js 14** (Pages Router)
- **TypeScript**
- **Tailwind CSS** (dark theme, custom design system)
- **Vercel KV** (Redis-backed key-value store)

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Set up Vercel KV credentials
cp .env.local.example .env.local
# Fill in values from Vercel dashboard → your project → Storage → KV → .env.local

# 3. Run dev server
npm run dev
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Import into [vercel.com](https://vercel.com)
3. In your Vercel project: **Storage → Create → KV Database → Link to project**
4. Vercel auto-injects all KV environment variables
5. Deploy — done!

## KV Key Schema

| Key | Type | Description |
|-----|------|-------------|
| `user:{uuid}` | JSON | UserProfile object |
| `ratings:{userId}` | JSON | RatingSet — map of targetId → attribute scores |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Registration — profile + self-ratings + preference weights |
| `/rate` | Rate all other registered users |
| `/results` | Your match probabilities, sorted by mutual chance |
| `/host` | Host admin — participant list, rating matrix, reset |

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/users` | List all users |
| `GET` | `/api/users?id=:id` | Get single user |
| `POST` | `/api/users` | Register new user |
| `GET` | `/api/ratings?userId=:id` | Get ratings by a user |
| `POST` | `/api/ratings` | Save/merge ratings |
| `DELETE` | `/api/reset` | Clear all KV data |
