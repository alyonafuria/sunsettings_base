# Sunsettings Tech Stack

This document captures the concrete technologies and services used to build Sunsettings.

## Client (Primary)
- **Platform**: React (mobile-first web app with PWA)
  - Bundler: Vite.
  - Routing: React Router.
  - State: React Query/Zustand/Redux (lightweight preferred).
  - PWA: Web App Manifest + Service Worker (Workbox) for installability and offline caching of gallery data.
- **UI**: neobrutalism.dev components and style principles (high contrast, chunky borders, playful).
- **Maps**: Mapbox GL JS for rendering maps and markers.
- **Geocoding**: Mapbox Geocoding API for neighborhood/city labels (e.g., "Pankow, Berlin").
- **Wallet/AA**: Coinbase Smart Wallet Web SDK (Base smart account)
  - EIP-712 typed data signing via viem or ethers v6.
  - Server verifies signatures (EOA recovery or EIP-1271; support EIP-6492 envelopes).
- **Networking**: `fetch`/`axios` for API calls to backend.
- **Media**: Browser file input + client-side SHA-256 hashing for `fileHash` pre-checks.

## Backend (Next.js Route Handlers)
- **Framework**: Next.js (App Router) with server routes under `/api/*`.
- **APIs**:
  - `POST /api/auth/challenge` – per-user nonce issuance.
  - `POST /api/pin` – secure Pinata pinning using server-side JWT, returns `{ cid, fileHash }`.
  - `POST /api/claim` – verifies EIP-712 claim and writes record to DB (with optional location + score).
  - `GET /api/gallery/:address` – list photos by address.
  - `GET /api/stats/:address` – sunset count and basic stats.
- **Runtimes**:
  - Use Node.js runtime for routes needing file streams/crypto (e.g., `/api/pin`, `/api/claim`).
  - Edge runtime optional for read-only endpoints if desired.
- **Authorship verification**:
  - EOA: recover address from EIP-712 signature.
  - Smart Account: call `isValidSignature` (EIP-1271) on the account; unwrap EIP-6492 if present.
- **Storage**:
  - Pinata SDK (IPFS) for photo blobs (CIDv1 base32).
  - Postgres for relational data (users, photos, indices).
  - ORM: Prisma or Drizzle (migration + schema management).
- **Location handling**:
  - Persist only blurred location: center lat/lon + radius (500–1000m) and/or geohash (precision 6–7).
  - Derive `location_label` via Mapbox Geocoding API (neighborhood/city) for display.
- **Weather/Score**:
  - Brightsky (https://brightsky.dev/) as the weather/astronomy data source.
  - OpenAI API to compute or validate the sunset beauty score using weather features/context.
- **Security**:
  - Rate limiting per IP/address.
  - Strict CORS; only allow app origin.
  - Secrets in environment variables (Pinata JWT, Mapbox token, OpenAI key).
  - Replay protection with nonces and deadlines; uniqueness on `file_hash`.
- **Observability**:
  - Structured logs for claim verification, Pinata uploads, Brightsky/Mapbox calls.
  - Basic metrics: uploads/day, claim success rate, latency, dedup collisions.

## Database (Postgres)
- **Provider**: Supabase (hosted Postgres)
- **Tables**: `users`, `photos`.
- **Indices**:
  - `photos(file_hash)` unique.
  - `photos(address, timestamp_sec desc)` for galleries.
  - `photos(location_geohash)` for spatial bucketing (optional).
- **Access**: Supabase JS client (server-side) for SQL or RPC; optional ORM (Drizzle) for schema/migrations.
- **Migrations**: Drizzle or Supabase SQL migrations.

## Hosting/Infra
- **Deployment**: Vercel (first-class for Next.js). HTTPS for PWA service worker.
- **Database**: Supabase (Postgres) as primary DB.
- **IPFS**: Pinata for pinning and gateway.

## Optional: Secondary Native Client (React Native)
- If we add native apps later:
  - **Platform**: React Native (Expo).
  - **Wallet**: Coinbase Smart Wallet via WalletConnect or native SDK.
  - **Maps**: `@rnmapbox/maps`.
  - **Media/Hashing**: `expo-image-picker`, `expo-crypto`.

## Mapbox specifics
- **Rendering**: Mapbox GL JS with clustering for dense areas.
- **Privacy**: never render raw precise GPS; use blurred center + radius and neighborhood label.
- **Cost control**: cache reverse geocoding results; debounce map updates.

## Third-party keys
- **Mapbox**: public token in client; rotate if leaked.
- **OpenAI**: server-side only; never expose in client.
- **Pinata**: server-side JWT only.

## Future considerations
- Native app wrapper (Capacitor/Ionic/React Native Web) if we want app-store presence.
- Optional on-chain anchoring later using the same EIP-712 claim format.
- Paymasters/session keys if we later add on-chain actions while keeping UX gasless.
