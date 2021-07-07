import { expect } from "chai";
import { artifacts, ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("Wrapper", function () {

    const hre = require("hardhat");
    async function impersonateAddress(address: string) {
        await hre.network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: [address],
        });
        let signer = await ethers.provider.getSigner(address);
        return signer;
    };

    let accounts: Signer[], deployer: Signer, minter: Signer, minter2: Signer, minter3: Signer, manager: Signer;

    let wrapper : Contract;

    const constants = {
        ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
    };

    beforeEach(async function () {
        var Wrapper = await ethers.getContractFactory("MockWrapper");
        //we assume initial RAI price (redemption price) is 3
        wrapper = await Wrapper.deploy('Wrapper', 'WRAI', ethers.utils.parseUnits('3', 18));
        await wrapper.deployed();

        accounts = await ethers.getSigners();
        deployer = accounts[0];
        minter = accounts[1];
        minter2 = accounts[2];
        minter3 = accounts[3];
        manager = accounts[4];
        await wrapper.connect(minter).mint(await minter.getAddress(), ethers.utils.parseUnits('500', 18));
    });

    afterEach(async function () {
        await hre.network.provider.request({
        method: "hardhat_reset",
        params: [{
            forking: {
            jsonRpcUrl: hre.network.config.forking.url,
            blockNumber: hre.network.config.forking.blockNumber
            }
        }]
        })
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
            return expect(wrapper.connect(minter).mint(await minter.getAddress(), 0))
            .to.be.revertedWith('Amount is zero.');
        });
        
        it('should be ok to mint with several addresses', async function() {
            const redemptionPrice = await wrapper.getRedemptionPrice();
            const preSupply = await wrapper.totalSupply();
            console.log("pre total supply is:", preSupply.toString());
            const amount1 = ethers.utils.parseUnits('500', 18);
            const amount2 = ethers.utils.parseUnits('1000', 18);
            await wrapper.connect(minter).mint(await minter.getAddress(), ethers.utils.parseUnits('500', 18));
            await wrapper.connect(minter2).mint(await minter2.getAddress(), ethers.utils.parseUnits('1000', 18));

            const postSupply = await wrapper.totalSupply();
            
            return expect(postSupply)
                .to.be.equal(ethers.utils.parseUnits('6000', 18));
        });  
    });

    describe('burn', function () {
        it('should burn tokens of an address', async function() {
            console.log("redemption price is:", (await wrapper.getRedemptionPrice()).toString());
            const balanceBefore = await wrapper.balanceOf(await minter.getAddress());
            console.log("balance before:", balanceBefore.toString());
            console.log("base balance before:", (await wrapper.balanceOfBase(await minter.getAddress())).toString());
            //we burn 1000 of the rebased amount (should have 1500 initially)
            await wrapper.connect(minter).burn(await minter.getAddress(), ethers.utils.parseUnits('1000', 18));
            console.log("base balance after:", (await wrapper.balanceOfBase(await minter.getAddress())).toString());
            const balance = await wrapper.balanceOf(await minter.getAddress());
            return expect (balance)
                .to.be.equal(balanceBefore.sub(ethers.utils.parseUnits('1000', 18)));
        });

        it('should revert when burn to address 0', async function() {
            return expect(wrapper.connect(minter).burn(constants.ZERO_ADDRESS, ethers.utils.parseUnits('1000', 18)))
            .to.be.revertedWith('Burn from the zero address');
        });

        it('should revert when amount is 0', async function() {
            return expect(wrapper.connect(minter).burn(await minter.getAddress(), ethers.utils.parseUnits('0', 18)))
            .to.be.revertedWith('Amount is zero.');
        });

        it('should burn all tokens', async function() {
            await wrapper.connect(minter3).mint(await minter3.getAddress(), ethers.utils.parseUnits('500', 18));
            console.log("balance before:", (await wrapper.balanceOf(minter3.getAddress())).toString());
            await wrapper.connect(minter3).burnAll(await minter3.getAddress());
            console.log("balance after:", (await wrapper.balanceOf(minter3.getAddress())).toString());
        });

        it('should revert when burning from the zero address', async function() {
            return expect(wrapper.connect(minter).burnAll(constants.ZERO_ADDRESS))
            .to.be.revertedWith('Burn from the zero address');
        });
    });

    describe('redemption price', function () {
        it('should update redemption price with a large value', async function() {
            await wrapper.connect(manager).updateRedemptionPrice(ethers.utils.parseUnits('600000000000000000000000', 18));
        });

        it('should reflect correct balances during a price change scenario', async function() {
            console.log("balance before update", (await wrapper.balanceOf(minter.getAddress())).toString());
            await wrapper.connect(manager).updateRedemptionPrice(ethers.utils.parseUnits('6', 18));
            console.log("balance after update", (await wrapper.balanceOf(minter.getAddress())).toString());
        });
    });

    describe('totalSupply', function () {
        it('should increase after a minting event', async function() {
            await wrapper.connect(minter3).mint(await minter3.getAddress(), ethers.utils.parseUnits('1000', 18));
            await wrapper.connect(minter3).mint(await minter3.getAddress(), ethers.utils.parseUnits('2000', 18));

            expect(await wrapper.totalSupply())
                .to.be.equal(ethers.utils.parseUnits('10500', 18))
        });

        it('should decrease after a burning event', async function() {
            await wrapper.connect(minter3).mint(await minter3.getAddress(), ethers.utils.parseUnits('1000', 18));
            await wrapper.connect(minter3).mint(await minter3.getAddress(), ethers.utils.parseUnits('2000', 18));

            await wrapper.connect(minter3).burnAll(await minter3.getAddress());

            expect(await wrapper.totalSupply())
                .to.be.equal(ethers.utils.parseUnits('1500', 18))
        });
    });

    describe('balanceOf', function () {
        it('should provide correct accountings', async function() {
            console.log("balance of minter is:", (await wrapper.balanceOf(await minter.getAddress())).toString());
            var balance = await wrapper.balanceOf(await minter.getAddress());
            expect(balance).to.be.equal(ethers.utils.parseUnits('1500', 18));

            //price rebasing upwards by a factor of 2
            await wrapper.connect(manager).updateRedemptionPrice(ethers.utils.parseUnits('6', 18));
            balance = await wrapper.balanceOf(await minter.getAddress());
            expect(balance).to.be.equal(ethers.utils.parseUnits('3000', 18));

            //price rebasing downwards by a factor of 4
            await wrapper.connect(manager).updateRedemptionPrice(ethers.utils.parseUnits('1.5', 18));
            balance = await wrapper.balanceOf(await minter.getAddress());
            expect(balance).to.be.equal(ethers.utils.parseUnits('750', 18));

            const balanceBase = await wrapper.balanceOfBase(await minter.getAddress());
            console.log("base balance is:", balanceBase.toString());
        }) 
    });

    describe('transfers', function () {

    });

    describe('transferFrom', function () {

    });

    describe('rebase event', function () {

    });

});