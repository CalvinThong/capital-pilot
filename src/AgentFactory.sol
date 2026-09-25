// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgentVault} from "./AgentVault.sol";
import {StrategyType} from "./types/AgentTypes.sol";

contract AgentFactory {
    error ZeroAddress();

    address public immutable owner;
    address public immutable assetA;
    address public immutable assetB;
    address public immutable adapter;
    address public immutable aqua;
    address public authorizedAgent;

    mapping(address => address[]) public userVaults;
    mapping(address => bool) public isVault;
    address[] public allVaults;

    event VaultCreated(address indexed owner, address indexed vault, StrategyType strategy);
    event AuthorizedAgentUpdated(address indexed oldAgent, address indexed newAgent);

    modifier onlyOwner() {
        if (msg.sender != owner) revert ZeroAddress();
        _;
    }

    constructor(address assetA_, address assetB_, address adapter_, address aqua_, address authorizedAgent_) {
        if (assetA_ == address(0) || assetB_ == address(0) || adapter_ == address(0) || aqua_ == address(0) || authorizedAgent_ == address(0)) revert ZeroAddress();
        owner = msg.sender;
        assetA = assetA_;
        assetB = assetB_;
        adapter = adapter_;
        aqua = aqua_;
        authorizedAgent = authorizedAgent_;
    }

    function createVault(StrategyType strategy, uint256 minTrade, uint256 maxTrade) external returns (address vault) {
        vault = address(new AgentVault(msg.sender, authorizedAgent, assetA, assetB, adapter, aqua, strategy, minTrade, maxTrade));
        userVaults[msg.sender].push(vault);
        isVault[vault] = true;
        allVaults.push(vault);
        emit VaultCreated(msg.sender, vault, strategy);
    }

    function userVaultCount(address user) external view returns (uint256) {
        return userVaults[user].length;
    }

    function allVaultsCount() external view returns (uint256) {
        return allVaults.length;
    }

    function updateAuthorizedAgent(address newAgent) external onlyOwner {
        if (newAgent == address(0)) revert ZeroAddress();
        address oldAgent = authorizedAgent;
        authorizedAgent = newAgent;
        emit AuthorizedAgentUpdated(oldAgent, newAgent);
    }
}
