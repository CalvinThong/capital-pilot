// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MarketRegimeRegistry} from "../src/MarketRegimeRegistry.sol";

contract RegimePublisherCaller {
    function record(MarketRegimeRegistry registry) external {
        registry.recordDecision(MarketRegimeRegistry.MarketRegime.Trading, 1, 8_000, 8_000, [uint16(8_000), 0, 0], "unauthorized", "unauthorized");
    }
}

contract MarketRegimeRegistryTest {
    MarketRegimeRegistry private registry;

    function setUp() public {
        registry = new MarketRegimeRegistry(address(this));
    }

    function testRecordsTimestampedHistoryAndLatestValue() public {
        setUp();
        registry.recordDecision(MarketRegimeRegistry.MarketRegime.MarketMaker, 0, 7_500, 0, [uint16(0), 0, 0], "Range-bound market", "");
        registry.recordDecision(MarketRegimeRegistry.MarketRegime.Trading, 5, 8_250, 7_800, [uint16(8_100), 0, 7_200], "Strong directional trend", "Momentum and DCA selected");

        require(registry.historyCount() == 2);

        MarketRegimeRegistry.RegimeRecord memory first = registry.regimeAt(0);
        require(first.regime == MarketRegimeRegistry.MarketRegime.MarketMaker);
        require(first.regimeConfidenceBps == 7_500);
        require(first.recordedAt == block.timestamp);
        require(keccak256(bytes(first.regimeReason)) == keccak256(bytes("Range-bound market")));

        MarketRegimeRegistry.RegimeRecord memory latest = registry.latestRegime();
        require(latest.regime == MarketRegimeRegistry.MarketRegime.Trading);
        require(latest.regimeConfidenceBps == 8_250);
        require(latest.selectedStrategyMask == 5);
        require(latest.strategyConfidenceById[0] == 8_100);
        require(latest.strategyConfidenceById[2] == 7_200);
        require(registry.isStrategySelected(1, 0));
        require(!registry.isStrategySelected(1, 1));
        require(registry.isStrategySelected(1, 2));
    }

    function testReturnsPaginatedHistory() public {
        setUp();
        registry.recordDecision(MarketRegimeRegistry.MarketRegime.MarketMaker, 0, 6_000, 0, [uint16(0), 0, 0], "one", "");
        registry.recordDecision(MarketRegimeRegistry.MarketRegime.Trading, 1, 7_000, 7_000, [uint16(7_000), 0, 0], "two", "momentum");
        registry.recordDecision(MarketRegimeRegistry.MarketRegime.MarketMaker, 0, 8_000, 0, [uint16(0), 0, 0], "three", "");

        MarketRegimeRegistry.RegimeRecord[] memory records = registry.getRegimes(1, 10);
        require(records.length == 2);
        require(records[0].regime == MarketRegimeRegistry.MarketRegime.Trading);
        require(keccak256(bytes(records[1].regimeReason)) == keccak256(bytes("three")));
    }

    function testRejectsUnauthorizedPublisher() public {
        setUp();
        RegimePublisherCaller caller = new RegimePublisherCaller();
        try caller.record(registry) {
            revert("expected revert");
        } catch {}
    }

    function testRejectsInvalidConfidence() public {
        setUp();
        try registry.recordDecision(MarketRegimeRegistry.MarketRegime.Trading, 1, 10_001, 8_000, [uint16(8_000), 0, 0], "invalid", "invalid") {
            revert("expected revert");
        } catch {}
    }

    function testRejectsStrategiesForMarketMakerRegime() public {
        setUp();
        try registry.recordDecision(MarketRegimeRegistry.MarketRegime.MarketMaker, 1, 8_000, 8_000, [uint16(8_000), 0, 0], "range", "invalid strategy") {
            revert("expected revert");
        } catch {}
    }
}