// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

library SharedStructs {
    struct Claim {
        string identifier;
        address from;
        address to;
        bytes data;
        bytes signature;
    }
}