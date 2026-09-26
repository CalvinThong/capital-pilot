// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMarketRegimeRegistry {
    function decisionExists(uint256 index) external view returns (bool);
    function isStrategySelected(uint256 index, uint8 strategyId) external view returns (bool);
}
