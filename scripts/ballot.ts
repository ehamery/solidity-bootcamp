import fs from 'fs';
// import { Command } from 'commander';
import { Command } from '@commander-js/extra-typings';
import type { Provider } from 'ethers';
import { ethers, Wallet } from 'ethers';
import { Ballot, Ballot__factory } from '../typechain-types';
import { getProvider, getWallet } from './helper';
import {
    getPackageJson,
    parseIntBase10,
    commaSeparatedListToArray
 } from './commanderHelper';

type Proposal = [string, bigint] & {
    name: string;
    voteCount: bigint;
}

async function getBallotContractFrom(contractAddress: string): Promise<Ballot> {
    const provider = getProvider();
    const wallet = getWallet(provider);
    const ballotFactory = new Ballot__factory(wallet);
    const ballotContract = await ballotFactory.attach(contractAddress);
    return ballotContract as Ballot;
}

// WARNING: we don't have a function to retrive the number of proposal
async function getProposals(ballotContract: Ballot, count = 20):  Promise<Array<Proposal>> {
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

// console.log('START');
const command = new Command();
const packageJson = getPackageJson();

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
command
    .name('ballot')
    .description('CLI to ballot contract')
    .version(packageJson.version)

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
    .command('deploy')
    .description('deploy ballot contract')
    .requiredOption('-p, --proposals []', 'comma separated proposals', commaSeparatedListToArray)
    .option('--dry-run', 'does not deploy the contract', false)
    .action(async (options, commands): Promise<void> => {
        console.log('***** deploy ---->');
        try {
            const { proposals, dryRun } = options;
            if (!Array.isArray(proposals)) {
                throw Error('proposals is not an array');
            }
            console.log('proposals:', proposals);

            if (dryRun) {
                console.warn('this was a dry run, no contract was deployed');
                console.log('<---- deploy *****');
                return;
            }

            const provider = getProvider();
            const wallet = getWallet(provider);
            // const ballotFactory = await ethers.getContractFactory('Ballot', chairmanSigner);
            // const ballotFactory = await ethers.getContractFactory('Ballot');
            const ballotFactory = new Ballot__factory(wallet);

            const proposoalsAsBytes = proposals.map(ethers.encodeBytes32String);
            const ballotContract = await ballotFactory.deploy(proposoalsAsBytes);
            console.log('contract being deployed...');
            const deploymentTransaction = await ballotContract.waitForDeployment();
            const contractAddress = await deploymentTransaction.getAddress();
            console.log(`...contract deployed at '${contractAddress}' by '${wallet.address}'`);

            let proposalPromises: Array<Promise<Proposal>> = [];
            for (let i = 0; i < proposals.length; i++) {
                proposalPromises[i] = ballotContract.proposals(i);
            }
            const proposalStructs = await Promise.all(proposalPromises);
            console.log('deployed proposals:');
            proposalStructs.forEach((proposalStruct, index) => {
                const name = ethers.decodeBytes32String(proposalStruct.name);
                console.log(`proposal[${index}]: '${name}'`);
            });
            // await getProposals(ballotContract, proposals.length);
        } catch (error) {
            console.error('error:', error);
            process.exitCode = 1;
        }
        console.log('<---- deploy *****');
    });


command
    .command('proposals')
    .description('display proposal info')
    .argument('<contract-address>', 'ballot contract address')
    .action(async (contractAddress, options, commands): Promise<void> => {
        console.log('***** proposals ---->');
        try {
            const ballotContract = await getBallotContractFrom(contractAddress);
            await getProposals(ballotContract);
        } catch (error) {
            console.error('error:', error);
            process.exitCode = 1;
        }
        console.log('<---- proposals *****');
    });

command
    .command('giveRightToVote')
    .description('give right to vote to an address')
    .argument('<contract-address>', 'ballot contract address')
    .argument('<voter-address>', 'address to give the right to vote to')
    .action(async (contractAddress, voterAddress, options, commands): Promise<void> => {
        console.log('***** giveRightToVote ---->');
        try {
            const ballotContract = await getBallotContractFrom(contractAddress);
            const transactionResponse = await ballotContract.giveRightToVote(voterAddress);
            const { hash } = transactionResponse;
            console.log(`giving right to vote to '${voterAddress}'...`);
            const transactionReceipt = await transactionResponse.wait();
            // const  hash2 = contractTransactionReceipt?.hash;
            console.log(`...right to vote given, transaction hash: '${hash}'`);

        } catch (error) {
            console.error('error:', error);
            process.exitCode = 1;
        }
        console.log('<---- giveRightToVote *****');
    });

command
    .command('delegate')
    .description('delegate right to vote to another address with the right to vote')
    .argument('<contract-address>', 'ballot contract address')
    .argument('<voter-address>', 'address to delegate the right to vote to')
    .option('--dry-run', 'do not execute the delegate function', false)
    .action(async (contractAddress, voterAddress, options, commands): Promise<void> => {
        console.log('***** delegate ---->');
        try {
            const { dryRun } = options;
            const provider = getProvider();
            const wallet = getWallet(provider);
            const ballotFactory = new Ballot__factory(wallet);
            const ballotContract = (await ballotFactory.attach(contractAddress)) as Ballot;

            const chairmanAddress = await ballotContract.chairperson();
            const delegatingVoterAddress = wallet.address;
            if (delegatingVoterAddress === chairmanAddress) {
                console.warn(`chairman is delegating his vote`);
            }

            if (dryRun) {
                console.warn('this was a dry run, `delegate` function was not executed');
                console.log('<---- delegate *****');
                return;
            }

            const transactionResponse = await ballotContract.delegate(voterAddress);
            const { hash } = transactionResponse;
            console.log(`delegating right to vote to '${voterAddress}'...`);
            await transactionResponse.wait();
            console.log(`...right to vote delegated, transaction hash: ${hash}`);

        } catch (error) {
            console.error('error:', error);
            process.exitCode = 1;
        }
        console.log('<---- delegate *****');
    });

command
    .command('vote')
    .description('vote')
    .argument('<contract-address>', 'ballot contract address')
    .argument('<proposal-index>', 'address to delegate the right to vote to', parseIntBase10)
    .option('--dry-run', 'does not deploy the contract', false)
    .action(async (
        contractAddress, proposalIndex, options, commands
    ): Promise<void> => {
        console.log('***** vote ---->');
        try {
            const { dryRun } = options;
            const ballotContract = await getBallotContractFrom(contractAddress);

            const proposalStructs = await getProposals(ballotContract);
            const { length } = proposalStructs;
            if (proposalIndex >= length) {
                throw new Error(`${proposalIndex} is not a valid proposal index`);
            }
            const proposal = ethers.decodeBytes32String(proposalStructs[proposalIndex].name);

            if (dryRun) {
                console.warn('this was a dry run, `vote` function was not executed');
                console.log('<---- vote *****');
                return;
            }

            const transactionResponse = await ballotContract.vote(proposalIndex);
            const { hash } = transactionResponse;
            console.log(`voting for proposals[${proposalIndex}]: '${proposal}'...`);
            await transactionResponse.wait();
            console.log(`...voted, transaction hash: '${hash}'`);
        } catch (error) {
            console.error('error:', error);
            process.exitCode = 1;
        }
        console.log('<---- vote *****');
    });

command
    .command('winningProposal')
    .description('winningProposal')
    .argument('<contract-address>', 'ballot contract address')
    .action(async (contractAddress, options, commands): Promise<void> => {
        console.log('***** winningProposal ---->');
        try {
            const ballotContract = await getBallotContractFrom(contractAddress);
            const winningProposal = await ballotContract.winningProposal();
            console.log(`the winningProposal index is '${winningProposal}'`);
        } catch (error) {
            console.error('error:', error);
            process.exitCode = 1;
        }
        console.log('<---- winningProposal *****');
    });

command
    .command('winnerName')
    .description('winnerName')
    .argument('<contract-address>', 'ballot contract address')
    .action(async (contractAddress, options, commands): Promise<void> => {
        console.log('***** winnerName ---->');
        try {
            const ballotContract = await getBallotContractFrom(contractAddress);
            const winnerName = await ballotContract.winnerName();
            console.log(`the winner is '${ethers.decodeBytes32String(winnerName)}'`);
        } catch (error) {
            console.error('error:', error);
            process.exitCode = 1;
        }
        console.log('<---- winnerName *****');
    });

command
    .command('votes')
    .description('votes per proposal')
    .argument('<contract-address>', 'ballot contract address')
    .action(async (contractAddress, options, commands): Promise<void> => {
        console.log('***** votes ---->');
        try {
            const ballotContract = await getBallotContractFrom(contractAddress);
            const proposalStructs = await getProposals(ballotContract);
            console.log('current voting:')
            for (const proposalStruct of proposalStructs) {
                const { name: nameAsBytes, voteCount } = proposalStruct;
                const name = ethers.decodeBytes32String(nameAsBytes);
                console.log(`${name.padEnd(10, ' ')}: ${voteCount.toLocaleString()} vote${(voteCount === 1n) ? '' : 's'}`);
            }
        } catch (error) {
            console.error('error:', error);
            process.exitCode = 1;
        }
        console.log('<---- votes *****');
    });

command
    .command('voters')
    .description('voters')
    .argument('<contract-address>', 'ballot contract address')
    .argument('<voter-address>', 'address to delegate the right to vote to')
    .action(async (contractAddress, voterAddress, options, commands): Promise<void> => {
        console.log('***** voters ---->');
        try {
            const ballotContract = await getBallotContractFrom(contractAddress);
            const voter = await ballotContract.voters(voterAddress);
            const { weight, voted, delegate, vote } = voter;
            const info = JSON.stringify({
                weight: weight.toLocaleString(),
                voted,
                delegateAddress: delegate,
                voteIndex: vote.toLocaleString(),
            });
            console.log(`voter ${voterAddress}:${info}`);
            const proposalStructs = await getProposals(ballotContract);
        } catch (error) {
            console.error('error:', error);
            process.exitCode = 1;
        }
        console.log('<---- voters *****');
    });

try {
    // console.log('process.argv:', process.argv);
    command.parse(process.argv);
} catch (error) {
    console.error('command.parse error:', error);
}

// console.log('END');
