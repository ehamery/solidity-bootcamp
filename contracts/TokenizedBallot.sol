// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

interface IMyTokenVotes {
    function getPastVotes(address, uint256) external view returns (uint256);
}

contract TokenizedBallot {
    struct Proposal {
        bytes32 name;
        uint voteCount;
    }

    IMyTokenVotes public targetContract;
    Proposal[] public proposals;
    uint256 public targetBlockNumber;

    // What is the flow for the whole voting process?
    // Voters can assign only a fraction of their voting power to a proposal, right?
    // Can voters spread their votes accross multiple proposals?
    // Can a voters distribute his voting power among multiple proposals?
    // If yes, we need a way to keep track of each voters total spent voting power?
    // How do we use checkpoints?
    // If we are supposed to use checkpoints, is it the targetBlockNumber related to
    // them and if it is why is it a member initialized in the constructor instead of
    // just a parameter that can have different values?
    constructor(
        bytes32[] memory _proposalNames,
        // address _targetContract,
        IMyTokenVotes _targetContract,
        uint256 _targetBlockNumber
    ) {
        // targetContract = IMyToken(_targetContract);
        targetContract = _targetContract;
        targetBlockNumber = _targetBlockNumber;
        // TODO: Validate if targetBlockNumber is in the past
        for (uint i = 0; i < _proposalNames.length; i++) {
            proposals.push(Proposal({ name: _proposalNames[i], voteCount: 0 }));
        }
    }

    function vote(uint256 proposal, uint256 amount) external {
        // TODO check vote power
        require(
            votingPower(msg.sender) >= amount,
            "TokenizedBallot: trying to vote more than allowed"
        );
        proposals[proposal].voteCount += amount;
    }

    // Tomo's version
    /// Give your vote (including votes delegated to you)
    /// to proposal `proposals[proposal].name`.
    // function voteTomo(uint proposal) external {
    //     Voter storage sender = voters[msg.sender];
    //     require(sender.weight != 0, "Has no right to vote");
    //     require(!sender.voted, "Already voted.");
    //     sender.voted = true;
    //     sender.vote = proposal;

    //     // If `proposal` is out of the range of the array,
    //     // this will throw automatically and revert all
    //     // changes.
    //     proposals[proposal].voteCount += sender.weight;
    // }

    function votingPower(address account) public view returns (uint256) {
        // TODO check if this is enough for protecting the contract
        return targetContract.getPastVotes(account, targetBlockNumber);
    }

    function winningProposal() public view returns (uint winningProposal_) {
        uint winningVoteCount = 0;
        for (uint p = 0; p < proposals.length; p++) {
            if (proposals[p].voteCount > winningVoteCount) {
                winningVoteCount = proposals[p].voteCount;
                winningProposal_ = p;
            }
        }
    }

    function winnerName() external view returns (bytes32 winnerName_) {
        winnerName_ = proposals[winningProposal()].name;
    }
}