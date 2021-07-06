// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./WERC20.sol";
import "./interfaces/IOracleRelayer.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
* @notice Rebasing token implementation of the RAI stablecoin.
* The rebasing token relies on the redemption price to establish 
* The underlying amount of tokens is referred to as the base while the rebased amount
* can be referred to as the rebase (base * price).
* So as to leave room for interoperability, we don't use msg.sender but rather keep
* account as mint and burn parameters
*/
contract Wrapper is WERC20 {

    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    IERC20 public rai;
    IOracleRelayer public oracle;
    uint256 public redemptionPrice;

    constructor (string memory name_, string memory symbol_, address _rai, address _oracle) 
         WERC20 (name_, symbol_) {
             rai = IERC20(_rai);
             oracle = IOracleRelayer(_oracle);
    }

    function applyPrice(uint256 amount, bool operation) public view returns (uint256) {
        if(operation) {
            return amount.mul(redemptionPrice);
        } else {
            return amount.div(redemptionPrice);
        }
    }
   
    function totalSupply() public view override returns (uint256) {
        return applyPrice(totalSupplyBase(), true);
    }

    /**
     * @param account The underlying address of the balance.
     */
    function balanceOf(address account) public view override returns (uint256) {
        return applyPrice(balanceOfBase(account), true);
    }

    /**
     * @dev Mints tokens to an address
     *      As wrapped tokens are pegged 1:1 with RAI, amount is also equivalent to the amount of RAI
     * @param account The underlying address to mint wrapped tokens to.
     * @param amount The amount of wrapped tokens to mint. 
     */
    function mint(address account, uint amount) external {
        require(account != address(0), "Mint to the zero address");
        require(amount > 0, "Amount is zero.");
        updateRedemptionPrice();
        rai.transferFrom(account, address(this), amount);
        _mint(account, amount);
    }

    /**
     * @dev Burns tokens from an address
     *      The rebased amount is used as one of the function parameters
     *      If account has 3 RAI, redemption price is 2 and amount is 4, the underlying amount of RAI to actually burn is 2
     * @param account The underlying address to burn tokens from.
     * @param amount The amount of rebased tokens to burn. 
     */
    function burn(address account, uint amount) external {
        require(account != address(0), "Burn from the zero address");
        require(amount > 0, "Amount is zero.");
        updateRedemptionPrice();
        uint256 burnedAmount = applyPrice(amount, false);
        _burn(account, burnedAmount);
        rai.transfer(account, burnedAmount);

    }

    /**
     * @dev Burns all tokens from an address
     * @param account The underlying address to burn all tokens from. 
     */
    function burnAll(address account) external {
        require(account != address(0), "Burn from the zero address");
        uint256 amount = balanceOfBase(account);
        _burn(account, amount);
        rai.transfer(account, amount);
    }

    function getRedemptionPrice() public view returns (uint256) {
        return redemptionPrice;
    }

    /**
     * @dev Updates the redemption price using the oracle, can be thought as the rebase event.
     */
    function updateRedemptionPrice() public {
        redemptionPrice = oracle.redemptionPrice();
    }
}