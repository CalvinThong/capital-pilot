// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {AgentFactory} from "../src/AgentFactory.sol";
import {StrategyType} from "../src/types/AgentTypes.sol";

contract CreateMarketMakerVaultA is Script {
    struct Deployment {
        address vault;
        address assetA;
        address assetB;
    }

    function run() external returns (Deployment memory deployment) {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address factoryAddress = vm.envAddress("FACTORY_ADDRESS");
        uint8 strategyId = uint8(vm.envOr("MARKET_MAKER_STRATEGY", uint256(0)));
        uint256 minTrade = vm.envOr("MARKET_MAKER_MIN_TRADE", uint256(1e20));
        uint256 maxTrade = vm.envOr("MARKET_MAKER_MAX_TRADE", uint256(1e22));

        AgentFactory factory = AgentFactory(factoryAddress);
        address assetA = factory.assetA();
        address assetB = factory.assetB();

        vm.startBroadcast(privateKey);
        address vaultAddress = factory.createVault(StrategyType(strategyId), minTrade, maxTrade);
        vm.stopBroadcast();

        deployment = Deployment({vault: vaultAddress, assetA: assetA, assetB: assetB});
    }
}
