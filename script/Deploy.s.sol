// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";
import {AgentFactory} from "../src/AgentFactory.sol";
import {AquaTradingAdapter} from "../src/adapters/AquaTradingAdapter.sol";
import {XYCSwap} from "../src/adapters/XYCSwap.sol";
import {IAqua} from "../src/interfaces/IAqua.sol";
import {MarketRegimeRegistry} from "../src/MarketRegimeRegistry.sol";

contract Deploy is Script {
    struct Deployment {
        address app;
        address adapter;
        address factory;
        address regimeRegistry;
    }

    function run() external returns (Deployment memory deployment) {
        
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address assetA = vm.envAddress("ASSET_A");
        address assetB = vm.envAddress("ASSET_B");
        address aqua = vm.envAddress("AQUA");
        address authorizedAgent = vm.envAddress("AUTHORIZED_AGENT");

        vm.startBroadcast(deployerPrivateKey);
        XYCSwap app = new XYCSwap(IAqua(aqua));
        AquaTradingAdapter adapter = new AquaTradingAdapter(address(app), aqua);
        MarketRegimeRegistry regimeRegistry = new MarketRegimeRegistry(authorizedAgent);
        AgentFactory factory = new AgentFactory(assetA, assetB, address(adapter), aqua, address(regimeRegistry), authorizedAgent);
        vm.stopBroadcast();

        deployment = Deployment({
            app: address(app),
            adapter: address(adapter),
            factory: address(factory),
            regimeRegistry: address(regimeRegistry)
        });
    }
}
