// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {AgentVault} from "../src/AgentVault.sol";
import {IERC20Metadata} from "../src/interfaces/IERC20Metadata.sol";

contract FundAndShipMarketMakerVaultA is Script {
    struct Deployment {
        address vault;
        address assetA;
        address assetB;
        uint256 amountA;
        uint256 amountB;
        bytes32 strategyHash;
    }

    function run() external returns (Deployment memory deployment) {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address vaultAddress = vm.envAddress("MARKET_MAKER_ONLY_VAULTS");
        uint256 humanAmountA = vm.envOr("MARKET_MAKER_AMOUNT_A", uint256(10000));
        uint256 humanAmountB = vm.envOr("MARKET_MAKER_AMOUNT_B", uint256(1));

        AgentVault vault = AgentVault(vaultAddress);
        address assetA = address(vault.assetA());
        address assetB = address(vault.assetB());

        uint256 amountA = humanAmountA * 10 ** IERC20Metadata(assetA).decimals();
        uint256 amountB = humanAmountB * 10 ** IERC20Metadata(assetB).decimals();

        vm.startBroadcast(privateKey);
        bytes32 strategyHash = _depositAndShip(vault, assetA, assetB, amountA, amountB);
        vm.stopBroadcast();

        deployment = Deployment({
            vault: vaultAddress,
            assetA: assetA,
            assetB: assetB,
            amountA: amountA,
            amountB: amountB,
            strategyHash: strategyHash
        });
    }

    function _depositAndShip(
        AgentVault vault,
        address assetA,
        address assetB,
        uint256 amountA,
        uint256 amountB
    ) internal returns (bytes32 strategyHash) {
        IERC20Metadata(assetA).approve(address(vault), amountA);
        IERC20Metadata(assetB).approve(address(vault), amountB);
        vault.deposit(amountA, amountB);

        vault.switchMarketMaker(true);
        strategyHash = vault.activeStrategyHash();
    }
}
