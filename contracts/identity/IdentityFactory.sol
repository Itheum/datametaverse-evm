// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "./Identity.sol";

contract IdentityFactory {

    event IdentityDeployed(address indexed _contract, address indexed _owner);

    function deployIdentity() public returns (address) {
        Identity _identity = new Identity(msg.sender);

        emit IdentityDeployed(address(_identity), msg.sender);

        return address(_identity);
    }
}
