// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/Counters.sol";
import "./ERC721NT.sol";

contract NFMe is ERC721NT("Itheums NFMe", "NFMe") {
    uint16 constant MAX_SUPPLY = 10;
    uint256 constant MINT_PRICE = 0.1 ether;

    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    function safeMint() external payable returns (bool) {
        require(msg.value >= MINT_PRICE, "Please send enough ether");

        uint256 tokenId = _tokenIdCounter.current();

        require(tokenId < MAX_SUPPLY, "We are already minted out");

        _verifyClaim("nfme_mint_allowed", address(0x72e37d393c70823113a7176aC1F7C579d2C5623E));

        _tokenIdCounter.increment();
        _safeMint(msg.sender, tokenId);

        return true;
    }
}