// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./WERC20.sol";
import "./interfaces/IOracleRelayer.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "contracts/libraries/WadRayMath.sol";
import "./common/Constants.sol";

/**
* @notice Rebasing token implementation of the RAI stablecoin.
* The rebasing token relies on the redemption price to establish 
* The underlying amount of tokens is referred to as the base while the rebased amount
* can be referred to as the rebase (base * price).
* So as to leave room for interoperability, we don't use msg.sender but rather keep
* account as mint and burn parameters
* The redemption price will always have to be updated before any operation (burn, mint, transfer)
* For burn and transfer operations, we always use the rebased amount (base*price) as input parameter
*/
contract Wrapper is WERC20, Constants {
    uint256 public constant BASE = DEFAULT_DECIMALS_FACTOR;

    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using WadRayMath for uint256;
    IERC20 public rai;
    IOracleRelayer public oracle;
    uint256 public redemptionPrice;

    constructor (string memory name_, string memory symbol_, address _rai, address _oracle) 
         WERC20 (name_, symbol_) {
             rai = IERC20(_rai);
             oracle = IOracleRelayer(_oracle);
             updateRedemptionPrice();
    }

    function applyPrice(uint256 amount, bool operation) internal view returns (uint256 resultant) {
        // we keep 27 decimals for better arithmetic precision
        if(operation) {
            resultant = amount.rayMul(redemptionPrice);
        } else {
            resultant = amount.rayDiv(redemptionPrice);
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
     * @param amount The amount of wrapped tokens to mint (1:1 in RAI). 
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
     * @param amount The amount of rebased tokens to burn in USD. 
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

    /**
     * @dev Transfer tokens to an address
     *      The rebased amount is used as one of the function parameters
     * @param to The underlying address to send tokens to.
     * @param amount The amount of rebased tokens to send in USD. 
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        updateRedemptionPrice();
        uint256 transferAmount = applyPrice(amount, false);
        _transfer(msg.sender, to, transferAmount);
        return true;
    }

    function transferAll(address to) public returns (bool) {
        updateRedemptionPrice();
        uint256 transferAmount = balanceOfBase(msg.sender);
        _transfer(msg.sender, to, transferAmount);
        return true;
    }

    function transferAllAllowance(address from, address to) public returns (bool) {
        updateRedemptionPrice();
        uint256 transferAmount = allowance(from, msg.sender);
        _transfer(msg.sender, to, transferAmount);
        return true;
    }

    /**
     * @dev Transfer tokens from an address to an address
     *      The rebased amount is used as one of the function parameters
     * @param from The underlying address to send tokens from.
     * @param to The underlying address to send tokens to.
     * @param amount The amount of rebased tokens to send in USD. 
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool){
        updateRedemptionPrice();
        uint256 transferAmount = applyPrice(amount, false);
        super.transferFrom(from, to, transferAmount);
        return true;
    }

    function getRedemptionPrice() public view returns (uint256) {
        return redemptionPrice;
    }

    /**
     * @dev Updates the redemption price using the oracle, can be thought of as the rebase event.
     */
    function updateRedemptionPrice() public {
        redemptionPrice = oracle.redemptionPrice();
    }
}