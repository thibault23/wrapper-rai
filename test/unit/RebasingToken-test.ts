import { expect } from "chai";
import { artifacts, ethers } from "hardhat";
import { Contract, Signer } from "ethers";


const hre = require("hardhat");
async function impersonateAddress(address: string) {
    await hre.network.provider.request({
         method: 'hardhat_impersonateAccount',
         params: [address],
     });
     let signer = await ethers.provider.getSigner(address);
    return signer;
 };

 let accounts: Signer[], deployer: Signer, minter: Signer;

let wrapper : Contract;



beforeEach(async function () {
    var Wrapper = await ethers.getContractFactory("MockWrapper");
    //we assume initial RAI price (redemption price) is 3
    wrapper = await Wrapper.deploy('Wrapper', 'WRAI', 3);
    await wrapper.deployed();

    accounts = await ethers.getSigners();
    deployer = accounts[0];
    minter = accounts[1];
    await wrapper.connect(minter).mint(await minter.getAddress(), ethers.utils.parseUnits('500', 18));
});

describe('Token actions', function () {
    it('should mint to an address', async function() {
        await wrapper.connect(deployer).mint(await deployer.getAddress(), ethers.utils.parseUnits('500', 18));

        const balance = await wrapper.balanceOf(await deployer.getAddress());
        console.log('balance is', balance.toString());
    })

    it('should burn tokens of an address', async function() {
        console.log("redemption price is:", (await wrapper.getRedemptionPrice()).toString());
        //we burn 1000 of the rebased amount (should have 1500 initially)
        await wrapper.connect(minter).burn(await minter.getAddress(), ethers.utils.parseUnits('1000', 18));
    })

    it('gives correct accountings', async function() {
        console.log("balance of minter is:", (await wrapper.balanceOf(await minter.getAddress())).toString());
        const balance = (await wrapper.balanceOf(await minter.getAddress())).toString()
        expect(balance).to.be.equal(ethers.utils.parseUnits('1500', 18));
    })
})
