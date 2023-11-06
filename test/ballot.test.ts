import { expect } from "chai";
import { ethers } from "hardhat";
import { Ballot } from "../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
// import "hardhat/console.sol"; // to use Solidity console

// https://ethereum-waffle.readthedocs.io/en/latest/matchers.html
// import { solidity } from "ethereum-waffle";
// chai.use(solidity);

// const CHAIRMAN_ADDRESS = '0xACBed006aC55C6480cc172141a61F02137CAb0Cc';
const PROPOSAL_NAMES = ['proposal 1', 'proposal 2', 'proposal 3'];
// const NUL_ADDRESS = '0x0000000000000000000000000000000000000000'; // -> ethers.ZeroAddress

async function deployContract(): Promise <{
    chairmanSigner: HardhatEthersSigner;
    voterSigners: Array<HardhatEthersSigner>;
    ballot: Ballot;
}> {
    // TODO
    const signers = await ethers.getSigners();
    const [chairmanSigner, ...voterSigners] = signers;
    const ballotFactory = await ethers.getContractFactory('Ballot', chairmanSigner);
    // const ballotFactory = await ethers.getContractFactory('Ballot');
    const proposalsAsBytes = PROPOSAL_NAMES.map(ethers.encodeBytes32String);
    const ballotContract = await ballotFactory.deploy(proposalsAsBytes);
    const ballot = await ballotContract.waitForDeployment();
    return { chairmanSigner, voterSigners, ballot };
}

function randomVoteIndex(): number {
    return Math.floor(Math.random() * PROPOSAL_NAMES.length);
}

