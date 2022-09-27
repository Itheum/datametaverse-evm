// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./Identity.sol";

contract IdentityFactory {

    event IdentityDeployed(address indexed _contract, address indexed _owner);
    event AdditionalOwnerAction(address indexed _contract, address indexed originalOwner, address indexed additionalOwner, string action);

    function deployIdentity() public returns (address) {
        Identity _identity = new Identity();

        emit IdentityDeployed(address(_identity), tx.origin);

        return address(_identity);
    }

    function throwAdditionalOwnerEvent(address _additionalOwner, string memory action) public returns (bool) {
        Identity identityContract = Identity(payable(msg.sender));

        require(identityContract.isOwner(tx.origin), "Transaction origin is not an owner");

        emit AdditionalOwnerAction(address(identityContract), tx.origin, _additionalOwner, action);

        return true;
    }
}
