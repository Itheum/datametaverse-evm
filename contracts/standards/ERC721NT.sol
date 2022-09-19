// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";

contract ERC721NT is ERC721Burnable {
    constructor(
        string memory name_,
        string memory symbol_
    ) ERC721(name_, symbol_) {}

    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        revert("Transferring NFT is not allowed");
    }
}