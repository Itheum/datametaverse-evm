import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("All", async function () {

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

    const fundingTx = await bob.sendTransaction({ value: ethers.utils.parseEther("1"), to: identity.address });
    await fundingTx.wait();

    console.log("Identity deployed to:", identity.address);

    // NFMe
    const NFMe = await ethers.getContractFactory("NFMe");
    const nfme = await NFMe.deploy(claimVerifier.address);

    await nfme.deployed();

    console.log("NFMe deployed to:", nfme.address);

    return { claimVerifier, identity, nfme, alice, bob, carol, _ };
  }

  describe("Deployment", function () {
    it("should deploy all contracts", async function () {
      const { claimVerifier, identity, nfme } = await loadFixture(setUpContracts);

      expect(await nfme.claimVerifier()).to.equal(claimVerifier.address);
    });
  });

  describe("NFMe Minting via Identity including Claims", function() {
    it("should be able to mint", async function () {
      const { claimVerifier, identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to Alice (owner of ClaimVerifier)
      const claimData = {
        identifier: "nfme_mint_allowed",
        from: alice.address,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
      };

      //const claimDataHash = await claimVerifier.getMessageHash(claimData.identifier, claimData.from, claimData.to, claimData.data);
      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes"], [claimData.identifier, claimData.from, claimData.to, claimData.data]);

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const signedClaimDataHash = await alice.signMessage(ethers.utils.arrayify(claimDataHash));

      await identity.connect(bob).addClaim({ ...claimData, signature: signedClaimDataHash });
      await identity.connect(bob).addAdditionalOwner(carol.address);

      // mint via ERC725X
      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash);
      await identity.connect(carol).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash);

      expect(await nfme.balanceOf(identity.address)).to.equal(Number(2));

      expect(await nfme.ownerOf(0)).to.equal(identity.address);
      expect(await nfme.ownerOf(1)).to.equal(identity.address);
    });
  });

  describe('Identity Factory', function () {
    it('should deploy an identity contract for the user (gasless)', async function () {
      const [ alice, bob, carol, _ ] = await ethers.getSigners();

      // Identity Factory
      const IdentityFactory = await ethers.getContractFactory("IdentityFactory");
      const identityFactory = await IdentityFactory.deploy();

      // Bob uses identity factory for deploying his identity contract
      const deployViaFactoryTx = await identityFactory.connect(bob).deployIdentity();
      const deployViaFactoryTxResult = await deployViaFactoryTx.wait();

      // getting the address of the deployed identity contract for Bob
      const identityContractAddress = deployViaFactoryTxResult.events[1].args[0];

      const Identity = await ethers.getContractFactory("Identity");
      const identity = await Identity.attach(identityContractAddress);

      expect(await identity.owner()).to.equal(bob.address);
    });
  });

  describe('Additional Owner Removal', function () {
    it('should remove additional owner only on enough confirmations', async function () {
      const { claimVerifier, identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Bob adds Alice and Alice adds Carol to the identity of Alice
      await identity.connect(bob).addAdditionalOwner(alice.address);
      await identity.connect(alice).addAdditionalOwner(carol.address);

      expect(await identity.additionalOwnersCount()).to.equal(2);

      // removing Carol should fail
      await expect(identity.removeAdditionalOwner(carol.address)).to.revertedWith("At least 50% of owners need to confirm the removal");

      // propose Carol for removal
      await identity.connect(alice).proposeAdditionalOwnerRemoval(carol.address);

      // removing Carol should still fail
      await expect(identity.removeAdditionalOwner(carol.address)).to.revertedWith("At least 50% of owners need to confirm the removal");

      // propose Carol for removal a second time
      await identity.connect(bob).proposeAdditionalOwnerRemoval(carol.address);

      await identity.removeAdditionalOwner(carol.address);

      expect(await identity.additionalOwnersCount()).to.equal(1);
    });
  });
});
