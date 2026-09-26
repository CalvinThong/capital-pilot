// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {AgentFactory} from "../src/AgentFactory.sol";
import {AquaTradingAdapter} from "../src/adapters/AquaTradingAdapter.sol";
import {XYCSwap} from "../src/adapters/XYCSwap.sol";
import {IAqua} from "../src/interfaces/IAqua.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";
import {MockAqua} from "../test/mocks/MockAqua.sol";
import {MarketRegimeRegistry} from "../src/MarketRegimeRegistry.sol";

contract DeployLocal is Script {
    struct Deployment {
        address assetA;
        address assetB;
        address aqua;
        address app;
        address adapter;
        address factory;
        address regimeRegistry;
    }

    function run() external returns (Deployment memory deployment) {
        vm.startBroadcast();
        MockERC20 assetA = new MockERC20("Mock USDT", "USDT");
        MockERC20 assetB = new MockERC20("Mock BTC", "BTC");
        MockAqua aqua = new MockAqua();
        XYCSwap app = new XYCSwap(IAqua(address(aqua)));
        AquaTradingAdapter adapter = new AquaTradingAdapter(address(app), address(aqua));
        MarketRegimeRegistry regimeRegistry = new MarketRegimeRegistry(tx.origin);
        AgentFactory factory = new AgentFactory(address(assetA), address(assetB), address(adapter), address(aqua), address(regimeRegistry), tx.origin);
        vm.stopBroadcast();

        deployment = Deployment({
            assetA: address(assetA),
            assetB: address(assetB),
            aqua: address(aqua),
            app: address(app),
            adapter: address(adapter),
            factory: address(factory),
            regimeRegistry: address(regimeRegistry)
        });
    }
}
