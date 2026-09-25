// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

enum StrategyType {
    Momentum,
    TechnicalAnalysis,
    DCA
}

enum VaultMode {
    Trading,
    MarketMaker
}

enum PositionState {
    Flat,
    Long
}
