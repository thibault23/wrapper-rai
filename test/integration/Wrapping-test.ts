import { expect } from "chai";
import { artifacts, ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("Wrapping flow", function () {

    const hre = require("hardhat");
    async function impersonateAddress(address: string) {
        await hre.network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: [address],
        });
        let signer = await ethers.provider.getSigner(address);
        return signer;
    };

    let accounts: Signer[], deployer: Signer, minter: Signer, 
        minter2: Signer, minter3: Signer, manager: Signer, zeroAddress: Signer,
        raiWhale: Signer;

    let wrapper: Contract, rai: Contract, oracleRelayer: Contract;

    const constants = {
        ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
        raiWhaleAddress: '0xC680361E290D44aB0455375BB09C4aea58Bd9105'
    };

    beforeEach(async function () {
        rai = await ethers.getContractAt("IERC20", "0x03ab458634910aad20ef5f1c8ee96f1d6ac54919");
        oracleRelayer = await ethers.getContractAt("IOracleRelayer", "0x4ed9C0dCa0479bC64d8f4EB3007126D5791f7851");

        var Wrapper = await ethers.getContractFactory("Wrapper");
        //we assume initial RAI price (redemption price) is 3
        wrapper = await Wrapper.deploy('Wrapper', 'WRAI', rai.address, oracleRelayer.address);
        await wrapper.deployed();

        accounts = await ethers.getSigners();
        deployer = accounts[0];
        minter = accounts[1];
        minter2 = accounts[2];
        minter3 = accounts[3];
        manager = accounts[4];
        zeroAddress = await impersonateAddress(constants.ZERO_ADDRESS);
        raiWhale = await impersonateAddress(constants.raiWhaleAddress);
        
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

    describe('fetching', function () {

        it('should fetch redemption price', async function() {
            const price = await wrapper.connect(manager).getRedemptionPrice();
            //result given in ray (27 decimals);
            console.log("price is", price.toString());
        });

        it('should fetch balances', async function() {
            const balance = await rai.connect(raiWhale).balanceOf(constants.raiWhaleAddress);
            console.log("balance is", balance.toString());
        })
    });

    describe('update', function () {

        before(async function () {
            //reset the fork to a later block
            await hre.network.provider.request({
                method: "hardhat_reset",
                params: [
                {
                    forking: {
                    jsonRpcUrl: hre.network.config.forking.url,
                    blockNumber: 12722000,
                    },
                },
                ],
            });
        });

        it('observe changes from the chain', async function() {

            const price = await wrapper.connect(manager).getRedemptionPrice();
            //result given in ray (27 decimals);
            console.log("price is", price.toString());

            const balance = await rai.connect(raiWhale).balanceOf(constants.raiWhaleAddress);
            console.log("balance is", balance.toString());
        });

    });


    describe('mint', function () {
        it('can mint some wrapped rai', async function() {
            await rai.connect(raiWhale).approve(wrapper.address, ethers.utils.parseUnits('5000', 18));
            await wrapper.connect(raiWhale).mint(constants.raiWhaleAddress, ethers.utils.parseUnits('5000', 18));

            const balance = await wrapper.balanceOf(constants.raiWhaleAddress);
            //as price is given in RAY, we should get a 27 digit number preceded by 15k~
            console.log("balance of rai whale is:", balance.toString());

            const balanceBase = await wrapper.balanceOfBase(constants.raiWhaleAddress);
            expect(balanceBase).to.be.equal(ethers.utils.parseUnits('5000', 18));
        });
        

        it("should update redemption price", async function() {

             const priceBefore = await wrapper.connect(manager).getRedemptionPrice();
             console.log("price is", priceBefore.toString());
             await rai.connect(raiWhale).approve(wrapper.address, ethers.utils.parseUnits('5000', 18));
             await wrapper.connect(raiWhale).mint(constants.raiWhaleAddress, ethers.utils.parseUnits('5000', 18));

             const priceAfter = await wrapper.connect(manager).getRedemptionPrice();
             console.log("price is", priceAfter.toString());

             return expect(priceBefore).to.not.be.equal(priceAfter);
        });

    });

    describe('burn', function () {

        it('can burn all', async function() {
            await rai.connect(raiWhale).approve(wrapper.address, ethers.utils.parseUnits('5000', 18));
            await wrapper.connect(raiWhale).mint(constants.raiWhaleAddress, ethers.utils.parseUnits('5000', 18));

            await wrapper.connect(raiWhale).burnAll(constants.raiWhaleAddress);

            expect((await wrapper.connect(raiWhale).totalSupplyBase()).toString()).to.be.equal(ethers.utils.parseUnits('0', 18));
            return expect((await wrapper.balanceOfBase(constants.raiWhaleAddress)).toString())
                .to.be.equal(ethers.utils.parseUnits('0', 18));
        });
   
    });

    describe('transfer', function () {

        it('should fetch redemption price', async function() {
            
        });
   
    });

    describe('reflexer', function () {

        it('should fetch redemption price', async function() {
            
        });
   
    });
});