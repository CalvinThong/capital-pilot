// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAqua} from "../../src/interfaces/IAqua.sol";
import {MockERC20} from "./MockERC20.sol";

/// Minimal but behaviorally faithful reimplementation of Aqua's virtual-balance ledger:
/// tokens always stay in the maker's/taker's own wallet; only allowances are pulled/pushed.
contract MockAqua is IAqua {
    mapping(address => mapping(address => mapping(bytes32 => mapping(address => uint256)))) private _balances;
    mapping(address => mapping(address => mapping(bytes32 => bool))) private _active;

    function ship(address app, bytes calldata strategy, address[] calldata tokens, uint256[] calldata amounts) external returns (bytes32 strategyHash) {
        strategyHash = keccak256(strategy);
        for (uint256 i = 0; i < tokens.length; i++) {
            _balances[msg.sender][app][strategyHash][tokens[i]] = amounts[i];
        }
        _active[msg.sender][app][strategyHash] = true;
    }

    function dock(address app, bytes32 strategyHash, address[] calldata tokens) external {
        for (uint256 i = 0; i < tokens.length; i++) {
            _balances[msg.sender][app][strategyHash][tokens[i]] = 0;
        }
        _active[msg.sender][app][strategyHash] = false;
    }

    function pull(address maker, bytes32 strategyHash, address token, uint256 amount, address to) external {
        address app = msg.sender;
        require(_balances[maker][app][strategyHash][token] >= amount, "INSUFFICIENT_BALANCE");
        _balances[maker][app][strategyHash][token] -= amount;
        require(MockERC20(token).transferFrom(maker, to, amount), "PULL_TRANSFER");
    }

    function push(address maker, address app, bytes32 strategyHash, address token, uint256 amount) external {
        require(_active[maker][app][strategyHash], "INACTIVE_STRATEGY");
        _balances[maker][app][strategyHash][token] += amount;
        require(MockERC20(token).transferFrom(msg.sender, maker, amount), "PUSH_TRANSFER");
    }

    function rawBalances(address maker, address app, bytes32 strategyHash, address token) external view returns (uint248 balance, uint8 tokensCount) {
        return (uint248(_balances[maker][app][strategyHash][token]), _active[maker][app][strategyHash] ? 2 : 0);
    }

    function safeBalances(address maker, address app, bytes32 strategyHash, address token0, address token1) external view returns (uint256 balance0, uint256 balance1) {
        require(_active[maker][app][strategyHash], "INACTIVE_STRATEGY");
        return (_balances[maker][app][strategyHash][token0], _balances[maker][app][strategyHash][token1]);
    }
}
