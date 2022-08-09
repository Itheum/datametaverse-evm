// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@erc725/smart-contracts/contracts/ERC725.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./Common.sol";

contract Identity is ERC725(tx.origin), IERC721Receiver {

    mapping(address => bool) public additionalOwners;

    //todo research if we can use ERC735 here
    mapping(string => SharedStructs.Claim) public claims;
    mapping(address => bool) public ownerOfAnyNftInContract;

    function _checkOwner() internal view override {
        require(owner() == msg.sender || additionalOwners[msg.sender], "Ownable: caller is not the owner");
    }

    function addClaim(SharedStructs.Claim memory claim) onlyOwner public {
        claims[claim.identifier] = claim;
    }

    function addAdditionalOwner(address _additionalOwner) public onlyOwner {
        additionalOwners[_additionalOwner] = true;
    }

    function removeAdditionalOwner(address _additionalOwner) public onlyOwner {
        additionalOwners[_additionalOwner] = false;
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
