// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MarketRegimeRegistry {
    error Unauthorized();
    error ZeroAddress();
    error InvalidConfidence();
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
        uint16 confidenceBps;
        uint64 recordedAt;
        string reason;
    }

    address public immutable owner;
    address public authorizedPublisher;
    RegimeRecord[] private _history;

    event MarketRegimeRecorded(
        uint256 indexed index,
        MarketRegime indexed regime,
        uint16 confidenceBps,
        uint64 recordedAt,
        string reason
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

    function recordRegime(MarketRegime regime, uint16 confidenceBps, string calldata reason) external onlyPublisher {
        if (confidenceBps > 10_000) revert InvalidConfidence();
        if (bytes(reason).length > MAX_REASON_LENGTH) revert ReasonTooLong();

        uint64 recordedAt = uint64(block.timestamp);
        uint256 index = _history.length;
        _history.push(RegimeRecord({
            regime: regime,
            confidenceBps: confidenceBps,
            recordedAt: recordedAt,
            reason: reason
        }));

        emit MarketRegimeRecorded(index, regime, confidenceBps, recordedAt, reason);
    }

    function historyCount() external view returns (uint256) {
        return _history.length;
    }

    function regimeAt(uint256 index) external view returns (RegimeRecord memory) {
        return _history[index];
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