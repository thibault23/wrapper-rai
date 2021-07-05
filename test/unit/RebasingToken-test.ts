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

 let accounts: Signer[], deployer: Signer;

let wrapper : Contract;



beforeEach(async function () {
    var Wrapper = await ethers.getContractFactory("Wrapper");
    wrapper = await Wrapper.deploy('Wrapper', 'WRAI');
    await wrapper.deployed();

    accounts = await ethers.getSigners();
    deployer = accounts[0];
});

describe('Token actions', function () {
    it('should mint to an address', async function() {
        await wrapper.connect(deployer).mint(await deployer.getAddress(), ethers.utils.parseUnits('500', 18));

        const balance = await wrapper.balanceOf(await deployer.getAddress());
        console.log('balance is', balance);
    })
})
