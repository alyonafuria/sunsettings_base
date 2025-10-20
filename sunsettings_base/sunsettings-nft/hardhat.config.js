const path = require("path");
// Load .env in this package
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
// Also load parent repo .env as a fallback (without overriding already-set values)
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), override: false });
require("@nomicfoundation/hardhat-toolbox");

const pickRawPk = () => {
  const depPk = process.env.DEPLOYER_PRIVATE_KEY || "";
  const isDepValid = depPk && depPk.length > 2; // ignore empty or just '0x'
  const raw = isDepValid ? depPk : (process.env.PRIVATE_KEY || "");
  return raw;
};
const RAW_PK = pickRawPk();
const PRIVATE_KEY = RAW_PK ? (RAW_PK.startsWith("0x") ? RAW_PK : `0x${RAW_PK}`) : "";
const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL,
      chainId: 84532,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
};
