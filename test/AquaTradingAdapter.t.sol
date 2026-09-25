// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AquaTradingAdapter} from "../src/adapters/AquaTradingAdapter.sol";

/// AquaTradingAdapter is now a thin, stateless pointer to the Aqua app + registry: AgentVault
/// calls the app and Aqua directly, so trading/security logic is covered by AgentVault.t.sol.
contract AquaTradingAdapterTest {
    function testConstructorStoresImmutables() public {
        AquaTradingAdapter adapter = new AquaTradingAdapter(address(1), address(2));
        require(adapter.app() == address(1));
        require(adapter.aqua() == address(2));
        require(adapter.executionApp() == address(1));
    }

    function testConstructorRejectsZeroAddresses() public {
        try new AquaTradingAdapter(address(0), address(2)) {
            revert("expected revert");
        } catch {}
        try new AquaTradingAdapter(address(1), address(0)) {
            revert("expected revert");
        } catch {}
    }
}
