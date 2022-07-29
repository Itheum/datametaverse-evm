// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./Common.sol";
import "./Identity.sol";
import "./ClaimVerifier.sol";
import "./IERC721SafeMint.sol";

contract NFMe is ERC721, Ownable, IERC721SafeMint {
    uint16 constant MAX_SUPPLY = 10_000;
    uint256 constant MINT_PRICE = 0.1 ether;

    address public claimVerifier;

    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    constructor(address _claimVerifier) ERC721("Itheums NFMe", "NFMe") {
        setClaimVerifier(_claimVerifier);
    }

    function setClaimVerifier(address _claimVerifier) public onlyOwner {
        claimVerifier = _claimVerifier;
    }

    function safeMint() external payable returns (bool) {
        require(msg.value >= MINT_PRICE, "Please send enough ether");

        uint256 tokenId = _tokenIdCounter.current();

        require(tokenId < MAX_SUPPLY, "We are already minted out");

        (
            string memory identifier,
            address from,
            address to,
            bytes memory data,
            bytes memory signature
        ) = Identity(payable(msg.sender)).claims("nfme_mint_allowed");

        require(from != address(0x0), "Identity has no 'nfme_mint_allowed' claim stored");
        require(from == ClaimVerifier(claimVerifier).owner(), "Not owner of ClaimVerifier signed the claim");
        require(to == msg.sender, "Wrong claim receiver");
        require(ClaimVerifier(claimVerifier)
            .verify(SharedStructs.Claim(identifier, from, to, data, signature)), "Claim not valid");

        _tokenIdCounter.increment();
        _safeMint(msg.sender, tokenId);

        return true;
    }
}