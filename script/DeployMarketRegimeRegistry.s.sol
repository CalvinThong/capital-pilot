// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {MarketRegimeRegistry} from "../src/MarketRegimeRegistry.sol";

contract DeployMarketRegimeRegistry is Script {
    function run() external returns (MarketRegimeRegistry registry) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address authorizedAgent = vm.envAddress("AUTHORIZED_AGENT");

        vm.startBroadcast(deployerPrivateKey);
        registry = new MarketRegimeRegistry(authorizedAgent);
        vm.stopBroadcast();
    }
}