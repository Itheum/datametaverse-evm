// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./Identity.sol";

contract IdentityFactory {

    event IdentityDeployed(address indexed _contract, address indexed _owner);

    function deployIdentity() public returns (address) {
        Identity _identity = new Identity();

        emit IdentityDeployed(address(_identity), tx.origin);

        return address(_identity);
    }
}
