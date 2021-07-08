// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract Constants {
    //we will initialize our test with a price of base 18
    uint8 public constant DEFAULT_DECIMALS = 18;
    uint256 public constant DEFAULT_DECIMALS_FACTOR = uint256(10)**DEFAULT_DECIMALS;
}