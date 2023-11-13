import type { Provider } from 'ethers';
import { ethers, Wallet } from 'ethers';
// import { Command } from 'commander';
import { Command } from '@commander-js/extra-typings';
import 'dotenv/config';

export type Proposal = [string, bigint] & {
    name: string;
    voteCount: bigint;
};

export function getProvider(): Provider {
    const { RPC_ENDPOINT_URL } = process.env;
    if (!RPC_ENDPOINT_URL) {
        throw new Error(`RPC_ENDPOINT_URL is not an environment variable`);
    }
    return new ethers.JsonRpcProvider(RPC_ENDPOINT_URL);
}

export function getWallet(provider?: Provider): Wallet {
    const { PRIVATE_KEY } = process.env;
    if (!PRIVATE_KEY) {
        throw new Error(`PRIVATE_KEY is not an environment variable`);
    }
    return new ethers.Wallet(PRIVATE_KEY, provider);
}

/*
export function addWalletCommand(command: Command) {
    command
    .command('wallet')
    .description('display address info')
    .action(async (/*command: any* /): Promise<void> => {
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
}
*/
