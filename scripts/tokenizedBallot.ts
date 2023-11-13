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
import { getMyTokenContractFrom } from './myErc20TokenVotes';

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

/*
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
*/

async function getTokenizedBallotContractFrom(
    contractAddress: string
): Promise<TokenizedBallot> {
    const provider = getProvider();
    const wallet = getWallet(provider);
    const contractFactory = new TokenizedBallot__factory(wallet);
    const contract = await contractFactory.attach(contractAddress);
    return contract as TokenizedBallot;
}

// WARNING: we don't have a function to retrive the number of proposal
async function getProposals(tokenizedBallot: TokenizedBallot, count = 20): Promise<Array<Proposal>> {
    tokenizedBallot.proposals
    let proposalStructs: Array<Proposal> = [];
    // loop until its throws...
    let realLength = count;
    try {
        for (let i = 0; i < count; i++) {
            proposalStructs[i] = await tokenizedBallot.proposals(i);
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
    .name('tokenized-ballot')
    .description('CLI to ballot contract')
    .version(packageJson.version);

command
    .command('deploy-contract')
    .description('deploy MyTokenVotes contract')
    .argument('<my-token-votes-contract-address>', 'MyTokenVotes contract address')
    .argument('<timepoint>', 'timepoint')
    .requiredOption('-p, --proposals []', 'comma separated proposals', commaSeparatedListToArray)
    // .option('-m, --mint-amount <number>', 'number of token to mint', ethers.parseUnits, ethers.parseUnits('100'))
    .option('--dry-run', 'does not deploy the contract', false)
    .action(async (
        myTokenVotesContractAddress, timepoint,
        options, commands
    ): Promise<void> => {
        console.log('***** deploy-contract ---->');
        try {
            const { proposals, dryRun } = options;
            if (!Array.isArray(proposals)) {
                throw Error('proposals is not an array');
            }
            console.log('proposals:', proposals);

            if (dryRun) {
                console.warn('this was a dry run, no contract was deployed');
                console.log('<---- deploy-contract *****');
                return;
            }

            const provider = getProvider();
            const wallet = getWallet(provider);
            const myTokenVotesContract = await getMyTokenContractFrom(myTokenVotesContractAddress);
            const tokenizedBallotFactory = new TokenizedBallot__factory(wallet);
            const proposoalsAsBytes = proposals.map(ethers.encodeBytes32String);
            console.log('contract being deployed...');
            const tokenizedBallotContract = await tokenizedBallotFactory.deploy(
                proposoalsAsBytes, myTokenVotesContract, timepoint
            );
            console.log('tokenizedBallotContract being deployed...');
            const deploymentTransaction = await tokenizedBallotContract.waitForDeployment();
            const contractAddress = await deploymentTransaction.getAddress();
            console.log(
                `...tokenizedBallotContract deployed at '${contractAddress}' by '${wallet.address}'`
            );

            let proposalPromises: Array<Promise<Proposal>> = [];
            for (let i = 0; i < proposals.length; i++) {
                proposalPromises[i] = tokenizedContract.proposals(i);
            }
            const proposalStructs = await Promise.all(proposalPromises);
            console.log('deployed proposals:');
            proposalStructs.forEach((proposalStruct, index) => {
                const name = ethers.decodeBytes32String(proposalStruct.name);
                console.log(`proposal[${index}]: '${name}'`);
            });









        } catch (error) {
            console.error('error:', error);
            process.exitCode = 1;
        }
        console.log('<---- deploy-contract *****');
    });




try {
    // console.log('process.argv:', process.argv);
    command.parse(process.argv);
} catch (error) {
    console.error('command.parse error:', error);
}