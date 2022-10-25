// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "@erc725/smart-contracts/contracts/ERC725.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "./IdentityFactory.sol";
import "../utils/Common.sol";

contract Identity is ERC725(tx.origin), IERC721Receiver, IERC1155Receiver {

    event ClaimAction(string indentifier, address indexed actionBy, string actionType);
    event OwnerAction(address indexed added, address indexed actionBy, string actionType);

    uint8 public MAX_OWNERS = 10;

    string[] public claimIdentifier;
    address[] public owners;
    mapping(address => uint8) public removeOwnerConfirmationCount;
    mapping(address => address[]) public removeOwnerAcknowledgments;

    // claims can not be revoked at the moment and they can be overwritten
    mapping(string => SharedStructs.Claim) public claims;

    mapping(address => bool) public ownerOfErc721;
    mapping(address => bool) public ownerOfErc1155;

    IdentityFactory public identityFactory;

    constructor() {
        identityFactory = IdentityFactory(msg.sender);
        owners.push(tx.origin);
    }

    function _checkOwner() internal view override {
        require(isOwner(msg.sender), "Ownable: caller is not the owner");
    }

    function isOwner(address toCheck) view public returns (bool) {
        for (uint i = 0; i < owners.length; i++) {
            if (owners[i] == toCheck) {
                return true;
            }
        }
        return false;
    }

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

    function addOwner(address _owner) public onlyOwner {
        require(owners.length < MAX_OWNERS, "No more owners allowed");
        require(!isOwner(_owner), "Is already owner");

        owners.push(_owner);

        emit OwnerAction(_owner, msg.sender, "added");

        assert(identityFactory.throwOwnerActionEvent(_owner, "added"));
    }

    function proposeOwnerRemoval(address _owner) public onlyOwner {
        require(isOwner(_owner), "Only owners can be proposed for removal");
        require(!alreadyProposed(_owner, msg.sender),
            "You can't propose the same owner removal twice");

        removeOwnerAcknowledgments[_owner].push(msg.sender);

        removeOwnerConfirmationCount[_owner]++;

        emit OwnerAction(_owner, msg.sender, "removeProposal");
    }

    function removeOwner(address _owner) public onlyOwner {
        uint8 compensateOddness = uint8(owners.length % 2);

        require(removeOwnerConfirmationCount[_owner] >= uint8(owners.length / 2 + compensateOddness),
            "At least 50% of owners need to confirm the removal");

        uint8 index;
        bool found;

        for (; index < owners.length; index++) {
            if (owners[index] == _owner) {
                found = true;
                break;
            }
        }

        assert(found);

        owners[index] = owners[owners.length - 1];
        owners.pop();

        delete removeOwnerConfirmationCount[_owner];
        delete removeOwnerAcknowledgments[_owner];

        emit OwnerAction(_owner, msg.sender, "removed");

        assert(identityFactory.throwOwnerActionEvent(_owner, "removed"));
    }

    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    function alreadyProposed(address _owner, address _sender) public view returns (bool) {
        for (uint8 i = 0; i < removeOwnerAcknowledgments[_owner].length; i++) {
            if (removeOwnerAcknowledgments[_owner][i] == _sender) {
                return true;
            }
        }
        return false;
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
