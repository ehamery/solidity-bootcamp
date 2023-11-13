import hardhat from 'hardhat';
import { ethers } from 'ethers';
// import { Command } from 'commander';
import { Command } from '@commander-js/extra-typings';
import {
    MyTokenVotes,
    MyTokenVotes__factory,
    TokenizedBallot,
    TokenizedBallot__factory
} from '../typechain-types';
import 'dotenv/config';
import { getProvider, getWallet } from './helper';
// require('dotenv').config();
import {
    getPackageJson,
    parseIntBase10,
    commaSeparatedListToArray
 } from './commanderHelper';

// Develop and run scripts for “TokenizedBallot.sol” within your group
// to give voting tokens, delegating voting power, casting votes,
// checking vote power and querying results

type Proposal = [string, bigint] & {
    name: string;
    voteCount: bigint;
};

const MINT_VALUE = ethers.parseUnits('1');

// console.log('START');
const packageJson = getPackageJson();

export async function getMyTokenContractFrom(contractAddress: string): Promise<MyTokenVotes> {
    const provider = getProvider();
    const wallet = getWallet(provider);
    const contractFactory = new MyTokenVotes__factory(wallet);
    const contract = await contractFactory.attach(contractAddress);
    return contract as MyTokenVotes;
}

async function mint(
    myTokenVotesContract: MyTokenVotes,
    recipientAddress: string,
    tokensBigInt: bigint
): Promise<ethers.ContractTransactionReceipt | null> {
    const amountString = ethers.formatUnits(tokensBigInt).toLocaleString();
    console.log(`minting ${amountString} MTKV to account '${recipientAddress}'...`);
    const mintTransaction = await myTokenVotesContract.mint(recipientAddress, tokensBigInt);
    const mintReceipt = await mintTransaction.wait();
    console.log(`...tokens minted`);
    return mintReceipt;
}

async function balance(
    myTokenVotesContract: MyTokenVotes,
    recipientAddress: string,
    tokensBigInt: bigint
): Promise<ethers.ContractTransactionReceipt | null> {
    const amountString = ethers.formatUnits(tokensBigInt).toLocaleString();
    console.log(`minting ${amountString} MTKV to account '${recipientAddress}'...`);
    const mintTransaction = await myTokenVotesContract.mint(recipientAddress, tokensBigInt);
    const mintReceipt = await mintTransaction.wait();
    console.log(`...tokens minted`);
    return mintReceipt;
}

async function getTokenizedBallotContractFrom(
    contractAddress: string
): Promise<TokenizedBallot> {
    const provider = getProvider();
    const wallet = getWallet(provider);
    const contractFactory = new TokenizedBallot__factory(wallet);
    const contract = await contractFactory.attach(contractAddress);
    return contract as TokenizedBallot;
}

/*
// WARNING: we don't have a function to retrive the number of proposal
async function getProposals(ballotContract: Ballot, count = 20): Promise<Array<Proposal>> {
    ballotContract.proposals
    let proposalStructs: Array<Proposal> = [];
    // loop until its throws...
    let realLength = count;
    try {
        for (let i = 0; i < count; i++) {
            proposalStructs[i] = await ballotContract.proposals(i);
        }
    } catch (error) {
        console.debug(`${proposalStructs.length} proposals`);
    }
    console.log('deployed proposals:');
    proposalStructs.forEach((proposalStruct, index) => {
        const name = ethers.decodeBytes32String(proposalStruct.name);
        console.log(`proposal[${index}]: '${name}'`);
    });

    return proposalStructs;
}
*/

/*
 * https://github.com/tj/commander.js
 * Angled brackets (e.g. <cmd>) indicate required input.
 * Square brackets (e.g. [env]) indicate optional input.
 * But the are just indication, commander does not check/inforce them
 * And default values only work if you use '-no-' or '<' or '['
 *
 * WARMING: If the 3rd paremeter of an .option() is a function, the 4th argument
 * is used as:
 * - the 2nd argument of the function if the option is used
 * - the default value if the option is not used
 * So 'parseInt, 10' will return parseInt(var, 10) if the option is used, but 10
 * as a default value if the option is not used..
 */
const command = new Command();

command
    .name('myErc20TokenVotes')
    .description('CLI to ballot contract')
    .version(packageJson.version);

