const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();
  if (!signers || signers.length === 0) {
    throw new Error(
      "No signer available. Ensure DEPLOYER_PRIVATE_KEY or PRIVATE_KEY is set in .env (with funds on Base Sepolia)."
    );
  }
  const [deployer] = signers;
  console.log("Deploying with:", deployer.address);

  const Contract = await hre.ethers.getContractFactory("SunsettingsPhoto");
  const contract = await Contract.deploy();
  await contract.waitForDeployment();
  const addr = await contract.getAddress();

  console.log("SunsettingsPhoto deployed to:", addr);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
