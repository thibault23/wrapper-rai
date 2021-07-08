# wrapper-rai

## Overiew

This implementation covers a rebase mechanism for RAI. As we know, RAI is a stablecoin not pegged to the USD.
Its stability is currently around 3 USD but it aims not to have a fixed peg, independant of the US dollar. As such, its peg can be quite counterintuitive for users whose mindset is still attached to fiat currencies. 

This repo implements a rebase mechanism around the redemption price of RAI. A user can mint wrapped RAI by transferring RAI to the contract. Each wrapped RAI is then converted into rebase tokens by using the redemption price of RAI. If a user deposits 2 RAI to the contract and the current RAI redemption price is 3, the user balance will be 6. If the peg changes to 4, user balance will be updated to 8.

## Implementation

I extended the ERC20 standard and updated balanceOf and totalSupply functions to include a rebase mechanism where balances are obtained with a simple multiplication or division between the balance of RAI (or wrapped RAI) and the RAI redemption price queried from the oracle relayer.

Overall, all internal accounting is denominated in RAI but balanceOf and totalSupply which can be displayed to the user are denominated in rebased RAI.

There is a ```transferAllAllowance``` function to facilitate transferring all approved tokens.

To compile the contracts:

```npx hardhat compile```

## Testing

Testing includes unit and integration testing which cover each basic functionnality of the contracts (including child and parent contracts).

The various tested functionnalities are mint, balance, burn, transfer, allowance, all.

Reversion is also tested.

Unit testing is done through a mock contract of the wrapper contract.

Integration testing with the RAI token and the Oracle Relayer smart contract is also included.

To run the tests:

```npx hardhat test```

## Improvements

This implementation does not cover a perfect continuous rebasing mechanism, meaning each block might not include the latest updated redemption price.

This is because balanceOf is a view function and can't update the state during its execution. As such, each new balanceOf call might not have the latest redemption price updated. Nevertheless, all other token functionalities include a call to the update redemption price function so we can consider the rebasing mechanism almost continuous.

The above is still vulnerable to attacks in case long periods without minting, transferring, burning... occur.

An external actor (such as a bot) could also be integrated into the implementation and participate to the protocol by calling ``updateRedemptionPrice()`` frequently.
