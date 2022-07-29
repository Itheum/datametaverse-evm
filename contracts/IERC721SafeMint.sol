pragma solidity ^0.8.0;

interface IERC721SafeMint {
    function safeMint() external payable returns (bool);
}
