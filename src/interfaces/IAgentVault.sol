// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {StrategyType, VaultMode, PositionState} from "../types/AgentTypes.sol";

interface IAgentVault {
    function owner() external view returns (address);
    function authorizedAgent() external view returns (address);
    function strategyType() external view returns (StrategyType);
    function vaultMode() external view returns (VaultMode);
    function positionState() external view returns (PositionState);
    function pnl() external view returns (int256);
    function executeTrade(uint256 amountIn, uint256 minAmountOut, bytes calldata tradeData) external;
    function closeTrade(uint256 minAmountOut, bytes calldata tradeData) external;
    function switchMarketMaker(bool active) external;
}
