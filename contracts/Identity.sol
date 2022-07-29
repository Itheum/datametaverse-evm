// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@erc725/smart-contracts/contracts/ERC725.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./NFMe.sol";
import "./Common.sol";

contract Identity is ERC725(msg.sender), IERC721Receiver {

    mapping(string => SharedStructs.Claim) public claims;
    mapping(address => mapping(uint256 => bool)) public mintedNFTs;

    function mintNFMe(NFMe nfme) external {
        bool success = nfme.safeMint{value: 0.1 ether}();

        assert(success);
    }

    function addClaim(SharedStructs.Claim memory claim) onlyOwner public {
        claims[claim.identifier] = claim;
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        // todo store minted token
        return IERC721Receiver.onERC721Received.selector;
    }

    receive() external payable {}
}
