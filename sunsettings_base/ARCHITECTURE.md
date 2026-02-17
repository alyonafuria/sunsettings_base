# Sunsettings Architecture Documentation

## Overview

Sunsettings is a Next.js web application that combines sunset photography with AI-powered quality analysis and NFT minting capabilities. The application allows users to analyze sunset quality at any location, upload sunset photos to IPFS, and mint them as NFTs on the Base blockchain.

## Technology Stack

### Frontend Framework
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5.9** - Type safety
- **Tailwind CSS 4** - Utility-first styling
- **Radix UI** - Accessible component primitives

### Mapping & Geospatial
- **Mapbox GL JS** - Interactive maps and photo pin visualization
- **H3-js** - Hexagonal hierarchical geospatial indexing
- **Open-Meteo API** - Weather data and sunset calculations

### AI & Machine Learning
- **OpenAI GPT-4o-mini** - Sunset quality analysis and description generation
- **Custom prompts** - Specialized for sunset scoring and descriptions

### Web3 & Blockchain
- **Privy** - Authentication and smart wallet management
- **Base Network** - Ethereum L2 for NFT minting
- **Wagmi/Viem** - Ethereum wallet integration
- **Smart Wallets** - Gasless transactions with paymaster
- **ERC-721 NFTs** - Sunset photo NFT contracts

### Storage & IPFS
- **Pinata** - IPFS pinning service for photo and metadata storage
- **Custom gateway** - Optimized IPFS content delivery

### Social Platform
- **Farcaster Mini App SDK** - Social platform integration
- **OAuth authentication** - Google and email login via Privy

## Core Components

### 1. Authentication Layer
- **Privy Provider**: Manages user authentication and smart wallets
- **OAuth Methods**: Google OAuth + email authentication (wallet method removed)
- **Smart Wallet Creation**: Automatic wallet creation for new users
- **Session Management**: Persistent authentication across app reloads

### 2. Geospatial System
- **Location Services**: Coordinate resolution from user input via Nominatim
- **Map Interface**: Interactive map with photo pin visualization using Mapbox
- **H3 Grid System**: Hexagonal indexing for efficient spatial queries
- **Sunset Calculations**: Precise sunset time predictions via Open-Meteo API

### 3. AI Analysis Engine
- **Weather Integration**: Real-time weather data collection from Open-Meteo
- **Sunset Scoring**: AI-powered quality assessment (1-5 scale) via OpenAI
- **Description Generation**: Poetic and descriptive text generation
- **Caching System**: Server-side TTL cache for weather data (5 minutes)

### 4. Photo Management
- **Upload Pipeline**: Image processing and EXIF data extraction
- **IPFS Storage**: Decentralized photo and metadata storage via Pinata
- **Geospatial Indexing**: Location-based photo organization
- **Quality Scoring**: Both AI-generated and user-submitted scores

### 5. NFT Minting System
- **Smart Contract Integration**: Base network ERC-721 contracts
- **Gasless Transactions**: Paymaster-sponsored minting
- **Metadata Standards**: ERC-721 compliant metadata structure
- **Batch Operations**: Efficient multi-transaction handling

## Data Flow Architecture

### Sunset Analysis Flow
```
User Location → Weather API → AI Analysis → Sunset Score → UI Display
     ↓              ↓            ↓             ↓           ↓
Coordinates → Open-Meteo → OpenAI GPT → 1-5 Rating → Flip Card
```

### Photo Upload Flow
```
Photo Upload → Processing → IPFS Upload → Metadata Store → Map Pin → NFT Mint
      ↓           ↓          ↓            ↓           ↓        ↓
  Image File → EXIF Data → Pinata → JSON Metadata → Map Canvas → Base Network
```

### Authentication Flow
```
User Login → Privy Auth → Smart Wallet → Session Store → Web3 Ready
     ↓           ↓          ↓           ↓           ↓
Google/Email → OAuth Token → Wallet Creation → Local Storage → Wagmi Client
```

## API Architecture

