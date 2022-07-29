// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@erc725/smart-contracts/contracts/ERC725.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./Common.sol";
import "./IERC721SafeMint.sol";

contract Identity is ERC725(msg.sender), IERC721Receiver {

    mapping(string => SharedStructs.Claim) public claims;
    mapping(address => bool) public ownerOfAnyNftInContract;

    function mint(IERC721SafeMint _target) external payable {
        // todo make use of ERC725X
        bool success = _target.safeMint{value: msg.value}();

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
        ownerOfAnyNftInContract[operator] = true;

        return IERC721Receiver.onERC721Received.selector;
    }

    receive() external payable {}
}
