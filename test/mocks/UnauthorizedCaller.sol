// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVaultActions {
    function executeTrade(uint256 amountIn, uint256 minAmountOut, bytes calldata tradeData, uint256 decisionId, uint16 confidenceBps, string calldata reason) external;
    function closeTrade(uint256 minAmountOut, bytes calldata tradeData, uint256 decisionId, uint16 confidenceBps, string calldata reason) external;
    function deposit(uint256 amountA, uint256 amountB) external;
    function withdraw(address asset, uint256 amount, address receiver) external;
}

contract UnauthorizedCaller {
    function executeTrade(address vault, uint256 amountIn) external {
        IVaultActions(vault).executeTrade(amountIn, 0, "", 0, 0, "unauthorized");
    }

    function closeTrade(address vault) external {
        IVaultActions(vault).closeTrade(0, "", 0, 0, "unauthorized");
    }

    function deposit(address vault, uint256 amountA, uint256 amountB) external {
        IVaultActions(vault).deposit(amountA, amountB);
    }

    function withdraw(address vault, address asset, uint256 amount, address receiver) external {
        IVaultActions(vault).withdraw(asset, amount, receiver);
    }
}
