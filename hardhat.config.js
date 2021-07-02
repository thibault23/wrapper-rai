require("@nomiclabs/hardhat-ethers");
require('dotenv').config();
require("@nomiclabs/hardhat-waffle");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

let mainnet;

mainnet = process.env['mainnet']

module.exports = {

  solidity: "0.8.4",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },

    defaultNetwork: "hardhat",

    networks: {

      localhost: {
        url: 'http://127.0.0.1:8545',
        // accounts: [
        //      account,
        //      referal
        //  ],
        gas: 12000000,
        blockGasLimit: 12000000
      },
  
      hardhat: {
        accounts: {
          mnemonic: 'test test test test test test test test test test test junk',
          accountsBalance: '10000000000000000000000000000000',
        },
        forking: {
          url: mainnet,
          blockNumber: 12522000,
        },
      },
    },

  mocha: {
    useColors: true,
    timeout: 60000,
  },

};