describe("Ballot", async () => {

    describe("when the contract is deployed", async () => {
        it("has the provided proposals", async () => {
            // TODO
            const { ballot } = await loadFixture(deployContract);
            const { length } = PROPOSAL_NAMES;
            for (let i = 0; i < length; i++) {
                const proposalAsBytes = await ballot.proposals(i);
                const proposalName = ethers.decodeBytes32String(proposalAsBytes[0]);
                // proposalAsBytes[1] -> voteCount (bigint)
                const proposalName2 = ethers.decodeBytes32String(proposalAsBytes.name);
                expect(proposalName).to.equal(proposalName2);
                expect(proposalName).to.equal(PROPOSAL_NAMES[i]);
            }
            // throw Error("Not implemented");
        });

        it("has zero votes for all proposals", async () => {
            // TODO
            const { ballot } = await loadFixture(deployContract);
            const { length } = PROPOSAL_NAMES;
            for (let i = 0; i < length; i++) {
                const proposal = await ballot.proposals(i);
                expect(proposal.voteCount).to.equal(0);
            }
            // throw Error("Not implemented");
        });

        it("sets the deployer address as chairperson", async () => {
            // TODO
            const { chairmanSigner, ballot } = await loadFixture(deployContract);
            const chairmanAddress = await ballot.chairperson();
            expect(chairmanSigner.address).to.equal(chairmanAddress);
            // throw Error("Not implemented");
        });

        it("sets the voting weight for the chairperson as 1", async () => {
            // TODO
            const { chairmanSigner, ballot} = await loadFixture(deployContract);
            const chairmanVoter = await ballot.voters(chairmanSigner);
            expect(chairmanVoter.weight).to.equal(1);
            // throw Error("Not implemented");
        });
    });

    describe("when the chairperson interacts with the giveRightToVote function in the contract", async () => {
        it("gives right to vote for another address", async () => {
            // TODO
            const { voterSigners, ballot} = await loadFixture(deployContract);
            const voterSigner = voterSigners[0];
            await (await ballot.giveRightToVote(voterSigner)).wait();
            // Q? How come passing voterSigner is working? voterSigner.address is what the function expects!

            const voter = await ballot.voters(voterSigner);
            // const [weight, voted, delegate, vote] = voter; // works too
            const { weight, voted, delegate, vote } = voter;
            expect(voter.weight).to.equal(weight);
            expect(weight).to.equal(1);
            expect(voted).to.equal(false);
            expect(delegate).to.equal(ethers.ZeroAddress);
            expect(vote).to.equal(0);
            // throw Error("Not implemented");
        });

        it("can not give right to vote for someone that has voted", async () => {
            // TODO
            const { voterSigners, ballot } = await loadFixture(deployContract);
            const voterSigner = voterSigners[0];
            await (await ballot.giveRightToVote(voterSigner)).wait();

            const voterBallot = ballot.connect(voterSigner);
            await (await voterBallot.vote(randomVoteIndex())).wait();

            let giveRightToVoteResponse;//: ContractTransactionResponse;
            try {
                giveRightToVoteResponse = await ballot.giveRightToVote(voterSigner);
                await giveRightToVoteResponse.wait();
            } catch (error) {
                expect((error as Error).message).to.be.match(/The voter already voted/);
            }
            expect(giveRightToVoteResponse).to.be.undefined;

            // message: 'VM Exception while processing transaction: reverted with reason string 'Has no right to vote''
            //  expect((error as Error).message).to.be.match(/Has no right to vote/);

            // expect(async () => {
            // }).to.throw(/Has no right to vote/);

            // expect(() => {
            // }).to.rejectedWith(/Has no right to vote/);

            // expect(() => {
            // }).to.be.rejected('Has no right to vote');

            // throw Error("Not implemented");
        });

        it("can not give right to vote for someone that has already voting rights", async () => {
            // TODO
            const { voterSigners, ballot } = await loadFixture(deployContract);
            const voterSigner = voterSigners[0];
            await (await ballot.giveRightToVote(voterSigner)).wait();

            let giveRightToVoteResponse;
            try {
                giveRightToVoteResponse = await ballot.giveRightToVote(voterSigner);
            } catch (error) {
                expect((error as Error).message).to.be.match(/Transaction reverted without a reason string/);
            }
            expect(giveRightToVoteResponse).to.be.undefined;
            // throw Error("Not implemented");
        });
    });

    describe("when the voter interacts with the vote function in the contract", async () => {
        // TODO
        it("should register the vote", async () => {
            const { voterSigners, ballot } = await loadFixture(deployContract);
            const voterSigner = voterSigners[0];
            await (await ballot.giveRightToVote(voterSigner)).wait();

            const voterBallot = ballot.connect(voterSigner);
            const randomVote = randomVoteIndex();
            await (await voterBallot.vote(randomVote)).wait();

            const voter = await ballot.voters(voterSigner);
            const [weight, voted, delegate, vote] = voter;
            expect(weight).to.equal(1);
            expect(voted).to.equal(true);
            expect(delegate).to.equal(ethers.ZeroAddress);
            expect(vote).to.equal(randomVote);
            // throw Error("Not implemented");
        });
    });

    describe("when the voter interacts with the delegate function in the contract", async () => {
        // TODO
        it("should transfer voting power", async () => {
            const { voterSigners, ballot } = await loadFixture(deployContract);
            const [voterSigner, delegateSigner] = voterSigners;
            await (await ballot.giveRightToVote(voterSigner)).wait();
            await (await ballot.giveRightToVote(delegateSigner)).wait();

            const voterBallot = ballot.connect(voterSigner);
            await (await voterBallot.delegate(delegateSigner)).wait();
            // same question as before with delegateSigner.address

            const voter = await ballot.voters(voterSigner);
            expect(voter.weight).to.equal(1);
            expect(voter.voted).to.equal(true);
            expect(voter.delegate).to.equal(delegateSigner.address);
            // expect(voter.vote).to.equal(0);
            // That is actually confusing that the index is a valid vote but not necessarily
            // what the delegate has voted/will vote

            // Note that the delegate can only vote once but his vote count for 2
            const delegateBallot = ballot.connect(delegateSigner);
            const randomVote = randomVoteIndex();
            await (await delegateBallot.vote(randomVote)).wait();

            const delegate = await ballot.voters(delegateSigner);
            expect(delegate.weight).to.equal(2);
            expect(delegate.voted).to.equal(true);
            expect(delegate.delegate).to.equal(ethers.ZeroAddress);
            expect(delegate.vote).to.equal(randomVote);
            // throw Error("Not implemented");
        });
    });

    describe("when an account other than the chairperson interacts with the giveRightToVote function in the contract", async () => {
        // TODO
        it("should revert", async () => {
            const { voterSigners, ballot } = await loadFixture(deployContract);
            const [voterSigner1, voterSigner2] = voterSigners;
            const voterBallot = ballot.connect(voterSigner1);

            let giveRightToVoteResponse;
            try {
                giveRightToVoteResponse = await voterBallot.giveRightToVote(voterSigner2);
            } catch (error) {
                expect((error as Error).message).to.be.match(/Only chairperson can give right to vote/);
            }
            expect(giveRightToVoteResponse).to.be.undefined;
            // throw Error("Not implemented");
        });
    });

    describe("when an account without right to vote interacts with the vote function in the contract", async () => {
        // TODO
        it("should revert", async () => {
            const { voterSigners, ballot } = await loadFixture(deployContract);
            const [voterSigner1] = voterSigners;
            const voterBallot = ballot.connect(voterSigner1);

            let voteResponse;
            try {
                voteResponse = await voterBallot.vote(randomVoteIndex());
            } catch (error) {
                expect((error as Error).message).to.be.match(/Has no right to vote/);
            }
            expect(voteResponse).to.be.undefined;
            // throw Error("Not implemented");
        });
    });

    describe("when an account without right to vote interacts with the delegate function in the contract", async () => {
        // TODO
        it("should revert", async () => {
            const { voterSigners, ballot } = await loadFixture(deployContract);
            const [voterSigner1, voterSigner2] = voterSigners;
            const voterBallot = ballot.connect(voterSigner1);

            let delegateResponse;
            try {
                delegateResponse = await voterBallot.delegate(voterSigner2);
            } catch (error) {
                expect((error as Error).message).to.be.match(/You have no right to vote/);
            }
            expect(delegateResponse).to.be.undefined;
            // throw Error("Not implemented");
        });
    });

    describe("when someone interacts with the winningProposal function before any votes are cast", async () => {
        // TODO
        it("should return 0", async () => {
            const { ballot } = await loadFixture(deployContract);
            const winningProposal = await ballot.winningProposal();
            expect(winningProposal).to.equal(0);
            // throw Error("Not implemented");
        });
    });

    describe("when someone interacts with the winningProposal function after one vote is cast for the first proposal", async () => {
        // TODO
        it("should return 0", async () => {
            const { ballot } = await loadFixture(deployContract);
            await (await ballot.vote(0)).wait();
            const winningProposal = await ballot.winningProposal();
            expect(winningProposal).to.equal(0);
            // throw Error("Not implemented");
        });
    });

    describe("when someone interacts with the winnerName function before any votes are cast", async () => {
        // TODO
        it("should return name of proposal 0", async () => {
            const { ballot } = await loadFixture(deployContract);
            const winningProposalAsBytes = await ballot.winnerName();
            const winningProposal = ethers.decodeBytes32String(winningProposalAsBytes);
            expect(winningProposal).to.equal(PROPOSAL_NAMES[0]);
            // throw Error("Not implemented");
        });
    });

    describe("when someone interacts with the winnerName function after one vote is cast for the first proposal", async () => {
        // TODO
        it("should return name of proposal 0", async () => {
            const { ballot } = await loadFixture(deployContract);
            await (await ballot.vote(0)).wait();
            const winningProposalAsBytes = await ballot.winnerName();
            const winningProposal = ethers.decodeBytes32String(winningProposalAsBytes);
            expect(winningProposal).to.equal(PROPOSAL_NAMES[0]);
            // throw Error("Not implemented");
        });
    });

    describe("when someone interacts with the winningProposal function and winnerName after 5 random votes are cast for the proposals", async () => {
        // TODO
        it("should return the name of the winner proposal", async () => {
            const { voterSigners, ballot } = await loadFixture(deployContract);
            const voteCount = 5;
            let responsePromises = new Array(voteCount);
            for (let i = 0; i < voteCount; i++) {
                responsePromises[i] = ballot.giveRightToVote(voterSigners[i]);
            }
            const giveRightToVoteResponse = await Promise.all(responsePromises);
            giveRightToVoteResponse.forEach(async (response) => { await response.wait(); });

            responsePromises = new Array(voteCount);
            for (let i = 0; i < voteCount; i++) {
                const voterSigner = voterSigners[i];
                const voterBallot = ballot.connect(voterSigner);
                responsePromises[i] = voterBallot.vote(randomVoteIndex());
            }
            const voteResponse = await Promise.all(responsePromises);
            voteResponse.forEach(async (response) => { await response.wait(); });

            const winningProposalAsBytes = await ballot.winnerName();
            const winningProposal = ethers.decodeBytes32String(winningProposalAsBytes);
            console.log(`winningProposal: ${winningProposal}`);
            expect(winningProposal).to.be.a.string;

            // throw Error("Not implemented");
        });
    });
});
