// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "@erc725/smart-contracts/contracts/ERC725.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "./IdentityFactory.sol";
import "../utils/Common.sol";

contract Identity is ERC725(tx.origin), IERC721Receiver, IERC1155Receiver {

    event ClaimAction(string indentifier, address indexed actionBy, string actionType);

    string[] public claimIdentifier;

    // claims can not be revoked at the moment and they can be overwritten
    mapping(string => SharedStructs.Claim) public claims;

    mapping(address => bool) public ownerOfErc721;
    mapping(address => bool) public ownerOfErc1155;

    function addClaim(SharedStructs.Claim memory claim) onlyOwner public {
        claims[claim.identifier] = claim;

        bool found;

        for (uint index; index < claimIdentifier.length; index++) {
            if (keccak256(abi.encodePacked((claimIdentifier[index]))) == keccak256(abi.encodePacked((claim.identifier)))) {
                found = true;
                break;
            }
        }

        if (!found) {
            claimIdentifier.push(claim.identifier);
        }

        emit ClaimAction(claim.identifier, msg.sender, "added");
    }

    function removeClaim(string memory identifier) onlyOwner public {
        uint16 index;
        bool found;

        for (; index < claimIdentifier.length; index++) {
            if (keccak256(abi.encodePacked((claimIdentifier[index]))) == keccak256(abi.encodePacked((identifier)))) {
                found = true;
                break;
            }
        }

        assert(found);

        claimIdentifier[index] = claimIdentifier[claimIdentifier.length - 1];
        claimIdentifier.pop();

        delete claims[identifier];

        emit ClaimAction(identifier, msg.sender, "removed");
    }

    function getClaimIdentifier() public view returns (string[] memory) {
        return claimIdentifier;
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        ownerOfErc721[operator] = true;

        return IERC721Receiver.onERC721Received.selector;
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4) {
        ownerOfErc1155[operator] = true;

        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external override returns (bytes4) {
        ownerOfErc1155[operator] = true;

        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    receive() external payable {}
}
