# Sunsettings Architecture (NFT, Base Smart Wallet + Paymaster + Pinata)

Purpose: Users capture sunsets, we analyze conditions, and mint on Base as NFTs with gas sponsorship for a smooth UX. Metadata is stored on IPFS (Pinata). Galleries are rendered by reading wallet NFTs and token metadata.

## Summary
- **Identity/Wallet**: Coinbase Smart Wallet via OnchainKit on Base. Gasless UX using Base paymasters (`Transaction isSponsored`).
- **Photos & Metadata**: Photo files pinned to IPFS (Pinata). JSON metadata (image, attributes) pinned as well.
- **On-chain**: ERC‑721 contract (see `sunsettings_base/sunsettings-nft/contracts/SunsettingsPhoto.sol`). Mint called from the client via OnchainKit.
- **AI**: Server endpoint `/api/sunset-analyze` calls OpenAI to produce a prediction/description.
- **Location**: Client shows rounded/blurred coordinates and human-readable labels. Precise GPS is not stored server-side.

## Components
- **Web App (Next.js App Router)**
  - UI in React/Tailwind; Mapbox for map; shadcn/Radix components.
  - Wallet & transactions: `@coinbase/onchainkit` + `wagmi` + `viem`.
  - NFT mint UI uses `Transaction` with `isSponsored` for paymaster-backed gasless UX.
  - Location resolver prefers Base Mini App context, then browser geolocation, then IP (see below).

- **Backend API (Next.js Route Handlers)**
  - Pinata uploads: `POST /api/pinata/upload-file`, `POST /api/pinata/upload-json`.
  - Reverse geocoding: `POST /api/geocode/reverse`.
  - IP geolocation: `GET /api/geo/ip`.
  - Sunset analysis: `POST /api/sunset-analyze` (OpenAI).
  - Wallet NFTs view: `GET /api/wallet-nfts` (resolves tokenURIs and images via RPC and gateways).

- **Storage**
  - IPFS via Pinata for photo assets and metadata (CIDv1).
  - No app database required for the NFT path; galleries are derived from chain + IPFS.

## Minting Flow (Base)
1. User selects/detects location and captures a photo.
2. Client pins the image to Pinata (`/api/pinata/upload-file`).
3. Client creates metadata JSON (image, time, coarse location label/center, AI description/probability) and pins via `/api/pinata/upload-json`.
4. Client mints the NFT by calling the ERC‑721 contract using OnchainKit `Transaction isSponsored` (gas covered via Base paymaster).
5. The gallery/profile reads NFTs using `GET /api/wallet-nfts`, which resolves tokenURIs and images.

## Mini App Location Resolution (Base‑first, short)
- Resolver: `src/lib/location.ts#getPreferredLocation()`.
- Order: Mini App context → browser geolocation → IP fallback.
- Used by: `src/components/ai/UploadPhotoPanel.tsx`, `src/components/ui/location-combobox/hooks.ts`.
- Privacy: do not persist raw GPS server-side; present rounded/blurred center and labels in UI.

## Security & Privacy
- Secrets only on server (Pinata JWT, OpenAI key).
- Content limits and basic validation for uploads.
- Do not store precise GPS in backend responses or logs.

## Observability
- Log API errors (Pinata/OpenAI/RPC) with minimal payloads.
- Cache reads in `wallet-nfts` endpoint to reduce RPC and gateway calls.

## Scalability
- IPFS CIDs cacheable via gateways; token metadata fetched with limited concurrency.
- Read NFTs via multicall where possible, fallback sequentially.
