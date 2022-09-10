// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./ClaimVerifier.sol";

contract ERC721NT is ERC721, ClaimVerifier {
    constructor(
        string memory name_,
        string memory symbol_
    ) ERC721(name_, symbol_) ClaimVerifier() {}

    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        revert("Transferring NFT is not allowed");
    }
}