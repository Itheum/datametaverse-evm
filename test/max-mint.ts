import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Max Mint", async function () {

  async function setUpContracts() {
    // Signer
    const [ alice, bob, carol, _ ] = await ethers.getSigners();

    // ClaimVerifier
    const ClaimVerifier = await ethers.getContractFactory("ClaimVerifier");
    const claimVerifier = await ClaimVerifier.deploy();

    await claimVerifier.deployed();

    console.log("ClaimVerifier deployed to:", claimVerifier.address);

    // Identity
    const Identity = await ethers.getContractFactory("Identity");
    const identity = await Identity.connect(bob).deploy();

    await identity.deployed();

    const fundingTx = await bob.sendTransaction({ value: ethers.utils.parseEther("5000"), to: identity.address });
    await fundingTx.wait();

    console.log("Identity deployed to:", identity.address);

    // NFMe
    const NFMe = await ethers.getContractFactory("NFMe");
    const nfme = await NFMe.deploy(claimVerifier.address);

    await nfme.deployed();

    console.log("NFMe deployed to:", nfme.address);

    return { claimVerifier, identity, nfme, alice, bob, carol, _ };
  }

  describe("NFMe Minting via Identity including Claim", function() {
    it("should fail when trying to mint when already minted out", async function () {
      const { claimVerifier, identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to Alice (owner of ClaimVerifier)
      const claimData = {
        identifier: "nfme_mint_allowed",
        from: alice.address,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
      };

      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes"], [claimData.identifier, claimData.from, claimData.to, claimData.data]);

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const signedClaimDataHash = await alice.signMessage(ethers.utils.arrayify(claimDataHash));

      await identity.connect(bob).addClaim({ ...claimData, signature: signedClaimDataHash });
      await identity.connect(bob).addAdditionalOwner(carol.address);

      // mint via ERC725X
      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);

      for (let i = 0; i < 10; i++) {
        await identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash);
      }

      await expect(identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash))
        .to.revertedWith("We are already minted out");
    });
  });
});
