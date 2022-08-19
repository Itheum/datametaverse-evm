import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Composition", async function () {

  async function setUpContracts() {
    // Signer
    const [ alice, bob, carol, _ ] = await ethers.getSigners();

    // Identity
    const Identity = await ethers.getContractFactory("Identity");
    const identity = await Identity.connect(bob).deploy();

    await identity.deployed();

    const fundingTx = await bob.sendTransaction({ value: ethers.utils.parseEther("1"), to: identity.address });
    await fundingTx.wait();

    console.log("Identity deployed to:", identity.address);

    // NFMe
    const NFMe = await ethers.getContractFactory("NFMe");
    const nfme = await NFMe.deploy("nfme_mint_allowed", alice.address);

    await nfme.deployed();

    console.log("NFMe deployed to:", nfme.address);

    return { identity, nfme, alice, bob, carol, _ };
  }

  describe("Deployment", function () {
    it("should deploy all contracts", async function () {
      const { nfme, alice } = await loadFixture(setUpContracts);

      expect(await nfme.claimSigner()).to.equal(alice.address);
    });
  });

  describe("NFMe Minting via Identity including Claim", function() {
    it("should be able to mint", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Bob needs to ask the target (NFT) contract which claim he needs and from whom it needs to be signed
      const identifier = await nfme.claimIdentifier();
      const from = await nfme.claimSigner();

      // Identity (Bob is owner) has to create the claim and send it over to 'from'
      // todo how to send to 'from'?
      const claimData = {
        identifier,
        from,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

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

    it("should fail when trying to mint without having respective claim", async function () {
      const { identity, nfme, bob } = await loadFixture(setUpContracts);

      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await expect(identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash))
        .to.revertedWith("Required claim not available");
    });

    it("should fail when trying to mint without having valid claim (wrong from)", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Bob needs to ask the target (NFT) contract which claim he needs and from whom it needs to be signed
      const identifier = await nfme.claimIdentifier();
      const from = await nfme.claimSigner();

      // Identity (Bob is owner) has to create the claim and send it over to Alice 'from'
      const claimData = {
        identifier,
        from: carol.address,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const signedClaimDataHash = await carol.signMessage(ethers.utils.arrayify(claimDataHash));

      await identity.connect(bob).addClaim({ ...claimData, signature: signedClaimDataHash });
      await identity.connect(bob).addAdditionalOwner(carol.address);

      // mint via ERC725X
      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await expect(identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash))
        .to.revertedWith("Wrong claim issuer");
    });

    it("should fail when trying to mint without having valid claim (wrong to)", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Bob needs to ask the target (NFT) contract which claim he needs and from whom it needs to be signed
      const identifier = await nfme.claimIdentifier();
      const from = await nfme.claimSigner();

      // Identity (Bob is owner) has to create the claim and send it over to Alice 'from'
      const claimData = {
        identifier,
        from,
        to: carol.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const signedClaimDataHash = await alice.signMessage(ethers.utils.arrayify(claimDataHash));

      await identity.connect(bob).addClaim({ ...claimData, signature: signedClaimDataHash });
      await identity.connect(bob).addAdditionalOwner(carol.address);

      // mint via ERC725X
      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await expect(identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash))
        .to.revertedWith("Wrong claim receiver");
    });

    it("should fail when trying to mint without having valid claim (wrong signer)", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Bob needs to ask the target (NFT) contract which claim he needs and from whom it needs to be signed
      const identifier = await nfme.claimIdentifier();
      const from = await nfme.claimSigner();

      // Identity (Bob is owner) has to create the claim and send it over to Alice (owner of ClaimVerifier)
      const claimData = {
        identifier,
        from,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const signedClaimDataHash = await bob.signMessage(ethers.utils.arrayify(claimDataHash));

      await identity.connect(bob).addClaim({ ...claimData, signature: signedClaimDataHash });
      await identity.connect(bob).addAdditionalOwner(carol.address);

      // mint via ERC725X
      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await expect(identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash))
        .to.revertedWith("Claim signature not valid");
    });

    it("should fail when trying to mint when sending to less ether", async function () {
      const { identity, nfme, bob } = await loadFixture(setUpContracts);

      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await expect(identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.01"), mintFunctionSignatureHash))
        .to.revertedWith("Please send enough ether");
    });
  });

  describe('Identity Factory', function () {
    it('should deploy an identity contract for the user', async function () {
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
      const { identity, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Bob adds Alice and Alice adds Carol to the identity of Alice
      await identity.connect(bob).addAdditionalOwner(alice.address);
      await identity.connect(alice).addAdditionalOwner(carol.address);

      expect(await identity.additionalOwnersCount()).to.equal(2);

      // removing Carol should fail
      await expect(identity.removeAdditionalOwner(carol.address)).to
        .revertedWith("At least 50% of owners need to confirm the removal");

      // propose Carol for removal
      await identity.connect(alice).proposeAdditionalOwnerRemoval(carol.address);

      // removing Carol should still fail
      await expect(identity.removeAdditionalOwner(carol.address)).to
        .revertedWith("At least 50% of owners need to confirm the removal");

      // propose Carol for removal a second time
      await identity.connect(bob).proposeAdditionalOwnerRemoval(carol.address);

      await identity.removeAdditionalOwner(carol.address);

      expect(await identity.additionalOwnersCount()).to.equal(1);
    });
  });
});
