// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@erc725/smart-contracts/contracts/ERC725.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./Common.sol";

contract Identity is ERC725(tx.origin), IERC721Receiver {

    event ClaimAdded(string indexed indentifier, address indexed from);
    event ClaimRemoved(string indexed indentifier);

    uint8 public MAX_ADDITIONAL_OWNERS = 9;
    uint8 public additionalOwnersCount = 0;
    mapping(address => bool) public additionalOwners;
    mapping(address => uint8) public removeAdditionalOwnerConfirmationCount;
    mapping(address => mapping(address => bool)) public removeAdditionalOwnerAcknowledgments;

    // claims can not be revoked at the moment
    mapping(string => SharedStructs.Claim) public claims;
    mapping(address => bool) public ownerOfAnyNftInContract;

    function _checkOwner() internal view override {
        require(owner() == msg.sender || additionalOwners[msg.sender], "Ownable: caller is not the owner");
    }

    function addClaim(SharedStructs.Claim memory claim) onlyOwner public {
        claims[claim.identifier] = claim;

        emit ClaimAdded(claim.identifier, claim.from);
    }

    function removeClaim(string memory identifier) onlyOwner public {
        delete claims[identifier];

        emit ClaimRemoved(identifier);
    }

    function addAdditionalOwner(address _additionalOwner) public onlyOwner {
        require(additionalOwnersCount < MAX_ADDITIONAL_OWNERS, "No more additional owners allowed");

        additionalOwnersCount++;

        additionalOwners[_additionalOwner] = true;
    }

    function proposeAdditionalOwnerRemoval(address _additionalOwner) public onlyOwner {
        require(additionalOwners[_additionalOwner], "Only additional owners can be proposed for removal");
        require(!removeAdditionalOwnerAcknowledgments[_additionalOwner][msg.sender],
            "You can't propose the same additional owner removal twice");

        removeAdditionalOwnerAcknowledgments[_additionalOwner][msg.sender] = true;

        removeAdditionalOwnerConfirmationCount[_additionalOwner]++;
    }

    function removeAdditionalOwner(address _additionalOwner) public onlyOwner {
        require(removeAdditionalOwnerConfirmationCount[_additionalOwner] > additionalOwnersCount/2,
            "At least 50% of owners need to confirm the removal");

        additionalOwners[_additionalOwner] = false;

        additionalOwnersCount--;

        delete removeAdditionalOwnerConfirmationCount[_additionalOwner];
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
