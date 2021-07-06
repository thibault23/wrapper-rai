// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IOracleRelayer {
    function redemptionPrice() external returns (uint256);
}