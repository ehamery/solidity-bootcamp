import hardhat from "hardhat";
import { MyTokenVotes__factory } from "../typechain-types";
import { ethers } from "ethers";
import 'dotenv/config';
// require('dotenv').config();

const MINT_VALUE = hardhat.ethers.parseUnits('1');

async function deployWithHardhat() {
    const [deployer, acc1, acc2] = await hardhat.ethers.getSigners();
    // const tokenContractFactory = await ethers.getContractFactory("MyToken");
    const contractFactory = new MyTokenVotes__factory(deployer);
    const contract = await contractFactory.deploy();
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    // const contractAddress = contract.target;
    console.log(`Contract deployed at ${contractAddress}`);

    const mintTx = await contract.mint(acc1.address, MINT_VALUE);
    await mintTx.wait();
    console.log(
        `Minted ${MINT_VALUE.toString()} decimal units to account ${acc1.address}`
    );
    const balanceBN = await contract.balanceOf(acc1.address);
    console.log(
        `Account ${acc1.address} has ${balanceBN.toString()} decimal units of MyTokenVotes`
    );

    const votes = await contract.getVotes(acc1.address);
    console.log(
        `Account ${acc1.address} has ${votes.toString()
        } units of voting power before self delegating`
    );

    const delegateTx = await contract.connect(acc1).delegate(acc1.address);
    await delegateTx.wait();
    const votesAfter = await contract.getVotes(acc1.address);
    console.log(
        `Account ${acc1.address
        } has ${votesAfter.toString()} units of voting power after self delegating`
    );

    const transferTx = await contract
        .connect(acc1)
        .transfer(acc2.address, MINT_VALUE / 2n);
    await transferTx.wait();
    const votes1AfterTransfer = await contract.getVotes(acc1.address);
    console.log(
        `Account ${acc1.address
        } has ${votes1AfterTransfer.toString()} units of voting power after transferring`
    );

    const votes2AfterTransfer = await contract.getVotes(acc2.address);
    console.log(
        `Account ${acc2.address
        } has ${votes2AfterTransfer.toString()} units of voting power after receiving a transfer`
    );

    const lastBlock = await hardhat.ethers.provider.getBlock("latest");
    const lastBlockNumber = lastBlock?.number ?? 0;
    for (let index = lastBlockNumber - 1; index > 0; index--) {
        const pastVotes = await contract.getPastVotes(
            acc1.address,
            index
        );
        console.log(
            `Account ${acc1.address
            } had ${pastVotes.toString()} units of voting power at block ${index}`
        );
    }
}

async function deployWithTypechain() {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_ENDPOINT_URL ?? "");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY ?? "", provider)
    const contractFactory = new MyTokenVotes__factory(wallet);
    const contract = await contractFactory.deploy();
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    console.log(`Token contract deployed at ${contractAddress}`);
  }

(async function() {
    try {
        await deployWithHardhat();
        // await deployWithTypechain();
    } catch (error) {
        console.error(error);
        process.exitCode = 1;
    }
})();

