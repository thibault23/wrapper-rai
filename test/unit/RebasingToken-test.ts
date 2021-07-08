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

    let accounts: Signer[], deployer: Signer, minter: Signer, minter2: Signer, minter3: Signer, manager: Signer, zeroAddress: Signer;

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
        zeroAddress = await impersonateAddress(constants.ZERO_ADDRESS);
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
            return wrapper.connect(minter).burn(await minter.getAddress(), ethers.utils.parseUnits('1000', 18));
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
        it('should transfer and verify balances', async function() {
            //minter has 1500 USD worth of RAI (redemption price of 3)
            await wrapper.connect(minter).transfer(minter2.getAddress(), ethers.utils.parseUnits('300', 18));

            expect((await wrapper.balanceOf(minter.getAddress())))
                .to.be.equal(ethers.utils.parseUnits('1200', 18));

            expect((await wrapper.balanceOf(minter2.getAddress())))
                .to.be.equal(ethers.utils.parseUnits('300', 18));

            expect((await wrapper.balanceOfBase(minter.getAddress())))
                .to.be.equal(ethers.utils.parseUnits('400', 18));

            expect((await wrapper.balanceOfBase(minter2.getAddress())))
                .to.be.equal(ethers.utils.parseUnits('100', 18));
        });

        it('should be correct when transferring after price increases', async function() {
            await wrapper.connect(manager).updateRedemptionPrice(ethers.utils.parseUnits('6', 18));

            await wrapper.connect(minter).transfer(minter2.getAddress(), ethers.utils.parseUnits('300', 18));

            expect((await wrapper.balanceOf(minter.getAddress())))
                .to.be.equal(ethers.utils.parseUnits('2700', 18));

            expect((await wrapper.balanceOf(minter2.getAddress())))
                .to.be.equal(ethers.utils.parseUnits('300', 18));

            expect((await wrapper.balanceOfBase(minter.getAddress())))
                .to.be.equal(ethers.utils.parseUnits('450', 18));

            expect((await wrapper.balanceOfBase(minter2.getAddress())))
                .to.be.equal(ethers.utils.parseUnits('50', 18));
        });

        it('should be correct when transferring all tokens', async function() {
            await wrapper.connect(manager).updateRedemptionPrice(ethers.utils.parseUnits('6', 18));

            await wrapper.connect(minter).transfer(minter2.getAddress(), ethers.utils.parseUnits('3000', 18));

            expect((await wrapper.balanceOf(minter.getAddress())))
                .to.be.equal(ethers.utils.parseUnits('0', 18));

            expect((await wrapper.balanceOf(minter2.getAddress())))
                .to.be.equal(ethers.utils.parseUnits('3000', 18));

            expect((await wrapper.balanceOfBase(minter.getAddress())))
                .to.be.equal(ethers.utils.parseUnits('0', 18));

            expect((await wrapper.balanceOfBase(minter2.getAddress())))
                .to.be.equal(ethers.utils.parseUnits('500', 18));
        });
        
        it('should revert when not enough balance', async function() {
            return expect(wrapper.connect(minter).transfer(minter2.getAddress(), ethers.utils.parseUnits('2000', 18)))
                .to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });

        it('should revert when transferring to the zero address', async function() {
            return expect(wrapper.connect(minter).transfer(constants.ZERO_ADDRESS, ethers.utils.parseUnits('2000', 18)))
                .to.be.revertedWith("ERC20: transfer to the zero address");
        });
    });

    describe('transferFrom', function () {
        it('should revert when not enough balance', async function() {
            return expect(wrapper.connect(minter).transferFrom(minter.getAddress(), minter2.getAddress(), ethers.utils.parseUnits('2000', 18)))
                .to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });

        it('should revert when transferring to the zero address', async function() {
            return expect(wrapper.connect(minter).transferFrom(minter.getAddress(), constants.ZERO_ADDRESS, ethers.utils.parseUnits('2000', 18)))
                .to.be.revertedWith("ERC20: transfer to the zero address");
        });

        it('should revert when transferring from the zero address', async function() {
            return expect(wrapper.connect(minter).transferFrom(constants.ZERO_ADDRESS, minter2.getAddress(), ethers.utils.parseUnits('2000', 18)))
                .to.be.revertedWith("ERC20: transfer from the zero address");
        });

        it('should transfer correctly', async function() {
            await wrapper.connect(minter).approve(minter.getAddress(), ethers.utils.parseUnits('300', 18))
            await wrapper.connect(minter).transferFrom(minter.getAddress(), minter2.getAddress(), ethers.utils.parseUnits('300', 18));

            expect((await wrapper.balanceOf(minter.getAddress())))
                .to.be.equal(ethers.utils.parseUnits('1200', 18));

            expect((await wrapper.balanceOf(minter2.getAddress())))
                .to.be.equal(ethers.utils.parseUnits('300', 18));
        });

        it('should be correct after a price increase', async function() {
            await wrapper.connect(manager).updateRedemptionPrice(ethers.utils.parseUnits('10', 18));
            await wrapper.connect(minter).approve(minter.getAddress(), ethers.utils.parseUnits('300', 18))
            await wrapper.connect(minter).transferFrom(minter.getAddress(), minter2.getAddress(), ethers.utils.parseUnits('300', 18));

            expect((await wrapper.balanceOf(minter.getAddress())))
                .to.be.equal(ethers.utils.parseUnits('4700', 18));

            expect((await wrapper.balanceOf(minter2.getAddress())))
                .to.be.equal(ethers.utils.parseUnits('300', 18));
        });

        it('should be correct before a price increase', async function() {
            await wrapper.connect(minter).approve(minter.getAddress(), ethers.utils.parseUnits('300', 18));
            await wrapper.connect(minter).transferFrom(minter.getAddress(), minter2.getAddress(), ethers.utils.parseUnits('300', 18));
            await wrapper.connect(manager).updateRedemptionPrice(ethers.utils.parseUnits('10', 18));

            expect((await wrapper.balanceOf(minter.getAddress())))
                .to.be.equal(ethers.utils.parseUnits('4000', 18));

            expect((await wrapper.balanceOf(minter2.getAddress())))
                .to.be.equal(ethers.utils.parseUnits('1000', 18));
        });

        it('should revert when approving from the zero address', async function() {
            return expect(wrapper.connect(zeroAddress).approve(minter.getAddress(), ethers.utils.parseUnits('300', 18)))
                .to.be.revertedWith('ERC20: approve from the zero address');
        });

        it('should revert when approving the zero address', async function() {
            return expect(wrapper.connect(minter).approve(zeroAddress.getAddress(), ethers.utils.parseUnits('300', 18)))
                .to.be.revertedWith('ERC20: approve to the zero address');
        });

        it('should revert when exceeding allowance', async function() {
            //to recall that the approval is regarding the underlying token (RAI or WrappedRai)
            await wrapper.connect(minter).approve(minter2.getAddress(), ethers.utils.parseUnits('300', 18));
            await wrapper.connect(minter2).transferFrom(minter.getAddress(), minter3.getAddress(), ethers.utils.parseUnits('900', 18));

            const allowance = await wrapper.connect(minter).allowance(minter.getAddress(), minter2.getAddress());
            console.log("allowances:", allowance.toString());
            return expect(wrapper.connect(minter2).transferFrom(minter.getAddress(), minter3.getAddress(), ethers.utils.parseUnits('1', 18)))
                .to.be.revertedWith("ERC20: transfer amount exceeds allowance");
        });

        it('should revert when exceeding allowance due to rebasing event', async function() {
            await wrapper.connect(minter).approve(minter2.getAddress(), ethers.utils.parseUnits('300', 18));
            //at this stage 300 wrapped RAI is approved i.e. 900 rebased rai at current prices

            await wrapper.connect(manager).updateRedemptionPrice(ethers.utils.parseUnits('10', 18));
            //1 wrapped rai is now 10 rebased rai and should be able to transfer 3000 rebased rai

            var allowance = await wrapper.connect(minter).allowance(minter.getAddress(), minter2.getAddress());
            expect(allowance).to.be.equal(ethers.utils.parseUnits('300', 18));

            await wrapper.connect(minter2).transferFrom(minter.getAddress(), minter3.getAddress(), ethers.utils.parseUnits('3000', 18));
            allowance = await wrapper.connect(minter).allowance(minter.getAddress(), minter2.getAddress());
            expect(allowance).to.be.equal(ethers.utils.parseUnits('0', 18));

            return expect(wrapper.connect(minter2).transferFrom(minter.getAddress(), minter3.getAddress(), ethers.utils.parseUnits('1', 18)))
                .to.be.revertedWith("ERC20: transfer amount exceeds allowance");
        });
    });

});