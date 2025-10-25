# Sunsettings Tech Stack

This document captures the concrete technologies and services used to build Sunsettings.

## Client (Primary)
- **Platform**: Next.js (App Router) mobile-first web app
  - Routing: Next.js App Router.
  - State/query: `@tanstack/react-query` where needed.
  - PWA: Web App Manifest; service worker optional.
- **UI**: TailwindCSS v4 + shadcn-style primitives (Radix UI)
  - High-contrast, bold borders; accessible components.
- **Maps**: Mapbox GL JS for map rendering and markers.
- **Geocoding & Search**: Nominatim (OpenStreetMap) for search and reverse geocoding to neighborhood/city labels.
- **Mini App SDK**: `@farcaster/miniapp-sdk`
  - Environment detection via `useMiniAppContext()`.
  - Base-aware location resolver: `getPreferredLocation()` prefers Mini App context, then browser geolocation, then IP.
- **Wallet/AA**: `@coinbase/onchainkit` + `wagmi` on Base
  - EIP-712 signing via `viem`.
  - Server verifies signatures (EOA, EIP-1271; EIP-6492 if applicable).
  - Smart Wallet UX with gas sponsorship via Base paymaster using OnchainKit `Transaction` with `isSponsored`.
- **Networking**: native `fetch` for backend APIs.
- **Media**: Browser file input + client-side SHA-256 hashing for `fileHash`.

## Backend (Next.js Route Handlers)
- **Framework**: Next.js (App Router) with Route Handlers under `src/app/api/*`.
- **APIs (current)**:
  - `GET /api/geo/ip` – IP-based coarse geolocation.
  - `POST /api/geocode/reverse` – reverse geocoding to a human-readable label.
  - `POST /api/sunset-analyze` – server-side OpenAI call to analyze weather summary and return a sunset prediction.
  - Additional endpoints may be added as features ship.
- **Runtimes**:
  - Node.js runtime for API routes.
  - Server-side AI: implemented in `src/lib/ai/services/SunsetAIService.ts` and consumed by `src/app/api/sunset-analyze/route.ts`.
- **On-chain interactions**:
  - Client mints or calls contracts using `@coinbase/onchainkit/transaction` components.
  - Example: see `src/components/ai/UploadPhotoPanel.tsx` `Transaction` with `isSponsored` for paymaster-backed gasless UX on Base.
- **Storage**:
  - Pinata SDK (IPFS) for photo content (CIDv1 base32).
- **Location handling**:
  - Client persists only blurred/rounded coordinates on the client side for display.
- **Security**:
  - Secrets in environment variables (Pinata JWT, Mapbox token).

## Database
- Not used at the moment.

## Hosting/Infra
- **Deployment**: Vercel (first-class for Next.js).
- **IPFS**: Pinata for pinning and gateway.

## Mapbox specifics
- **Rendering**: Mapbox GL JS.
- **Privacy**: prefer blurred/rounded presentation of coordinates.

## Third-party keys
- **Mapbox**: public token in client; rotate if leaked.
- **Pinata**: server-side JWT only.
- **OpenAI**: server-side only; API key required for `/api/sunset-analyze`.
