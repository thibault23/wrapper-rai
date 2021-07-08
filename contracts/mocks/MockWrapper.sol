// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../WERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "contracts/libraries/WadRayMath.sol";
import "../common/Constants.sol";

contract MockWrapper is WERC20, Constants {
    uint256 public constant BASE = DEFAULT_DECIMALS_FACTOR;

    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using WadRayMath for uint256;
    uint256 public redemptionPrice;

    constructor (string memory name_, string memory symbol_, uint256 value) 
         WERC20 (name_, symbol_) {
            updateRedemptionPrice(value);
    }

    function applyPrice(uint256 amount, bool operation) internal view returns (uint256 resultant) {
        uint256 _BASE = BASE;
        uint256 diff;
        if(operation) {
            diff = amount.mul(redemptionPrice) % _BASE;
            resultant = amount.mul(redemptionPrice).div(_BASE);
        } else {
            diff = amount.mul(_BASE) % redemptionPrice;
            resultant = amount.mul(_BASE).div(redemptionPrice);
        }
        if (diff >= 5E17) {
            resultant = resultant.add(1);
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
        uint256 burnedAmount = applyPrice(amount, false);
        _burn(account, burnedAmount);
    }

    /**
     * @dev Burns all tokens from an address
     * @param account The underlying address to burn all tokens from. 
     */
    function burnAll(address account) external {
        require(account != address(0), "Burn from the zero address");
        uint256 amount = balanceOfBase(account);
        _burn(account, amount);
    }

    /**
     * @dev Transfer tokens to an address
     *      The rebased amount is used as one of the function parameters
     * @param to The underlying address to send tokens to.
     * @param amount The amount of rebased tokens to send in USD. 
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        uint256 transferAmount = applyPrice(amount, false);
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
        uint256 transferAmount = applyPrice(amount, false);
        super.transferFrom(from, to, transferAmount);
        return true;
    }

    function getRedemptionPrice() public view returns (uint256) {
        return redemptionPrice;
    }

    /**
     * @dev Updates the redemption price using the oracle, can be thought as the rebase event.
     */
    function updateRedemptionPrice(uint256 value) public {
        redemptionPrice = value;
    }
}