// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MarketRegimeRegistry {
    error Unauthorized();
    error ZeroAddress();
    error InvalidConfidence();
    error InvalidStrategyMask();
    error ReasonTooLong();
    error InvalidRange();
    error NoRecords();

    uint256 public constant MAX_REASON_LENGTH = 512;
    uint256 public constant MAX_PAGE_SIZE = 100;

    enum MarketRegime {
        MarketMaker,
        Trading
    }

    struct RegimeRecord {
        MarketRegime regime;
        uint8 selectedStrategyMask;
        uint16 regimeConfidenceBps;
        uint16 strategyConfidenceBps;
        uint16[3] strategyConfidenceById;
        uint64 recordedAt;
        string regimeReason;
        string strategyReason;
    }

    address public immutable owner;
    address public authorizedPublisher;
    RegimeRecord[] private _history;

    event MarketRegimeRecorded(
        uint256 indexed index,
        MarketRegime indexed regime,
        uint8 selectedStrategyMask,
        uint16 regimeConfidenceBps,
        uint16 strategyConfidenceBps,
        uint64 recordedAt,
        string regimeReason,
        string strategyReason
    );
    event AuthorizedPublisherUpdated(address indexed oldPublisher, address indexed newPublisher);

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyPublisher() {
        if (msg.sender != authorizedPublisher) revert Unauthorized();
        _;
    }

    constructor(address authorizedPublisher_) {
        if (authorizedPublisher_ == address(0)) revert ZeroAddress();
        owner = msg.sender;
        authorizedPublisher = authorizedPublisher_;
    }

    function recordDecision(
        MarketRegime regime,
        uint8 selectedStrategyMask,
        uint16 regimeConfidenceBps,
        uint16 strategyConfidenceBps,
        uint16[3] calldata strategyConfidenceById,
        string calldata regimeReason,
        string calldata strategyReason
    ) external onlyPublisher returns (uint256 index) {
        if (selectedStrategyMask > 7) revert InvalidStrategyMask();
        if (regime == MarketRegime.MarketMaker && selectedStrategyMask != 0) revert InvalidStrategyMask();
        if (regimeConfidenceBps > 10_000 || strategyConfidenceBps > 10_000) revert InvalidConfidence();
        for (uint256 strategyId; strategyId < 3; ++strategyId) {
            if (strategyConfidenceById[strategyId] > 10_000) revert InvalidConfidence();
            if ((selectedStrategyMask & uint8(1 << strategyId)) == 0 && strategyConfidenceById[strategyId] != 0) revert InvalidStrategyMask();
        }
        if (bytes(regimeReason).length > MAX_REASON_LENGTH || bytes(strategyReason).length > MAX_REASON_LENGTH) revert ReasonTooLong();

        uint64 recordedAt = uint64(block.timestamp);
        index = _history.length;
        _history.push(RegimeRecord({
            regime: regime,
            selectedStrategyMask: selectedStrategyMask,
            regimeConfidenceBps: regimeConfidenceBps,
            strategyConfidenceBps: strategyConfidenceBps,
            strategyConfidenceById: strategyConfidenceById,
            recordedAt: recordedAt,
            regimeReason: regimeReason,
            strategyReason: strategyReason
        }));

        emit MarketRegimeRecorded(
            index,
            regime,
            selectedStrategyMask,
            regimeConfidenceBps,
            strategyConfidenceBps,
            recordedAt,
            regimeReason,
            strategyReason
        );
    }

    function historyCount() external view returns (uint256) {
        return _history.length;
    }

    function regimeAt(uint256 index) external view returns (RegimeRecord memory) {
        return _history[index];
    }

    function decisionExists(uint256 index) external view returns (bool) {
        return index < _history.length;
    }

    function isStrategySelected(uint256 index, uint8 strategyId) external view returns (bool) {
        if (index >= _history.length || strategyId >= 3) return false;
        return (_history[index].selectedStrategyMask & (uint8(1) << strategyId)) != 0;
    }

    function latestRegime() external view returns (RegimeRecord memory) {
        if (_history.length == 0) revert NoRecords();
        return _history[_history.length - 1];
    }

    function getRegimes(uint256 offset, uint256 limit) external view returns (RegimeRecord[] memory records) {
        if (limit == 0 || limit > MAX_PAGE_SIZE || offset > _history.length) revert InvalidRange();

        uint256 end = offset + limit;
        if (end > _history.length) end = _history.length;
        records = new RegimeRecord[](end - offset);

        for (uint256 index = offset; index < end; ++index) {
            records[index - offset] = _history[index];
        }
    }

    function updateAuthorizedPublisher(address newPublisher) external onlyOwner {
        if (newPublisher == address(0)) revert ZeroAddress();
        address oldPublisher = authorizedPublisher;
        authorizedPublisher = newPublisher;
        emit AuthorizedPublisherUpdated(oldPublisher, newPublisher);
    }
}