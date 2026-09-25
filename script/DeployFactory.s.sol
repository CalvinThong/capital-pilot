// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgentFactory} from "../src/AgentFactory.sol";

contract DeployFactory {
    function deploy(address assetA, address assetB, address adapter, address aqua, address agent) external returns (AgentFactory factory) {
        factory = new AgentFactory(assetA, assetB, adapter, aqua, agent);
    }
}