command
    .command('wallet')
    .description('display address info')
    .action(async (/*command: any*/): Promise<void> => {
        console.log('***** wallet ---->');
        try {
            const provider = getProvider();
            const wallet = getWallet(provider);
            console.log(`- address ${wallet.address}`);
            const balanceBigInt = await provider.getBalance(wallet.address);
            const balanceString = ethers.formatUnits(balanceBigInt);
            console.log(`- balance ${balanceString} ETH`);
            if (balanceBigInt < 0.01) {
                console.warn('balance is too low to deploy the ballot contract')
            }
        } catch (error) {
            console.error('error:', error);
            process.exitCode = 1;
        }
        console.log('<---- wallet *****');
    });

command
    .command('deploy-contract')
    .description('deploy MyTokenVotes contract')
    .option('-m, --mint-amount <number>', 'number of token to mint', ethers.parseUnits, ethers.parseUnits('100'))
    .option('--dry-run', 'does not deploy the contract', false)
    .action(async (options, commands): Promise<void> => {
        console.log('***** deploy-contract ---->');
        try {
            const { dryRun, mintAmount } = options;
            const provider = getProvider();
            const wallet = getWallet(provider);
            // const ballotFactory = await ethers.getContractFactory('TokenizedBallot', chairmanSigner);
            // const ballotFactory = await ethers.getContractFactory('TokenizedBallot');
            const myTokenVotesFactory = new MyTokenVotes__factory(wallet);

            if (dryRun) {
                console.warn('this was a dry run, no contract was deployed');
                console.log('<---- deploy-contract *****');
                return;
            }

            const myTokenVotesContract = await myTokenVotesFactory.deploy();
            console.log('myTokenVotesContract being deployed...');
            const deploymentTransaction = await myTokenVotesContract.waitForDeployment();
            const contractAddress = await deploymentTransaction.getAddress();
            console.log(
                `...myTokenVotesContract deployed at '${contractAddress}' by '${wallet.address}'`
            );

            if (mintAmount) {
                await mint(myTokenVotesContract, wallet.address, mintAmount);
            }
        } catch (error) {
            console.error('error:', error);
            process.exitCode = 1;
        }
        console.log('<---- deploy-contract *****');
    });

command
    .command('mint-tokens')
    .description('give token to an address')
    .argument('<my-token-votes-contract-address>', 'MyTokenVotes contract address')
    .argument('<recipient-address>', 'token recipient address') // TODO use signer as default
    .argument('<amount>', 'number of token to mint', ethers.parseUnits)//, ethers.parseUnits('100'))
    .option('--dry-run', 'does not really mint', false)
    .action(async (
        myTokenVotesContractAddress, recipientAddress, amount,
        options, commands
    ): Promise<void> => {
        console.log('***** mint-tokens ---->');
        try {
            const { dryRun } = options;
            const myTokenVotesContract = await getMyTokenContractFrom(myTokenVotesContractAddress);

            if (dryRun) {
                const amountString = ethers.formatUnits(amount).toLocaleString();
                console.log(`${amountString} MTKV are going to be minted to '${recipientAddress}'`);
                console.warn('this was a dry run, the command was not really executed');
                console.log('<---- mint-tokens *****');
                return;
            }

            await mint(myTokenVotesContract, recipientAddress, amount);

            const balance = await myTokenVotesContract.balanceOf(recipientAddress);
            const balanceDecimals = ethers.formatUnits(balance).toLocaleString();
            console.log(`new balance: ${balanceDecimals} MTKV`);
        } catch (error) {
            console.error('error:', error);
            process.exitCode = 1;
        }
        console.log('<---- mint-tokens *****');
    });

command
    .command('balance')
    .description('display MTVK balance')
    .argument('<my-token-votes-contract-address>', 'MyTokenVotes contract address')
    .argument('[address]', 'wallet address') // defaults to signer
    .action(async (myTokenVotesContractAddress, address): Promise<void> => {
        console.log('***** balance ---->');
        try {
            const provider = getProvider();
            const wallet = getWallet(provider);
            const walletAddress = address || wallet.address;
            const myTokenVotesContract = await getMyTokenContractFrom(myTokenVotesContractAddress);
            const balance = await myTokenVotesContract.balanceOf(walletAddress);
            const balanceString = ethers.formatUnits(balance).toLocaleString();
            console.log(`balance: ${balanceString} MTKV`);
        } catch (error) {
            console.error('error:', error);
            process.exitCode = 1;
        }
        console.log('<---- balance *****');
    });

