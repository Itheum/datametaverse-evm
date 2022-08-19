// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./Common.sol";
import "./Identity.sol";
import "./ClaimVerifier.sol";

contract NFMe is ERC721, ClaimVerifier {
    uint16 constant MAX_SUPPLY = 10;
    uint256 constant MINT_PRICE = 0.1 ether;


    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    constructor(
        string memory _claimIdentifier,
        address _claimSigner
    ) ERC721("Itheums NFMe", "NFMe") ClaimVerifier(_claimIdentifier, _claimSigner) {}

    function safeMint() external payable returns (bool) {
        require(msg.value >= MINT_PRICE, "Please send enough ether");

        uint256 tokenId = _tokenIdCounter.current();

        require(tokenId < MAX_SUPPLY, "We are already minted out");

        _verifyClaim();

        _tokenIdCounter.increment();
        _safeMint(msg.sender, tokenId);

        return true;
    }
}