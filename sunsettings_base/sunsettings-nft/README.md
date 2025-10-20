Sunsettings NFT (Base Sepolia)

This package deploys a simple ERC-721 contract that mints NFTs pointing to Pinata-hosted metadata.

Contract
- Name: Sunsettings Photo
- Symbol: SUNSET
- Mint function: safeMint(address to, string tokenURI)
- Solidity: 0.8.24

Prereqs
- Node.js LTS (recommended: v22 LTS). Hardhat 3 does NOT support Node 23 yet.
- npm
- A funded Base Sepolia account (get Base Sepolia ETH from a faucet)

Setup
1) Copy env template and fill values:
   - DEPLOYER_PRIVATE_KEY: Private key with 0x prefix
   - BASE_SEPOLIA_RPC_URL: https://sepolia.base.org (default works)
   - (Optional) BASESCAN_API_KEY: for contract verification

2) Install deps:
   - npm install

3) Compile:
   - npm run compile

4) Deploy to Base Sepolia:
   - npm run deploy:base-sepolia

5) Copy the deployed contract address back into the app's .env:
   - NEXT_PUBLIC_SUNSET_NFT_CONTRACT_ADDRESS=<deployed address>

6) Restart the Next.js app so the new env is picked up.

Optional: Verify Contract
- With a Basescan API key set in .env, run:
  - npx hardhat verify --network baseSepolia <contract_address>

Notes
- The Next.js app expects the contract to expose safeMint(address,string). The deploy script uses the contract in contracts/SunsettingsPhoto.sol which matches that.
- If compile/deploy fails with a Node error, switch to Node LTS (e.g., via nvm) and re-run.
