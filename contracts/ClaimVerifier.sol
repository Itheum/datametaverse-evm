// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Common.sol";
import "./Identity.sol";

contract ClaimVerifier is Ownable {

    string public claimIdentifier;
    address public claimSigner;

    constructor(string memory _claimIdentifier, address _claimSigner) {
        claimIdentifier = _claimIdentifier;
        claimSigner = _claimSigner;
    }

    function getMessageHash(
        string memory _identifier,
        address _from,
        address _to,
        bytes memory _data
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_identifier, _from, _to, _data));
    }

    function getEthSignedMessageHash(bytes32 _messageHash) public pure returns (bytes32) {
        return keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash)
        );
    }

    function verifySignature(SharedStructs.Claim memory claim) public view returns (bool) {
        bytes32 messageHash = getMessageHash(
            claim.identifier,
            claim.from,
            claim.to,
            claim.data
        );

        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        return recoverSigner(ethSignedMessageHash, claim.signature) == owner();
    }

    function recoverSigner(bytes32 _ethSignedMessageHash, bytes memory _signature) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);

        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function splitSignature(bytes memory sig) public pure returns (
        bytes32 r,
        bytes32 s,
        uint8 v
    ) {
        require(sig.length == 65, "invalid signature length");

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        return (r, s, v);
    }

    function _verifyClaim() internal {
        (
        string memory identifier,
        address from,
        address to,
        bytes memory data,
        bytes memory signature
        ) = Identity(payable(msg.sender)).claims(claimIdentifier);

        require(from != address(0x0), "Required claim not available");
        require(from == claimSigner, "Wrong claim issuer");
        require(to == msg.sender, "Wrong claim receiver");
        require(verifySignature(SharedStructs.Claim(identifier, from, to, data, signature)), "Claim signature not valid");
    }
}