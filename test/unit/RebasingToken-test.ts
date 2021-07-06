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

let accounts: Signer[], deployer: Signer, minter: Signer, minter2: Signer;

let wrapper : Contract;

const constants = {
    ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
};

beforeEach(async function () {
    var Wrapper = await ethers.getContractFactory("MockWrapper");
    //we assume initial RAI price (redemption price) is 3
    wrapper = await Wrapper.deploy('Wrapper', 'WRAI', 3);
    await wrapper.deployed();

    accounts = await ethers.getSigners();
    deployer = accounts[0];
    minter = accounts[1];
    minter2 = accounts[2];
    await wrapper.connect(minter).mint(await minter.getAddress(), ethers.utils.parseUnits('500', 18));
});

describe('mint', function () {
    it('should mint to an address', async function() {
        await wrapper.connect(deployer).mint(await deployer.getAddress(), ethers.utils.parseUnits('500', 18));

        const balance = await wrapper.balanceOf(await deployer.getAddress());
        console.log('balance is', balance.toString());
    });

    it('should revert when minter is address 0', async function() {
        console.log("redemption price is:", (await wrapper.getRedemptionPrice()).toString());
        //we burn 1000 of the rebased amount (should have 1500 initially)
        return expect(wrapper.connect(minter).mint(constants.ZERO_ADDRESS, ethers.utils.parseUnits('1000', 18)))
        .to.be.revertedWith('Mint to the zero address');
    });

    it('should revert when amount is 0', async function() {
        return expect(wrapper.connect(minter).mint(await minter.getAddress(), ethers.utils.parseUnits('0', 18)))
        .to.be.revertedWith('Amount is zero.');
    });
    
    it('should be ok to mint with several addresses', async function() {
        const redemptionPrice = await wrapper.getRedemptionPrice();
        const preSupply = await wrapper.totalSupply();
        console.log("pre total supply is:", preSupply.toString());
        const amount1 = ethers.utils.parseUnits('500', 18);
        const amount2 = ethers.utils.parseUnits('1000', 18);
        await wrapper.connect(minter).mint(await minter.getAddress(), amount1);
        await wrapper.connect(minter2).mint(await minter2.getAddress(), amount2);

        const postSupply = await wrapper.totalSupply();
        
        return expect(postSupply)
            .to.be.equal(((amount1.mul(redemptionPrice)).add((amount2.mul(redemptionPrice))).add(preSupply)).toString());
    });  
});

describe('burn', function () {
    it('should burn tokens of an address', async function() {
        console.log("redemption price is:", (await wrapper.getRedemptionPrice()).toString());
        //we burn 1000 of the rebased amount (should have 1500 initially)
        await wrapper.connect(minter).burn(await minter.getAddress(), ethers.utils.parseUnits('1000', 18));
    })
});

describe('redemption price', function () {

});

describe('totalSupply', function () {

});

describe('balanceOf', function () {
    it('should provide correct accountings', async function() {
        console.log("balance of minter is:", (await wrapper.balanceOf(await minter.getAddress())).toString());
        const balance = (await wrapper.balanceOf(await minter.getAddress())).toString()
        expect(balance).to.be.equal(ethers.utils.parseUnits('1500', 18));
    }) 
});

describe('transfers', function () {

});

describe('transferFrom', function () {

});

describe('rebase event', function () {

});
