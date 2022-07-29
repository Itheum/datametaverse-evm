const { ethers } = require("hardhat");

async function main() {
  // ClaimVerifier
  const ClaimVerifier = await ethers.getContractFactory("ClaimVerifier");
  const claimVerifier = await ClaimVerifier.deploy();

  await claimVerifier.deployed();

  console.log("ClaimVerifier deployed to:", claimVerifier.address);

  // Identity
  const Identity = await ethers.getContractFactory("Identity");
  const identity = await Identity.deploy();

  await identity.deployed();

  console.log("Identity deployed to:", identity.address);

  // NFMe
  const NFMe = await ethers.getContractFactory("NFMe");
  const nfme = await NFMe.deploy(claimVerifier.address);

  await nfme.deployed();

  console.log("NFMe deployed to:", nfme.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
