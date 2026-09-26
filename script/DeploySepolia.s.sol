// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {AgentFactory} from "../src/AgentFactory.sol";
import {MarketRegimeRegistry} from "../src/MarketRegimeRegistry.sol";
import {AquaTradingAdapter} from "../src/adapters/AquaTradingAdapter.sol";
import {XYCSwap} from "../src/adapters/XYCSwap.sol";
import {IAqua} from "../src/interfaces/IAqua.sol";
import {TestnetERC20} from "../src/mocks/TestnetERC20.sol";

contract DeploySepolia is Script {
    uint256 internal constant SEPOLIA_CHAIN_ID = 11155111;

    struct Deployment {
        address assetA;
        address assetB;
        address app;
        address adapter;
        address regimeRegistry;
        address factory;
    }

    function run() external returns (Deployment memory deployment) {
        // require(block.chainid == SEPOLIA_CHAIN_ID, "Not Sepolia");

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address aqua = vm.envAddress("AQUA");
        address authorizedAgent = vm.envAddress("AUTHORIZED_AGENT");
        address deployer = vm.addr(deployerPrivateKey);
        uint256 usdcMint = vm.envOr("MOCK_USDC_MINT", uint256(1_000_000e6));
        uint256 btcMint = vm.envOr("MOCK_BTC_MINT", uint256(100e8));
        require(aqua.code.length > 0, "AQUA has no code");

        vm.startBroadcast(deployerPrivateKey);
        TestnetERC20 usdc = new TestnetERC20("Mock USDC", "mUSDC", 6);
        TestnetERC20 btc = new TestnetERC20("Mock BTC", "mBTC", 8);
        usdc.mint(deployer, usdcMint);
        btc.mint(deployer, btcMint);

        XYCSwap app = new XYCSwap(IAqua(aqua));
        AquaTradingAdapter adapter = new AquaTradingAdapter(address(app), aqua);
        MarketRegimeRegistry regimeRegistry = new MarketRegimeRegistry(authorizedAgent);
        AgentFactory factory = new AgentFactory(
            address(usdc),
            address(btc),
            address(adapter),
            aqua,
            address(regimeRegistry),
            authorizedAgent
        );
        vm.stopBroadcast();

        deployment = Deployment({
            assetA: address(usdc),
            assetB: address(btc),
            app: address(app),
            adapter: address(adapter),
            regimeRegistry: address(regimeRegistry),
            factory: address(factory)
        });

        console.log("ASSET_A (mUSDC):        ", deployment.assetA);
        console.log("ASSET_B (mBTC):         ", deployment.assetB);
        console.log("XYCSwap app:            ", deployment.app);
        console.log("ADAPTER_ADDRESS:        ", deployment.adapter);
        console.log("REGIME_REGISTRY_ADDRESS:", deployment.regimeRegistry);
        console.log("FACTORY_ADDRESS:        ", deployment.factory);
    }
}