### RESTful Endpoints
- `/api/weather` - Weather data and sunset calculations
- `/api/sunset-analyze` - AI-powered sunset analysis
- `/api/photos` - Photo metadata retrieval and management
- `/api/pinata/upload-file` - IPFS file upload operations
- `/api/pinata/upload-json` - IPFS JSON metadata upload
- `/api/wallet-nfts` - User NFT collection queries
- `/api/geo/ip` - IP-based geolocation
- `/api/geocode/reverse` - Reverse geocoding from coordinates

### Caching Strategy
- **Server-side TTL**: 5-minute cache for weather data
- **Client-side Storage**: localStorage for user preferences and sunset probability
- **IPFS Gateway**: Optimized content delivery through Pinata
- **Static Generation**: Pre-built pages for better performance

## Security Architecture

### Authentication Security
- **Privy SDK**: Enterprise-grade authentication
- **OAuth 2.0**: Secure third-party authentication
- **Session Management**: Secure token handling
- **Smart Wallet Security**: Hardware-backed key management

### Data Security
- **IPFS Storage**: Decentralized, tamper-resistant storage
- **Environment Variables**: Secure API key management
- **CORS Configuration**: Proper cross-origin security
- **Input Validation**: Comprehensive data sanitization

### Web3 Security
- **Contract Audits**: Verified smart contract integration
- **Gas Limit Protection**: Safe transaction parameters
- **Paymaster Security**: Sponsored transaction validation
- **Network Isolation**: Base network mainnet/sepolia separation

## Performance Architecture

### Frontend Optimization
- **Code Splitting**: Route-based component loading
- **Image Optimization**: Next.js Image component usage
- **Font Optimization**: Local font loading with custom fonts (runefa.otf, IndieFlower)
- **Bundle Analysis**: Optimized dependency management

### Backend Performance
- **Edge Caching**: Vercel Edge Network utilization
- **API Rate Limiting**: Protection against abuse
- **Memory Management**: Server-side caching strategies
- **Turbopack**: Fast development builds

### Web3 Performance
- **RPC Optimization**: Alchemy endpoint usage
- **Transaction Batching**: Efficient gas usage
- **State Caching**: Wallet and contract state optimization
- **Network Selection**: Base L2 for lower gas fees

## Deployment Architecture

### Hosting Infrastructure
- **Vercel Platform**: Primary hosting and deployment
- **Edge Network**: Global content delivery
- **Environment Management**: Development/staging/production separation
- **Monitoring**: Vercel Analytics integration

### Blockchain Deployment
- **Base Mainnet**: Production NFT contracts
- **Base Sepolia**: Development and testing
- **Contract Verification**: Etherscan verification
- **Paymaster Endpoints**: Sponsored transaction infrastructure

## Component Architecture

### Key Components
- **HomeHeroSection**: Location selection and navigation
- **MapCanvas**: Interactive map with photo pins
- **FlipCard**: Sunset analysis display with scoring
- **MapAnalysisOverlay**: AI analysis integration
- **UploadPhotoPanel**: Photo upload and NFT minting
- **AccountInfo**: User wallet and NFT display

### UI Components
- **Radix UI**: Accessible primitives (dialogs, alerts, sliders)
- **Custom Components**: Location combobox, wallet connectors
- **Responsive Design**: Mobile-first approach with Tailwind

## Data Models

### Photo Metadata
```typescript
interface PhotoMetadata {
  metadataCid: string
  photoCid: string
  lat: number
  lon: number
  locationLabel: string | null
  takenAtIso: string | null
  scorePercent?: number | null
  scoreLabel?: string | null
  userScorePercent?: number | null
  userScoreLabel?: string | null
}
```

### Sunset Analysis
```typescript
interface SunsetAnalysisResult {
  probability: number | null
  description: string
}
```

### NFT Metadata
```typescript
interface NFTMetadata {
  name: string
  description: string
  image: string
  attributes: Array<{
    trait_type: string
    value: string | number
  }>
}
```

This architecture documentation reflects the actual implemented features and components found in the Sunsettings codebase.
