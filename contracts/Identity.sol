// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@erc725/smart-contracts/contracts/ERC725.sol";
import "./NFMe.sol";
import "./Common.sol";

contract Identity is ERC725(msg.sender) {

    mapping(string => SharedStructs.Claim) public claims;

    function mintNFMe(NFMe nfme) external {
        bool success = nfme.safeMint{value: 0.1 ether}();

        assert(success);
    }

    function addClaim(SharedStructs.Claim memory claim) onlyOwner public {
        claims[claim.identifier] = claim;
    }
}
