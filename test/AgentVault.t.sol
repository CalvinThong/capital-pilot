// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgentVault} from "../src/AgentVault.sol";
import {AgentFactory} from "../src/AgentFactory.sol";
import {StrategyType, VaultMode, PositionState} from "../src/types/AgentTypes.sol";
import {AquaTradingAdapter} from "../src/adapters/AquaTradingAdapter.sol";
import {XYCSwap} from "../src/adapters/XYCSwap.sol";
import {IAqua} from "../src/interfaces/IAqua.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockAqua} from "./mocks/MockAqua.sol";
import {UnauthorizedCaller} from "./mocks/UnauthorizedCaller.sol";

contract AgentVaultTest {
    MockERC20 private usdt;
    MockERC20 private btc;
    MockAqua private aqua;
    XYCSwap private app;
    AquaTradingAdapter private adapter;
    AgentFactory private factory;
    AgentVault private vault;
    UnauthorizedCaller private unauthorized;

    function setUp() public {
        usdt = new MockERC20("Mock USDT", "USDT");
        btc = new MockERC20("Mock BTC", "BTC");
        aqua = new MockAqua();
        app = new XYCSwap(IAqua(address(aqua)));
        adapter = new AquaTradingAdapter(address(app), address(aqua));
        factory = new AgentFactory(address(usdt), address(btc), address(adapter), address(aqua), address(this));
        vault = AgentVault(factory.createVault(StrategyType.Momentum, 100, 1000));
        unauthorized = new UnauthorizedCaller();
        usdt.mint(address(this), 5000);
        usdt.approve(address(vault), 5000);
    }

    function _makerStrategy(address maker) private view returns (XYCSwap.Strategy memory) {
        return XYCSwap.Strategy({
            maker: maker,
            token0: address(usdt),
            token1: address(btc),
            feeBps: vault.DEFAULT_MARKET_MAKER_FEE_BPS(),
            salt: bytes32(0)
        });
    }

    function _tradeData(address maker) private view returns (bytes memory) {
        return abi.encode(_makerStrategy(maker), bytes(""));
    }

    /// Creates and ships a deeply-liquid market-maker vault to serve as a stable counterparty.
    function _newMakerVault() private returns (AgentVault maker) {
        maker = AgentVault(factory.createVault(StrategyType.Momentum, 100, 1000));
        usdt.mint(address(maker), 1_000_000);
        btc.mint(address(maker), 1_000_000);
        maker.switchMarketMaker(true);
    }

    function testConstructorStoresRiskConfiguration() public {
        setUp();
        require(vault.owner() == address(this));
        require(vault.authorizedAgent() == address(this));
        require(vault.minTrade() == 100);
        require(vault.maxTrade() == 1000);
        require(vault.vaultMode() == VaultMode.Trading);
        require(vault.positionState() == PositionState.Flat);
    }

    function testRejectsInvalidBounds() public {
        try new AgentVault(address(this), address(this), address(1), address(2), address(3), address(4), StrategyType.DCA, 200, 100) {
            revert("expected revert");
        } catch {}
    }

    function testDepositRejectsZeroAmounts() public {
        setUp();
        try vault.deposit(0, 0) {
            revert("expected revert");
        } catch {}
    }

    function testDepositAndOwnerWithdrawal() public {
        setUp();
        vault.deposit(1000, 0);
        require(usdt.balanceOf(address(vault)) == 1000);
        vault.withdraw(address(usdt), 400, address(this));
        require(usdt.balanceOf(address(vault)) == 600);
    }

    function testDepositBothAssetsInSingleCall() public {
        setUp();
        btc.mint(address(this), 300);
        btc.approve(address(vault), 300);
        vault.deposit(1000, 300);
        require(usdt.balanceOf(address(vault)) == 1000);
        require(btc.balanceOf(address(vault)) == 300);
    }

    function testAgentCannotWithdraw() public {
        setUp();
        vault.deposit(1000, 0);
        try unauthorized.withdraw(address(vault), address(usdt), 1, address(unauthorized)) {
            revert("expected revert");
        } catch {}
    }

    function testTradeBoundsAndAuthorization() public {
        setUp();
        vault.deposit(2000, 0);
        try vault.executeTrade(99, 1, "") {
            revert("expected revert");
        } catch {}
        try vault.executeTrade(1001, 1, "") {
            revert("expected revert");
        } catch {}
        try unauthorized.executeTrade(address(vault), 100) {
            revert("expected revert");
        } catch {}
    }

    function testOpenAndCloseTradeLifecycle() public {
        setUp();
        AgentVault maker = _newMakerVault();
        vault.deposit(2000, 0);

        uint256 expectedOut = app.quoteExactIn(_makerStrategy(address(maker)), true, 1000);
        vault.executeTrade(1000, expectedOut, _tradeData(address(maker)));
        require(vault.positionState() == PositionState.Long);
        require(vault.positionAmountIn() == 1000);
        require(vault.positionAmountOut() == expectedOut);
        require(btc.balanceOf(address(vault)) == expectedOut);

        try vault.executeTrade(100, 1, "") {
            revert("expected revert");
        } catch {}

        uint256 expectedBackOut = app.quoteExactIn(_makerStrategy(address(maker)), false, expectedOut);
        vault.closeTrade(expectedBackOut, _tradeData(address(maker)));
        require(vault.positionState() == PositionState.Flat);
        require(vault.positionAmountIn() == 0);
        require(vault.positionAmountOut() == 0);
        require(vault.entryPrice() == 0);
        require(vault.pnl() == int256(expectedBackOut) - 1000);
        require(usdt.balanceOf(address(vault)) == 1000 + expectedBackOut);
    }

    function testPnlAccumulatesAcrossClosedTrades() public {
        setUp();
        AgentVault maker = _newMakerVault();
        vault.deposit(2000, 0);

        uint256 firstPositionOut = app.quoteExactIn(_makerStrategy(address(maker)), true, 500);
        vault.executeTrade(500, firstPositionOut, _tradeData(address(maker)));
        uint256 firstCloseOut = app.quoteExactIn(_makerStrategy(address(maker)), false, firstPositionOut);
        vault.closeTrade(firstCloseOut, _tradeData(address(maker)));
        int256 firstTradePnl = int256(firstCloseOut) - 500;
        require(vault.pnl() == firstTradePnl);

        uint256 secondPositionOut = app.quoteExactIn(_makerStrategy(address(maker)), true, 500);
        vault.executeTrade(500, secondPositionOut, _tradeData(address(maker)));
        uint256 secondCloseOut = app.quoteExactIn(_makerStrategy(address(maker)), false, secondPositionOut);
        vault.closeTrade(secondCloseOut, _tradeData(address(maker)));
        int256 secondTradePnl = int256(secondCloseOut) - 500;
        require(vault.pnl() == firstTradePnl + secondTradePnl);
    }

    function testActivePositionReservesAssetB() public {
        setUp();
        AgentVault maker = _newMakerVault();
        vault.deposit(1000, 0);
        uint256 expectedOut = app.quoteExactIn(_makerStrategy(address(maker)), true, 1000);
        vault.executeTrade(1000, expectedOut, _tradeData(address(maker)));
        try vault.withdraw(address(btc), 1, address(this)) {
            revert("expected revert");
        } catch {}
    }

    function testMarketMakerStateMachine() public {
        setUp();
        vault.deposit(1000, 0);
        btc.mint(address(vault), 500);
        vault.switchMarketMaker(true);
        require(vault.vaultMode() == VaultMode.MarketMaker);
        vault.switchMarketMaker(false);
        require(vault.vaultMode() == VaultMode.Trading);
        require(usdt.balanceOf(address(vault)) == 1000);
        require(btc.balanceOf(address(vault)) == 500);
    }

    function testFactoryCreatesAndTracksVaults() public {
        setUp();
        AgentFactory secondFactory = new AgentFactory(address(usdt), address(btc), address(adapter), address(4), address(this));
        address created = secondFactory.createVault(StrategyType.DCA, 50, 500);
        require(secondFactory.userVaultCount(address(this)) == 1);
        require(secondFactory.allVaultsCount() == 1);
        require(secondFactory.userVaults(address(this), 0) == created);
    }

    function testExecuteTradeRejectsWrongAssetPair() public {
        setUp();
        vault.deposit(1000, 0);
        MockERC20 other = new MockERC20("Other", "OTH");
        XYCSwap.Strategy memory badStrategy = XYCSwap.Strategy({
            maker: address(vault),
            token0: address(usdt),
            token1: address(other),
            feeBps: vault.DEFAULT_MARKET_MAKER_FEE_BPS(),
            salt: bytes32(0)
        });
        try vault.executeTrade(100, 1, abi.encode(badStrategy, bytes(""))) {
            revert("expected revert");
        } catch {}
    }

    function testXycSwapCallbackRejectsUnauthorizedCaller() public {
        setUp();
        try vault.xycSwapCallback(address(usdt), address(btc), 1, 1, address(vault), address(app), bytes32(0), "") {
            revert("expected revert");
        } catch {}
    }

    function testVaultCanTakeAnotherVaultsMakerOrder() public {
        setUp();

        // vaultA (the shared `vault`) ships into Aqua market-maker mode, becoming a maker.
        vault.deposit(1000, 0);
        btc.mint(address(vault), 500);
        vault.switchMarketMaker(true);
        require(vault.vaultMode() == VaultMode.MarketMaker);

        // vaultB is a separate, independently funded vault from the same factory.
        AgentVault vaultB = AgentVault(factory.createVault(StrategyType.Momentum, 100, 1000));
        usdt.mint(address(this), 1000);
        usdt.approve(address(vaultB), 1000);
        vaultB.deposit(1000, 0);

        // vaultB (the taker) executes a trade naming vaultA as the strategy maker.
        uint256 expectedOut = app.quoteExactIn(_makerStrategy(address(vault)), true, 1000);
        vaultB.executeTrade(1000, expectedOut, _tradeData(address(vault)));

        // vaultB spends its own USDT and receives BTC; vaultA's shipped position is untouched.
        require(vaultB.positionState() == PositionState.Long);
        require(usdt.balanceOf(address(vaultB)) == 0);
        require(btc.balanceOf(address(vaultB)) == expectedOut);
    }
}

