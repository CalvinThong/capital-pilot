// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MarketRegimeRegistry} from "../src/MarketRegimeRegistry.sol";

contract RegimePublisherCaller {
    function record(MarketRegimeRegistry registry) external {
        registry.recordRegime(MarketRegimeRegistry.MarketRegime.Trading, 8_000, "unauthorized");
    }
}

contract MarketRegimeRegistryTest {
    MarketRegimeRegistry private registry;

    function setUp() public {
        registry = new MarketRegimeRegistry(address(this));
    }

    function testRecordsTimestampedHistoryAndLatestValue() public {
        setUp();
        registry.recordRegime(MarketRegimeRegistry.MarketRegime.MarketMaker, 7_500, "Range-bound market");
        registry.recordRegime(MarketRegimeRegistry.MarketRegime.Trading, 8_250, "Strong directional trend");

        require(registry.historyCount() == 2);

        MarketRegimeRegistry.RegimeRecord memory first = registry.regimeAt(0);
        require(first.regime == MarketRegimeRegistry.MarketRegime.MarketMaker);
        require(first.confidenceBps == 7_500);
        require(first.recordedAt == block.timestamp);
        require(keccak256(bytes(first.reason)) == keccak256(bytes("Range-bound market")));

        MarketRegimeRegistry.RegimeRecord memory latest = registry.latestRegime();
        require(latest.regime == MarketRegimeRegistry.MarketRegime.Trading);
        require(latest.confidenceBps == 8_250);
    }

    function testReturnsPaginatedHistory() public {
        setUp();
        registry.recordRegime(MarketRegimeRegistry.MarketRegime.MarketMaker, 6_000, "one");
        registry.recordRegime(MarketRegimeRegistry.MarketRegime.Trading, 7_000, "two");
        registry.recordRegime(MarketRegimeRegistry.MarketRegime.MarketMaker, 8_000, "three");

        MarketRegimeRegistry.RegimeRecord[] memory records = registry.getRegimes(1, 10);
        require(records.length == 2);
        require(records[0].regime == MarketRegimeRegistry.MarketRegime.Trading);
        require(keccak256(bytes(records[1].reason)) == keccak256(bytes("three")));
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
        try registry.recordRegime(MarketRegimeRegistry.MarketRegime.Trading, 10_001, "invalid") {
            revert("expected revert");
        } catch {}
    }
}