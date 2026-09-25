// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Metadata {
    function decimals() external view returns (uint8);
    function approve(address spender, uint256 amount) external returns (bool);
}
