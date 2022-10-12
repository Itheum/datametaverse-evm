// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "./Identity.sol";

contract IdentityFactory {

    event IdentityDeployed(address indexed _contract, address indexed _owner);
    event OwnerAction(address indexed _contract, address indexed _owner, address indexed _actionBy, string _actionType);

    function deployIdentity() public returns (address) {
        Identity _identity = new Identity();

        emit IdentityDeployed(address(_identity), tx.origin);

        return address(_identity);
    }

    function throwOwnerActionEvent(address _owner, string memory action) public returns (bool) {
        Identity identityContract = Identity(payable(msg.sender));

        require(identityContract.isOwner(tx.origin), "Transaction origin is not an owner");

        emit OwnerAction(address(identityContract), _owner, tx.origin, action);

        return true;
    }
}
