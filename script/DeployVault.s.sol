// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {AgentFactory} from "../src/AgentFactory.sol";
import {StrategyType} from "../src/types/AgentTypes.sol";

contract DeployVault is Script {
    struct Deployment {
        address factory;
        address vault;
        address owner;
        address authorizedAgent;
        uint8 strategy;
        uint256 minTrade;
        uint256 maxTrade;
    }

    function run() external returns (Deployment memory deployment) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address factoryAddress = vm.envAddress("FACTORY_ADDRESS");
        uint8 strategy = uint8(vm.envUint("STRATEGY"));
        uint256 minTrade = vm.envUint("MIN_TRADE");
        uint256 maxTrade = vm.envUint("MAX_TRADE");
        address owner = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);
        address vault = AgentFactory(factoryAddress).createVault(
            StrategyType(strategy),
            minTrade,
            maxTrade
        );
        vm.stopBroadcast();

        deployment = Deployment({
            factory: factoryAddress,
            vault: vault,
            owner: owner,
            authorizedAgent: AgentFactory(factoryAddress).authorizedAgent(),
            strategy: strategy,
            minTrade: minTrade,
            maxTrade: maxTrade
        });
    }
}
