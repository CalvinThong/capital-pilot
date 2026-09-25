// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ITradingAdapter {
    function executionApp() external view returns (address);
}
