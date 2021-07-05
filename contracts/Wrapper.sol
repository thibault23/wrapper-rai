// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./WERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Wrapper is WERC20 {

    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    constructor (string memory name_, string memory symbol_) 
        public WERC20 (name_, symbol_) {}

    
    function totalSupply() public view override returns (uint256) {
        return totalSupplyBase();
    }

    function balanceOf(address account) public view override returns (uint256) {
        return balanceOfBase(account);
    }

    function mint(address account, uint amount) external {
        _mint(account, amount);
    }


}