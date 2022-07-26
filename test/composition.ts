import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Composition", async function () {

  async function setUpContracts() {
    // Signer
    const [ alice, bob, carol, _ ] = await ethers.getSigners();

    // IdentityFactory
    const IdentityFactory = await ethers.getContractFactory("IdentityFactory");
    const identityFactory = await IdentityFactory.connect(bob).deploy();

    await identityFactory.deployed();

    const deployViaFactoryTx = await identityFactory.connect(bob).deployIdentity();
    const deployViaFactoryTxResult = await deployViaFactoryTx.wait();

    const identityContractAddress = deployViaFactoryTxResult.events[1].args[0];

    // Identity
    const Identity = await ethers.getContractFactory("Identity");
    const identity = await Identity.attach(identityContractAddress);

    // funding the Identity
    const fundingTx = await bob.sendTransaction({ value: ethers.utils.parseEther("1"), to: identity.address });
    await fundingTx.wait();

    // NFMe
    const NFMe = await ethers.getContractFactory("NFMe");
    const nfme = await NFMe.deploy();

    await nfme.deployed();

    return { identity, identityFactory, nfme, alice, bob, carol, _ };
  }

  describe("NFMe Minting via Identity including Claim", function() {
    it("should be able to mint when everything is fulfilled", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to 'from'
      const claimData = {
        identifier: "nfme_mint_allowed",
        from: alice.address,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      const signedClaimDataHash = await alice.signMessage(ethers.utils.arrayify(claimDataHash));

      // Bob puts the claim data and the signature to his Identity contract
      await identity.connect(bob).addClaim({ ...claimData, signature: signedClaimDataHash });

      // mint via ERC725X
      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash);

      expect(await nfme.balanceOf(identity.address)).to.equal(Number(1));

      expect(await nfme.ownerOf(0)).to.equal(identity.address);
    });

    it("should not be able to mint twice, even when everything is fulfilled", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to 'from'
      const claimData = {
        identifier: "nfme_mint_allowed",
        from: alice.address,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      const signedClaimDataHash = await alice.signMessage(ethers.utils.arrayify(claimDataHash));

      // Bob puts the claim data and the signature to his Identity contract
      await identity.connect(bob).addClaim({ ...claimData, signature: signedClaimDataHash });

      // mint via ERC725X
      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash);

      expect(await nfme.balanceOf(identity.address)).to.equal(Number(1));

      expect(await nfme.ownerOf(0)).to.equal(identity.address);

      await expect(identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash))
        .to.revertedWith("Already minted");
    });

    it("should not be able to mint when claim has been revoked", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to 'from'
      const claimData = {
        identifier: "nfme_mint_allowed",
        from: alice.address,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      const signedClaimDataHash = await alice.signMessage(ethers.utils.arrayify(claimDataHash));

      // Bob puts the claim data and the signature to his Identity contract
      await identity.connect(bob).addClaim({ ...claimData, signature: signedClaimDataHash });

      // Claim gets revoked by issuer
      await nfme.connect(alice).addRevocation(claimData.to, claimData.identifier);

      // mint via ERC725X
      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await expect(identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash))
        .to.revertedWith("Claim has been revoked");

      expect(await nfme.balanceOf(identity.address)).to.equal(Number(0));
    });

    it("should be able to add another owner and also mint from it", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to 'from'
      const claimData = {
        identifier: "nfme_mint_allowed",
        from: alice.address,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const signedClaimDataHash = await alice.signMessage(ethers.utils.arrayify(claimDataHash));

      await identity.connect(bob).addClaim({ ...claimData, signature: signedClaimDataHash });
      await identity.connect(bob).addOwner(carol.address);

      // mint via ERC725X
      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await identity.connect(carol).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash);

      expect(await nfme.balanceOf(identity.address)).to.equal(Number(1));

      expect(await nfme.ownerOf(0)).to.equal(identity.address);
    });

    it("should fail transferring the NFT after minting it when it's not address zero (transferFrom & safeTransferFrom)", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to 'from'
      const claimData = {
        identifier: "nfme_mint_allowed",
        from: alice.address,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      const signedClaimDataHash = await alice.signMessage(ethers.utils.arrayify(claimDataHash));

      // Bob puts the claim data and the signature to his Identity contract
      await identity.connect(bob).addClaim({ ...claimData, signature: signedClaimDataHash });

      // mint via ERC725X
      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash);

      expect(await nfme.balanceOf(identity.address)).to.equal(Number(1));

      expect(await nfme.ownerOf(0)).to.equal(identity.address);

      // transferFrom should fail
      const transferFromFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("transferFrom(address,address,uint256)")).substring(0, 10);
      let encodedFunctionCall = ethers.utils.solidityPack(["uint32", "uint256", "uint256", "uint256"], [transferFromFunctionSignatureHash, identity.address, carol.address, 0]);

      await expect(identity.connect(bob).execute(0, nfme.address, 0, encodedFunctionCall)).to.revertedWith("Transferring NFT is not allowed");

      // safeTransferFrom should fail
      const safeTransferFromFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeTransferFrom(address,address,uint256)")).substring(0, 10);
      encodedFunctionCall = ethers.utils.solidityPack(["uint32", "uint256", "uint256", "uint256"], [safeTransferFromFunctionSignatureHash, identity.address, carol.address, 0]);

      await expect(identity.connect(bob).execute(0, nfme.address, 0, encodedFunctionCall)).to.revertedWith("Transferring NFT is not allowed");

      expect(await nfme.balanceOf(identity.address)).to.equal(Number(1));

      expect(await nfme.ownerOf(0)).to.equal(identity.address);
    });

    it("should not fail when burning the NFT after minting it", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to 'from'
      const claimData = {
        identifier: "nfme_mint_allowed",
        from: alice.address,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      const signedClaimDataHash = await alice.signMessage(ethers.utils.arrayify(claimDataHash));

      // Bob puts the claim data and the signature to his Identity contract
      await identity.connect(bob).addClaim({ ...claimData, signature: signedClaimDataHash });

      // mint via ERC725X
      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash);

      expect(await nfme.balanceOf(identity.address)).to.equal(Number(1));

      expect(await nfme.ownerOf(0)).to.equal(identity.address);

      // burning should not fail
      const burnFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("burn(uint256)")).substring(0, 10);
      const encodedFunctionCall = ethers.utils.solidityPack(["uint32", "uint256"], [burnFunctionSignatureHash, 0]);

      await identity.connect(bob).execute(0, nfme.address, 0, encodedFunctionCall);

      expect(await nfme.balanceOf(identity.address)).to.equal(Number(0));

      await expect(nfme.ownerOf(0)).to.revertedWith("ERC721: invalid token ID");
    });

    it("should fail when trying to mint without having respective claim", async function () {
      const { identity, nfme, bob } = await loadFixture(setUpContracts);

      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await expect(identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash))
        .to.revertedWith("Required claim not available");
    });

    it("should fail when trying to mint without having valid claim (wrong from)", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to Alice 'from'
      const claimData = {
        identifier: "nfme_mint_allowed",
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
      await identity.connect(bob).addOwner(carol.address);

      // mint via ERC725X
      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await expect(identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash))
        .to.revertedWith("Wrong claim issuer");
    });

    it("should fail when trying to mint without having valid claim (wrong to)", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to Alice 'from'
      const claimData = {
        identifier: "nfme_mint_allowed",
        from: alice.address,
        to: carol.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const signedClaimDataHash = await alice.signMessage(ethers.utils.arrayify(claimDataHash));

      await identity.connect(bob).addClaim({ ...claimData, signature: signedClaimDataHash });
      await identity.connect(bob).addOwner(carol.address);

      // mint via ERC725X
      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await expect(identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash))
        .to.revertedWith("Wrong claim receiver");
    });

    it("should fail when trying to mint without having valid claim (wrong signer)", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to Alice (owner of ClaimVerifier)
      const claimData = {
        identifier: "nfme_mint_allowed",
        from: alice.address,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const signedClaimDataHash = await bob.signMessage(ethers.utils.arrayify(claimDataHash));

      await identity.connect(bob).addClaim({ ...claimData, signature: signedClaimDataHash });
      await identity.connect(bob).addOwner(carol.address);

      // mint via ERC725X
      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await expect(identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash))
        .to.revertedWith("Claim signature not valid");
    });

    it("should fail when trying to mint without having valid signature (original is altered)", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to Alice (owner of ClaimVerifier)
      const claimData = {
        identifier: "nfme_mint_allowed",
        from: alice.address,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      let claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      claimDataHash = claimDataHash.substring(0, 3) + '42' + claimDataHash.substring(5);

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const signedClaimDataHash = await alice.signMessage(ethers.utils.arrayify(claimDataHash));

      await identity.connect(bob).addClaim({ ...claimData, signature: signedClaimDataHash });
      await identity.connect(bob).addOwner(carol.address);

      // mint via ERC725X
      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await expect(identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash))
        .to.revertedWith("Claim signature not valid");
    });

    it("should fail when trying to mint with having valid signature but altered claim data (identifier)", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to Alice (owner of ClaimVerifier)
      const claimData = {
        identifier: "nfme_mint_allowed",
        from: alice.address,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const signedClaimDataHash = await alice.signMessage(ethers.utils.arrayify(claimDataHash));

      await identity.connect(bob).addClaim({ ...claimData, identifier: "altered", signature: signedClaimDataHash });

      // mint via ERC725X
      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await expect(identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash))
        .to.revertedWith("Required claim not available");
    });

    it("should fail when trying to mint with having valid signature but altered claim data (data)", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to Alice (owner of ClaimVerifier)
      const claimData = {
        identifier: "nfme_mint_allowed",
        from: alice.address,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const signedClaimDataHash = await alice.signMessage(ethers.utils.arrayify(claimDataHash));

      await identity.connect(bob).addClaim({ ...claimData, data: ethers.utils.formatBytes32String("altered"), signature: signedClaimDataHash });

      // mint via ERC725X
      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await expect(identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash))
        .to.revertedWith("Claim signature not valid");
    });

    it("should fail when trying to mint with having valid signature but altered claim data (validFrom)", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to Alice (owner of ClaimVerifier)
      const claimData = {
        identifier: "nfme_mint_allowed",
        from: alice.address,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const signedClaimDataHash = await alice.signMessage(ethers.utils.arrayify(claimDataHash));

      await identity.connect(bob).addClaim({ ...claimData, validFrom: 1, signature: signedClaimDataHash });

      // mint via ERC725X
      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await expect(identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash))
        .to.revertedWith("Claim signature not valid");
    });

    it("should fail when trying to mint with having valid signature but altered claim data (validTo)", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to Alice (owner of ClaimVerifier)
      const claimData = {
        identifier: "nfme_mint_allowed",
        from: alice.address,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const signedClaimDataHash = await alice.signMessage(ethers.utils.arrayify(claimDataHash));

      await identity.connect(bob).addClaim({ ...claimData, validTo: 10, signature: signedClaimDataHash });

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

    it("should fail when trying to mint if validTo is in the 'past'", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to 'from'
      const claimData = {
        identifier: "nfme_mint_allowed",
        from: alice.address,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: await ethers.provider.getBlockNumber() - 1,
      };

      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const signedClaimDataHash = await alice.signMessage(ethers.utils.arrayify(claimDataHash));

      await identity.connect(bob).addClaim({ ...claimData, signature: signedClaimDataHash });

      // mint via ERC725X
      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await expect(identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash))
        .to.revertedWith("Claim not valid anymore");
    });

    it("should fail when trying to mint if validFrom is in the 'future'", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to 'from'
      const claimData = {
        identifier: "nfme_mint_allowed",
        from: alice.address,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: await ethers.provider.getBlockNumber() + 5,
        validTo: 0,
      };

      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const signedClaimDataHash = await alice.signMessage(ethers.utils.arrayify(claimDataHash));

      await identity.connect(bob).addClaim({ ...claimData, signature: signedClaimDataHash });

      // mint via ERC725X
      const mintFunctionSignatureHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("safeMint()")).substring(0, 10);
      await expect(identity.connect(bob).execute(0, nfme.address, ethers.utils.parseEther("0.1"), mintFunctionSignatureHash))
        .to.revertedWith("Claim not yet valid");
    });
  });

  describe('Claim Revocations', function() {
    it("should be able to add and remove claim revocations as an owner", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      expect(await nfme.revocations(identity.address, "nfe_mint_allowed")).to.equal(false);

      // Add revocation
      await nfme.connect(alice).addRevocation(identity.address, "nfe_mint_allowed");

      expect(await nfme.revocations(identity.address, "nfe_mint_allowed")).to.equal(true);

      // Remove revocation
      await nfme.connect(alice).removeRevocation(identity.address, "nfe_mint_allowed");

      expect(await nfme.revocations(identity.address, "nfe_mint_allowed")).to.equal(false);
    });

    it("should not be able to add and remove claim revocations as a non-owner", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      expect(await nfme.revocations(identity.address, "nfe_mint_allowed")).to.equal(false);

      // Add revocation
      await expect(nfme.connect(bob).addRevocation(identity.address, "nfe_mint_allowed"))
        .to.revertedWith("Ownable: caller is not the owner");

      expect(await nfme.revocations(identity.address, "nfe_mint_allowed")).to.equal(false);
    });
  });

  describe('Claims', function() {
    it("should be able to add claims", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to 'from'
      const claimData = {
        identifier: "nfme_mint_allowed",
        from: alice.address,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const signedClaimDataHash = await alice.signMessage(ethers.utils.arrayify(claimDataHash));

      expect((await identity.claims(claimData.identifier)).from).to.equal(ethers.constants.AddressZero);

      await identity.connect(bob).addClaim({ ...claimData, signature: signedClaimDataHash });

      expect((await identity.claims(claimData.identifier)).from).to.equal(claimData.from);

      expect(JSON.stringify(await identity.getClaimIdentifier()))
        .to.equal(JSON.stringify(["nfme_mint_allowed"]));
    });

    it("should be able to overwrite claims", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to 'from'
      const claimData = {
        identifier: "nfme_mint_allowed",
        from: alice.address,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const signedClaimDataHash = await alice.signMessage(ethers.utils.arrayify(claimDataHash));

      expect((await identity.claims(claimData.identifier)).from).to.equal(ethers.constants.AddressZero);

      await identity.connect(bob).addClaim({ ...claimData, signature: signedClaimDataHash });

      expect((await identity.claims(claimData.identifier)).from).to.equal(claimData.from);
      expect((await identity.claims(claimData.identifier)).to).to.equal(claimData.to);

      const arbitraryAddress = ethers.Wallet.createRandom().address;

      claimData.to = arbitraryAddress;

      const claimDataHashOverride = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const signedClaimDataHashOverride = await alice.signMessage(ethers.utils.arrayify(claimDataHashOverride));

      await identity.connect(bob).addClaim({ ...claimData, signature: signedClaimDataHashOverride });

      expect((await identity.claims(claimData.identifier)).from).to.equal(claimData.from);
      expect((await identity.claims(claimData.identifier)).to).to.equal(arbitraryAddress);
    });

    it("should be able to remove claims", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to 'from'
      const claimData = {
        identifier: "nfme_mint_allowed",
        from: alice.address,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const signedClaimDataHash = await alice.signMessage(ethers.utils.arrayify(claimDataHash));

      expect((await identity.claims(claimData.identifier)).from).to.equal(ethers.constants.AddressZero);

      await identity.connect(bob).addClaim({ ...claimData, signature: signedClaimDataHash });

      expect((await identity.claims(claimData.identifier)).from).to.equal(claimData.from);

      expect(JSON.stringify(await identity.getClaimIdentifier()))
        .to.equal(JSON.stringify(["nfme_mint_allowed"]));

      await identity.connect(bob).removeClaim(claimData.identifier);

      expect((await identity.claims(claimData.identifier)).from).to.equal(ethers.constants.AddressZero);

      expect(JSON.stringify(await identity.getClaimIdentifier()))
        .to.equal(JSON.stringify([]));
    });

    it("should emit a Claim Action (added) event", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Identity (Bob is owner) has to create the claim and send it over to 'from'
      const claimData = {
        identifier: "nfme_mint_allowed",
        from: alice.address,
        to: identity.address,
        data: ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      const claimDataHash = ethers.utils.solidityKeccak256(["string", "address", "address", "bytes", "uint64", "uint64"], [claimData.identifier, claimData.from, claimData.to, claimData.data, claimData.validFrom, claimData.validTo]);

      // Alice (owner of ClaimVerifier) has to sign and return the claim
      const signedClaimDataHash = await alice.signMessage(ethers.utils.arrayify(claimDataHash));

      expect(await identity.connect(bob).addClaim({...claimData, signature: signedClaimDataHash}))
        .to.emit(nfme, 'ClaimAction').withArgs(claimData.identifier, bob.address, "added");
    });

    it("should emit a Claim Action (removed) event", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      const identifier = "any_identifier";

      await expect(identity.connect(bob).removeClaim(identifier)).to.reverted;
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

    it('should emit the right owner action events on adding and removing them', async function () {
      const { identity, identityFactory, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      expect(await identity.connect(bob).addOwner(carol.address))
        .to.emit(identityFactory, 'OwnerAction').withArgs(identity.address, carol.address, bob.address, "added");

      await identity.connect(bob).proposeOwnerRemoval(carol.address);

      expect(await identity.connect(bob).removeOwner(carol.address))
        .to.emit(identityFactory, 'OwnerAction').withArgs(identity.address, carol.address, bob.address, "removed");
    });

    it('should not emit owner action event', async function () {
      const { identity, identityFactory, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      await expect(identityFactory.throwOwnerActionEvent(alice.address, "any")).to.reverted;
    });
  });

  describe('Owner', function () {
    it('should return correct owner state', async function () {
      const { identity, alice, bob } = await loadFixture(setUpContracts);

      // Bob adds Alice and Alice adds Carol to the identity of Alice
      await identity.connect(bob).addOwner(alice.address);

      expect(await identity.connect(bob).isOwner(bob.address)).to.equal(true);
      expect(await identity.connect(bob).isOwner(alice.address)).to.equal(true);

      const arbitraryAddress = ethers.Wallet.createRandom().address;

      expect(await identity.connect(bob).isOwner(arbitraryAddress)).to.equal(false);
    });

    it('should be able to call onlyOwner function as owner', async function () {
      const { identity, alice, bob } = await loadFixture(setUpContracts);

      // Bob adds Alice and Alice adds Carol to the identity of Alice
      await identity.connect(bob).addOwner(alice.address);

      const claimData = {
        identifier: "dummy_identifier",
        from: bob.address,
        to: alice.address,
        data : ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      await identity.connect(alice).addClaim({ ...claimData, signature: ethers.utils.formatBytes32String("") });

      expect((await identity.connect(bob).claims(claimData.identifier)).identifier).to.equal(claimData.identifier);
    });

    it('should fail to call onlyOwner function as non owner', async function () {
      const { identity, alice, bob } = await loadFixture(setUpContracts);

      const claimData = {
        identifier: "dummy_identifier",
        from: bob.address,
        to: alice.address,
        data : ethers.utils.formatBytes32String(""),
        validFrom: 0,
        validTo: 0,
      };

      await expect(identity.connect(alice).addClaim({ ...claimData, signature: ethers.utils.formatBytes32String("") }))
        .to.revertedWith("Ownable: caller is not the owner");
    });

    it('should be able to add owners', async function () {
      const { identity, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      expect(await identity.isOwner(alice.address)).to.equal(false);
      expect(await identity.isOwner(carol.address)).to.equal(false);

      // Bob adds Alice and Alice adds Carol to the identity of Alice
      await identity.connect(bob).addOwner(alice.address);
      await identity.connect(alice).addOwner(carol.address);

      expect(await identity.isOwner(alice.address)).to.equal(true);
      expect(await identity.isOwner(carol.address)).to.equal(true);

      expect(JSON.stringify(await identity.getOwners()))
        .to.equal(JSON.stringify([bob.address, alice.address, carol.address]));
    });

    it('should fail to add owner when there are already enough', async function () {
      const { identity, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      for (let i = 0; i < 9; i++) {
        const arbitraryAddress = ethers.Wallet.createRandom().address;

        await identity.connect(bob).addOwner(arbitraryAddress);

        expect(await identity.connect(bob).isOwner(arbitraryAddress)).to.equal(true);
      }

      await expect(identity.connect(bob).addOwner(alice.address))
        .to.revertedWith("No more owners allowed");
    });

    it('should be able to remove owner only on enough confirmations', async function () {
      const { identity, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      expect(await identity.isOwner(alice.address)).to.equal(false);
      expect(await identity.isOwner(carol.address)).to.equal(false);

      // Bob adds Alice and Alice adds Carol to the identity of Alice
      await identity.connect(bob).addOwner(alice.address);
      await identity.connect(alice).addOwner(carol.address);

      expect(await identity.isOwner(alice.address)).to.equal(true);
      expect(await identity.isOwner(carol.address)).to.equal(true);

      expect(JSON.stringify(await identity.getOwners()))
        .to.equal(JSON.stringify([bob.address, alice.address, carol.address]));

      // propose Carol for removal
      await identity.connect(alice).proposeOwnerRemoval(carol.address);

      // propose Carol for removal a second time
      await identity.connect(bob).proposeOwnerRemoval(carol.address);

      await identity.connect(bob).removeOwner(carol.address);

      expect(await identity.isOwner(alice.address)).to.equal(true);
      expect(await identity.isOwner(carol.address)).to.equal(false);

      expect(JSON.stringify(await identity.getOwners()))
        .to.equal(JSON.stringify([bob.address, alice.address]));
    });

    it('should be able to propose owner removals', async function () {
      const { identity, alice, bob } = await loadFixture(setUpContracts);

      await identity.connect(bob).addOwner(alice.address);
      expect(await identity.connect(bob).removeOwnerConfirmationCount(alice.address)).to.equal(0);
      await expect(identity.connect(bob).removeOwnerAcknowledgments(alice.address, 0)).to.reverted;

      await identity.connect(bob).proposeOwnerRemoval(alice.address);
      expect(await identity.connect(bob).removeOwnerConfirmationCount(alice.address)).to.equal(1);
      expect(await identity.connect(bob).removeOwnerAcknowledgments(alice.address, 0)).to.equal(bob.address);
    });

    it('should fail to propose same owner removal twice', async function () {
      const { identity, alice, bob } = await loadFixture(setUpContracts);

      await identity.connect(bob).addOwner(alice.address);
      expect(await identity.connect(bob).removeOwnerConfirmationCount(alice.address)).to.equal(0);
      await expect(identity.connect(bob).removeOwnerAcknowledgments(alice.address, 0)).to.reverted;

      await identity.connect(bob).proposeOwnerRemoval(alice.address);
      expect(await identity.connect(bob).removeOwnerConfirmationCount(alice.address)).to.equal(1);
      expect(await identity.connect(bob).removeOwnerAcknowledgments(alice.address, 0)).to.equal(bob.address);

      await expect(identity.connect(bob).proposeOwnerRemoval(alice.address)).to
        .revertedWith("You can't propose the same owner removal twice");
      expect(await identity.connect(bob).removeOwnerConfirmationCount(alice.address)).to.equal(1);
      expect(await identity.connect(bob).removeOwnerAcknowledgments(alice.address, 0)).to.equal(bob.address);
    });

    it('should fail to remove owner if not enough confirmations', async function () {
      const { identity, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Bob adds Alice and Alice adds Carol to the identity of Alice
      await identity.connect(bob).addOwner(alice.address);
      await identity.connect(alice).addOwner(carol.address);

      expect(await identity.isOwner(bob.address)).to.equal(true);
      expect(await identity.isOwner(alice.address)).to.equal(true);
      expect(await identity.isOwner(carol.address)).to.equal(true);

      // removing Carol should fail
      await expect(identity.removeOwner(carol.address)).to
        .revertedWith("At least 50% of owners need to confirm the removal");

      // propose Carol for removal
      await identity.connect(alice).proposeOwnerRemoval(carol.address);

      // removing Carol should still fail
      await expect(identity.removeOwner(carol.address)).to
        .revertedWith("At least 50% of owners need to confirm the removal");
    });

    it('should fail to add owner who is already one (or the owner itself)', async function () {
      const { identity, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      // Bob adds Alice and Alice adds Carol to the identity of Alice
      await identity.connect(bob).addOwner(alice.address);
      await expect(identity.connect(alice).addOwner(alice.address)).to.revertedWith("Is already owner");

      expect(await identity.isOwner(alice.address)).to.equal(true);

      await expect(identity.connect(alice).addOwner(bob.address)).to.revertedWith("Is already owner");

      expect(await identity.isOwner(alice.address)).to.equal(true);
    });

    it('should fail to remove an owner who is not even one', async function () {
      const { identity, alice, bob } = await loadFixture(setUpContracts);

      const arbitraryAddress = ethers.Wallet.createRandom().address;

      await expect (identity.connect(bob).proposeOwnerRemoval(arbitraryAddress))
        .to.revertedWith("Only owners can be proposed for removal");
    });

    it('should be allowed to add and remove and again add and remove the same owner', async function () {
      const { identity, alice, bob } = await loadFixture(setUpContracts);

      await identity.connect(bob).addOwner(alice.address);
      await identity.connect(bob).proposeOwnerRemoval(alice.address);
      expect(await identity.connect(bob).removeOwnerConfirmationCount(alice.address)).to.equal(1);
      expect(await identity.connect(bob).removeOwnerAcknowledgments(alice.address, 0)).to.equal(bob.address);

      await identity.connect(bob).removeOwner(alice.address);
      expect(await identity.connect(bob).removeOwnerConfirmationCount(alice.address)).to.equal(0);
      await expect(identity.connect(bob).removeOwnerAcknowledgments(alice.address, 0)).to.reverted;

      await identity.connect(bob).addOwner(alice.address);
      await identity.connect(bob).proposeOwnerRemoval(alice.address);
      expect(await identity.connect(bob).removeOwnerConfirmationCount(alice.address)).to.equal(1);
      expect(await identity.connect(bob).removeOwnerAcknowledgments(alice.address, 0)).to.equal(bob.address);

      await identity.connect(bob).removeOwner(alice.address);
      expect(await identity.connect(bob).removeOwnerConfirmationCount(alice.address)).to.equal(0);
      await expect(identity.connect(bob).removeOwnerAcknowledgments(alice.address, 0)).to.reverted;
    });

    it('should be allowed to add and remove and again add and remove the same owner (even when another owner removes it)', async function () {
      const { identity, alice, bob, carol } = await loadFixture(setUpContracts);

      await identity.connect(bob).addOwner(alice.address);
      await identity.connect(bob).addOwner(carol.address);
      await identity.connect(bob).proposeOwnerRemoval(alice.address);
      await identity.connect(carol).proposeOwnerRemoval(alice.address);
      expect(await identity.connect(bob).removeOwnerConfirmationCount(alice.address)).to.equal(2);
      expect(await identity.connect(bob).removeOwnerAcknowledgments(alice.address, 0)).to.equal(bob.address);
      expect(await identity.connect(bob).removeOwnerAcknowledgments(alice.address, 1)).to.equal(carol.address);

      await identity.connect(carol).removeOwner(alice.address);
      expect(await identity.connect(bob).removeOwnerConfirmationCount(alice.address)).to.equal(0);
      await expect(identity.connect(bob).removeOwnerAcknowledgments(alice.address, 0)).to.reverted;

      await identity.connect(bob).addOwner(alice.address);
      await identity.connect(bob).proposeOwnerRemoval(alice.address);
      expect(await identity.connect(bob).removeOwnerConfirmationCount(alice.address)).to.equal(1);
      expect(await identity.connect(bob).removeOwnerAcknowledgments(alice.address, 0)).to.equal(bob.address);
    });

    it("should emit a OwnerAction (added) event", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      expect(await identity.connect(bob).addOwner(carol.address))
        .to.emit(identity, 'OwnerAction').withArgs(carol.address, bob.address, "added");
    });

    it("should emit a OwnerAction (removeProposal) event", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      await identity.connect(bob).addOwner(carol.address);

      expect(await identity.connect(bob).proposeOwnerRemoval(carol.address))
        .to.emit(identity, 'OwnerAction').withArgs(carol.address, bob.address, "removeProposal");
    });

    it("should emit a OwnerAction (removed) event", async function () {
      const { identity, nfme, alice, bob, carol, _ } = await loadFixture(setUpContracts);

      await identity.connect(bob).addOwner(carol.address);
      await identity.connect(bob).proposeOwnerRemoval(carol.address);

      expect(await identity.connect(bob).removeOwner(carol.address))
        .to.emit(identity, 'OwnerAction').withArgs(carol.address, bob.address, "removed");
    });
  });
});
