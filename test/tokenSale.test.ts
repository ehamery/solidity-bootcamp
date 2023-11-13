import { expect } from "chai";
import { ethers } from "hardhat"
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { MyToken } from "../typechain-types";

const TEST_RATIO = 10n;
const TEST_PRICE = 5n;
const TEST_BUY_VALUE = ethers.parseUnits("10");

describe("NFT Shop", async () => {
    async function deployContracts() {
        /*
        const accounts = await ethers.getSigners();
        const tokenSaleContractFactory = await ethers.getContractFactory("TokenSale");
        const nyTokenContractFactory = await ethers.getContractFactory("MyToken");
        const myNFTContractFactory = await ethers.getContractFactory("myNFT");

        const myTokenContract = await nyTokenContractFactory.deploy()
        const myNFTContract= await nyTokenContractFactory.deploy()

        const tokenSaleContract = await tokenSaleContractFactory.deploy(
            TEST_RATIO, TEST_PRICE, ethers.ZeroAddress, ethers.ZeroAddress
        );
        await tokenSaleContract.waitForDeployment();
        return { accounts, tokenSaleContract };
        */

        const [
            accounts,
            myTokenContractFactory,
            myNFTContractFactory,
            tokenSaleContractFactory,
        ] = await Promise.all([
            ethers.getSigners(),
            ethers.getContractFactory("MyToken"),
            ethers.getContractFactory("MyNFT"),
            ethers.getContractFactory("TokenSale"),
        ]);
        const myTokenContract = await myTokenContractFactory.deploy();
        await myTokenContract.waitForDeployment();
        const myNFTContract = await myNFTContractFactory.deploy();
        await myNFTContract.waitForDeployment();
        const tokenSaleContract = await tokenSaleContractFactory.deploy(
            TEST_RATIO,
            TEST_PRICE,
            myTokenContract.target,
            myNFTContract.target
        );
        await tokenSaleContract.waitForDeployment();
        const MINTER_ROLE = await myTokenContract.MINTER_ROLE();
        const roleTx = await myTokenContract.grantRole(
            MINTER_ROLE, tokenSaleContract.target
        );
        await roleTx.wait();
        // const MY_NFT_MINTER_ROLE = await myNFTContract.MINTER_ROLE();
        // MY_NFT_MINTER_ROLE === MINTER_ROLE
        const roleNFTTx = await myNFTContract.grantRole(
            MINTER_ROLE, tokenSaleContract.target
        );
        await roleNFTTx.wait();

        return {
            accounts, myTokenContract, myNFTContract, tokenSaleContract,
            myTokenContractFactory, myNFTContractFactory
        };
    }

    async function buyTokens() {
        const { accounts, tokenSaleContract, myTokenContract, myNFTContract } =
            await loadFixture(deployContracts);
        const balanceBefore = await ethers.provider.getBalance(accounts[1]);
        const tx = await tokenSaleContract
            .connect(accounts[1])
            .buyTokens({ value: TEST_BUY_VALUE });
        const txReceipt = await tx.wait();
        const gasUsed = txReceipt?.gasUsed ?? 0n;
        const gasPrice = txReceipt?.gasPrice ?? 0n;
        const gasCost = gasUsed * gasPrice; // TODO gasCosts with an s
        const balanceAfter = await ethers.provider.getBalance(accounts[1]);
        return {
            accounts,
            tokenSaleContract,
            myTokenContract,
            myNFTContract,
            balanceBefore,
            balanceAfter,
            gasCost
        };
    }

    describe("When the Shop contract is deployed", async () => {
        it("defines the ratio as provided in parameters", async () => {
            const { tokenSaleContract } = await loadFixture(deployContracts);
            await tokenSaleContract.waitForDeployment();
            const ratio = await tokenSaleContract.ratio();
            expect(ratio).to.be.equal(TEST_RATIO);
        })
        it("defines the price as provided in parameters", async () => {
            const { tokenSaleContract } = await loadFixture(deployContracts);
            await tokenSaleContract.waitForDeployment();
            const price = await tokenSaleContract.price();
            expect(price).to.be.equal(TEST_PRICE);
        });
        it("uses a valid ERC20 as payment token", async () => {
            const { tokenSaleContract, myTokenContractFactory } = await loadFixture(deployContracts);
            const tokenAddress = await tokenSaleContract.paymentToken();
            const paymentTokenContract = myTokenContractFactory.attach(tokenAddress) as MyToken;
            expect(await paymentTokenContract.totalSupply()).not.to.be.reverted;
            expect(await paymentTokenContract.balanceOf(ethers.ZeroAddress)).not.to.be.reverted;
        });
        it("uses a valid ERC721 as NFT collection", async () => {
            throw new Error("Not implemented");
        });
    });

    describe("When a user buys an ERC20 from the Token contract", async () => {
        it("charges the correct amount of ETH", async () => {
            const { accounts, myTokenContract, balanceBefore, balanceAfter, gasCost } = await loadFixture(buyTokens);
            const diff = balanceBefore - balanceAfter;
            const expectedDiff = TEST_BUY_VALUE + gasCost;
            const error = diff - expectedDiff;
            expect(error).to.equal(0);
        })
        it("gives the correct amount of tokens", async () => {
            const { accounts, myTokenContract } = await loadFixture(buyTokens);
            const balance = await myTokenContract.balanceOf(accounts[1].address);
            expect(balance).to.equal(TEST_BUY_VALUE * TEST_RATIO);
        });
    })

    describe("When a user burns an ERC20 at the Shop contract", async () => {
        async function burnTokens() {
            const {
                accounts, tokenSaleContract, myTokenContract
            } = await loadFixture(buyTokens);
            const expectedBalance = TEST_BUY_VALUE * TEST_RATIO;
            const ethBalanceBefore = await ethers.provider.getBalance(accounts[1].address);

            const allowTx = await myTokenContract
                .connect(accounts[1])
                .approve(tokenSaleContract.target, expectedBalance);
            const allowTxReceipt = await allowTx.wait(); // I added that
            const allowTxGasUsed = allowTxReceipt?.gasUsed ?? 0n;
            // const allowTxPricePerGas = allowTxReceipt?.gasPrice ?? 0n;
            const allowTxGasPrice = allowTxReceipt?.gasPrice ?? 0n;
            const allowTxGasCosts = allowTxGasUsed * allowTxGasPrice;

            const burnTx = await tokenSaleContract
                .connect(accounts[1])
                .returnTokens(expectedBalance);
            const burnTxReceipt = await burnTx.wait();
            const burnTxGasUsed = burnTxReceipt?.gasUsed ?? 0n;
            const burnTxGasPrice = burnTxReceipt?.gasPrice ?? 0n;
            // const burnTxPricePerGas = burnTxReceipt?.gasPrice ?? 0n;
            const burnTxGasCosts = burnTxGasUsed * burnTxGasPrice;

            const ethBalanceAfter = await ethers.provider.getBalance(accounts[1].address);
            const gasCosts = allowTxGasCosts + burnTxGasCosts;

            return {
                accounts,
                tokenSaleContract,
                myTokenContract,
                ethBalanceBefore,
                gasCosts,
                ethBalanceAfter
            };
        }

        it("gives the correct amount of ETH", async () => {
            const { ethBalanceBefore, ethBalanceAfter, gasCosts } = await loadFixture(burnTokens);
            const diff = ethBalanceAfter - ethBalanceBefore;
            const expectedDiff = TEST_BUY_VALUE - gasCosts;
            const error = diff - expectedDiff;
            expect(error).to.equal(0);
        });
        it("burns the correct amount of tokens", async () => {
            const { accounts, tokenSaleContract, myTokenContract } = await loadFixture(burnTokens);
            const balanceAfterBurn = await myTokenContract.balanceOf(accounts[1].address);
            expect(balanceAfterBurn).to.equal(0);
        });
    })

    describe("When a user buys an NFT from the Shop contract", async () => {
        async function buyNFT() {
            const { accounts, tokenSaleContract, myTokenContract, myNFTContract } =
                await loadFixture(buyTokens);
            // const balanceBefore = await ethers.provider.getBalance(accounts[1]);
            const allowTx = await myTokenContract
                .connect(accounts[1])
                .approve(tokenSaleContract.target, TEST_PRICE);
            const allowTxReceipt = await allowTx.wait();
            // const gasUsed = allowTxReceipt?.gasUsed ?? 0n;
            // const gasPrice = allowTxReceipt?.gasPrice ?? 0n;
            // const gasCost = gasUsed * gasPrice; // TODO gasCosts with an s
            // const balanceAfter = await ethers.provider.getBalance(accounts[1]);
            const buyTx = tokenSaleContract.connect(accounts[1]).buyNFT(0);
            return {
                accounts,
                tokenSaleContract,
                myTokenContract,
                myNFTContract,
                // balanceBefore,
                // balanceAfter,
                // gasCost
            };
        }

        it("charges the correct amount of ERC20 tokens", async () => {
            throw new Error("Not implemented");
        })
        it("gives the correct NFT", async () => {
            const {
                accounts, tokenSaleContract, myTokenContract, myNFTContract
            } = await loadFixture(buyNFT);
            const nftOwner = await myNFTContract.ownerOf(0);
            expect(nftOwner).to.equal(accounts[1].address);
        });
    })

    describe("When a user burns their NFT at the Shop contract", async () => {
        it("gives the correct amount of ERC20 tokens", async () => {
            throw new Error("Not implemented");
        });
    })
    describe("When the owner withdraws from the Shop contract", async () => {
        it("recovers the right amount of ERC20 tokens", async () => {
            throw new Error("Not implemented");
        })
        it("updates the owner pool account correctly", async () => {
            throw new Error("Not implemented");
        });
    });
});
