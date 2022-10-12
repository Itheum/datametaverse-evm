// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

library SharedStructs {
    struct Claim {
        string identifier;
        address from;
        address to;
        bytes data;
        uint64 validFrom;
        uint64 validTo;
        bytes signature;
    }
}