// WARNING delegate needs to be call to get the voting power for an address
command
    .command('voting-power')
    .description('display voting power for an address')
    .argument('<my-token-votes-contract-address>', 'MyTokenVotes contract address')
    .argument('[address]', 'wallet address') // defaults to signer
    .action(async (myTokenVotesContractAddress, address): Promise<void> => {
        console.log('***** voting-power ---->');
        try {
            const provider = getProvider();
            const wallet = getWallet(provider);
            const walletAddress = address || wallet.address;
            const myTokenVotesContract = await getMyTokenContractFrom(myTokenVotesContractAddress);
            const votes = await myTokenVotesContract.getVotes(walletAddress);
            const votesString = ethers.formatUnits(votes).toLocaleString();
            // TODO display everything in the same format!
            console.log(`voting power of account '${walletAddress}': ${votesString}`);
        } catch (error) {
            console.error('error:', error);
            process.exitCode = 1;
        }
        console.log('<---- voting-power *****');
    });

command
    .command('delegate')
    .description('give token voting power')
    .argument('<my-token-votes-contract-address>', 'MyTokenVotes contract address')
    .action(async (
        myTokenVotesContractAddress, options, commands
    ): Promise<void> => {
        console.log('***** delegate ---->');
        try {
            const provider = getProvider();
            const wallet = getWallet(provider);
            // const recipientAddress = options.addressTo ?? wallet.address;
            const myTokenVotesContract = await getMyTokenContractFrom(myTokenVotesContractAddress);
            const delegateTransaction = await myTokenVotesContract.connect(wallet).delegate(wallet.address);
            const delegateReceipt = await delegateTransaction.wait();
            const votes = await myTokenVotesContract.getVotes(wallet.address);
            const votesString = ethers.formatUnits(votes).toLocaleString();
            console.log(`voting power of account '${wallet.address}': ${votesString}`);
        } catch (error) {
            console.error('error:', error);
            process.exitCode = 1;
        }
        console.log('<---- delegate *****');
    });


command
    .command('transfer')
    .description('give token to an address')
    .argument('<my-token-votes-contract-address>', 'MyTokenVotes contract address')
    .argument('<recipient-address>', 'token recipient address') // TODO use signer as default
    .argument('<amount>', 'number of token to mint', ethers.parseUnits)//, ethers.parseUnits('100'))
    .option('--dry-run', 'does not really mint', false)
    .action(async (
        myTokenVotesContractAddress, recipientAddress, amount,
        options, commands
    ): Promise<void> => {
        console.log('***** mint-tokens ---->');
        try {
            const { dryRun } = options;
            const provider = getProvider();
            const wallet = getWallet(provider);
            const myTokenVotesContract = await getMyTokenContractFrom(myTokenVotesContractAddress);

            const amountString = ethers.formatUnits(amount).toLocaleString();
            if (dryRun) {
                console.log(`${amountString} MTKV are going to be transfered to '${recipientAddress}'`);
                console.warn('this was a dry run, the command was not really executed');
                console.log('<---- mint-tokens *****');
                return;
            }
            const transferTx = await myTokenVotesContract
                .connect(wallet)
                .transfer(recipientAddress, amount);
            await transferTx.wait();
            const votes1AfterTransfer = await myTokenVotesContract.getVotes(wallet.address);
            console.log(
                `Account ${wallet.address} has ${votes1AfterTransfer.toString()
                } units of voting power after transferring`
            );
        } catch (error) {
            console.error('error:', error);
            process.exitCode = 1;
        }
        console.log('<---- mint-tokens *****');
    });


command
    .command('past-votes')
    .description('display past votes for an address')
    .argument('<my-token-votes-contract-address>', 'MyTokenVotes contract address')
    .argument('<timepoint>', 'timepoint')
    .argument('[address]', 'wallet address') // defaults to signer
    .action(async (myTokenVotesContractAddress, timepoint, address): Promise<void> => {
        console.log('***** voting-power ---->');
        try {
            const provider = getProvider();
            const wallet = getWallet(provider);
            const walletAddress = address || wallet.address;
            const myTokenVotesContract = await getMyTokenContractFrom(myTokenVotesContractAddress);
            const pastVotes = await myTokenVotesContract.getPastVotes(wallet.address, timepoint);
            const pastVotesString = ethers.formatUnits(pastVotes).toLocaleString();
            console.log(`'${timepoint}' past vote forof account '${walletAddress}': ${pastVotesString}`);
        } catch (error) {
            console.error('error:', error);
            process.exitCode = 1;
        }
        console.log('<---- voting-power *****');
    });

try {
    // console.log('process.argv:', process.argv);
    command.parse(process.argv);
} catch (error) {
    console.error('command.parse error:', error);
}