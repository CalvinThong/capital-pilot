// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {TestnetERC20} from "../src/mocks/TestnetERC20.sol";

contract MintTestTokens is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address assetA = vm.envAddress("ASSET_A");
        address assetB = vm.envAddress("ASSET_B");
        address recipient = vm.envAddress("MINT_TO");
        // Whole-token amounts; converted with each token's decimals.
        uint256 humanAmountA = vm.envOr("MINT_AMOUNT_A", uint256(100_000));
        uint256 humanAmountB = vm.envOr("MINT_AMOUNT_B", uint256(1));

        TestnetERC20 tokenA = TestnetERC20(assetA);
        TestnetERC20 tokenB = TestnetERC20(assetB);
        uint256 amountA = humanAmountA * 10 ** tokenA.decimals();
        uint256 amountB = humanAmountB * 10 ** tokenB.decimals();

        vm.startBroadcast(deployerPrivateKey);
        if (amountA > 0) tokenA.mint(recipient, amountA);
        if (amountB > 0) tokenB.mint(recipient, amountB);
        vm.stopBroadcast();

        console.log("Recipient:", recipient);
        console.log("Minted", tokenA.symbol(), amountA);
        console.log("Minted", tokenB.symbol(), amountB);
    }
}
