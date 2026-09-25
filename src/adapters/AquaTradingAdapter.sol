// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ITradingAdapter} from "../interfaces/ITradingAdapter.sol";

/// Trusted pointer to the deployed XYCSwap-compatible Aqua app and the Aqua registry.
/// AgentVault calls the app and Aqua directly; this contract holds no funds and takes no custody.
contract AquaTradingAdapter is ITradingAdapter {
    error ZeroAddress();

    address public immutable app;
    address public immutable aqua;

    constructor(address app_, address aqua_) {
        if (app_ == address(0) || aqua_ == address(0)) revert ZeroAddress();
        app = app_;
        aqua = aqua_;
    }

    function executionApp() external view returns (address) {
        return app;
    }
}
