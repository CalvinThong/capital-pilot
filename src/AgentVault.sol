// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";
import {IAqua} from "./interfaces/IAqua.sol";
import {ITradingAdapter} from "./interfaces/ITradingAdapter.sol";
import {IXYCSwapCallback} from "./interfaces/IXYCSwapCallback.sol";
import {XYCSwap} from "./adapters/XYCSwap.sol";
import {StrategyType, VaultMode, PositionState} from "./types/AgentTypes.sol";

contract AgentVault is IXYCSwapCallback {
    error Unauthorized();
    error ZeroAddress();
    error InvalidAsset();
    error InvalidAssetPair();
    error InvalidAmount();
    error InvalidTradeBounds();
    error BelowMinTrade();
    error AboveMaxTrade();
    error InvalidMode();
    error PositionAlreadyOpen();
    error NoPosition();
    error InsufficientBalance();
    error InsufficientWithdrawableBalance();
    error TransferFailed();
    error Reentrancy();
    error InvalidStrategyData();

    uint256 public constant DEFAULT_MARKET_MAKER_FEE_BPS = 30;


    address public immutable owner;
    IERC20 public immutable assetA;
    IERC20 public immutable assetB;
    ITradingAdapter public immutable adapter;
    IAqua public immutable aqua;
    StrategyType public immutable strategyType;
    uint256 public immutable minTrade;
    uint256 public immutable maxTrade;

    address public authorizedAgent;
    VaultMode public vaultMode;
    PositionState public positionState;
    uint256 public positionAmountIn;
    uint256 public positionAmountOut;
    uint256 public entryPrice;

    uint256 private _lock = 1;
    bytes32 public activeStrategyHash;

    event Deposit(address indexed user, address indexed asset, uint256 amount);
    event Withdraw(address indexed user, address indexed asset, uint256 amount, address receiver);
    event TradeExecuted(uint256 amountIn, uint256 amountOut, uint256 executionPrice);
    event TradeClosed(uint256 amountIn, uint256 amountOut, uint256 executionPrice);
    event MarketMakerEnabled();
    event MarketMakerDisabled();
    event AuthorizedAgentUpdated(address indexed oldAgent, address indexed newAgent);

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyAgent() {
        if (msg.sender != authorizedAgent) revert Unauthorized();
        _;
    }

    modifier nonReentrant() {
        if (_lock != 1) revert Reentrancy();
        _lock = 2;
        _;
        _lock = 1;
    }

    constructor(
        address owner_,
        address authorizedAgent_,
        address assetA_,
        address assetB_,
        address adapter_,
        address aqua_,
        StrategyType strategyType_,
        uint256 minTrade_,
        uint256 maxTrade_
    ) {
        if (owner_ == address(0) || authorizedAgent_ == address(0) || assetA_ == address(0) || assetB_ == address(0) || adapter_ == address(0) || aqua_ == address(0)) revert ZeroAddress();
        if (assetA_ == assetB_) revert InvalidAsset();

        // aqua_ (the parameter) must be used here: the `aqua` immutable is not assigned until after this block.
        _approve(assetA_, aqua_, type(uint256).max);
        _approve(assetB_, aqua_, type(uint256).max);

        if (minTrade_ == 0 || minTrade_ > maxTrade_) revert InvalidTradeBounds();
        owner = owner_;
        authorizedAgent = authorizedAgent_;
        assetA = IERC20(assetA_);
        assetB = IERC20(assetB_);
        adapter = ITradingAdapter(adapter_);
        aqua = IAqua(aqua_);
        strategyType = strategyType_;
        minTrade = minTrade_;
        maxTrade = maxTrade_;
        vaultMode = VaultMode.Trading;
        positionState = PositionState.Flat;
    }

    function deposit(uint256 amountA, uint256 amountB) external nonReentrant {
        if (amountA == 0 && amountB == 0) revert InvalidAmount();
        if (amountA > 0) {
            _safeTransferFrom(address(assetA), msg.sender, address(this), amountA);
            emit Deposit(msg.sender, address(assetA), amountA);
        }
        if (amountB > 0) {
            _safeTransferFrom(address(assetB), msg.sender, address(this), amountB);
            emit Deposit(msg.sender, address(assetB), amountB);
        }
    }

    function withdraw(address asset, uint256 amount, address receiver) external onlyOwner nonReentrant {
        if (!_isSupportedAsset(asset)) revert InvalidAsset();
        if (receiver == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidAmount();
        uint256 balance = IERC20(asset).balanceOf(address(this));
        uint256 reserved = asset == address(assetB) && positionState == PositionState.Long ? positionAmountOut : 0;
        if (balance < amount) revert InsufficientBalance();
        if (balance - amount < reserved) revert InsufficientWithdrawableBalance();
        _safeTransfer(asset, receiver, amount);
        emit Withdraw(msg.sender, asset, amount, receiver);
    }

    function updateAuthorizedAgent(address newAgent) external onlyOwner {
        if (newAgent == address(0)) revert ZeroAddress();
        address oldAgent = authorizedAgent;
        authorizedAgent = newAgent;
        emit AuthorizedAgentUpdated(oldAgent, newAgent);
    }

    function executeTrade(uint256 amountIn, uint256 minAmountOut, bytes calldata tradeData) external onlyAgent nonReentrant {
        if (vaultMode != VaultMode.Trading) revert InvalidMode();
        if (positionState != PositionState.Flat) revert PositionAlreadyOpen();
        if (amountIn < minTrade) revert BelowMinTrade();
        if (amountIn > maxTrade) revert AboveMaxTrade();
        if (assetA.balanceOf(address(this)) < amountIn) revert InsufficientBalance();

        (uint256 amountOut, uint256 executionPrice) = _swap(address(assetA), address(assetB), amountIn, minAmountOut, tradeData);
        if (amountOut == 0) revert InvalidAmount();
        positionState = PositionState.Long;
        positionAmountIn = amountIn;
        positionAmountOut = amountOut;
        entryPrice = executionPrice;
        emit TradeExecuted(amountIn, amountOut, executionPrice);
    }

    function closeTrade(uint256 minAmountOut, bytes calldata tradeData) external onlyAgent nonReentrant {
        if (positionState != PositionState.Long) revert NoPosition();
        (uint256 amountOut, uint256 executionPrice) = _swap(address(assetB), address(assetA), positionAmountOut, minAmountOut, tradeData);
        if (amountOut == 0) revert InvalidAmount();
        uint256 amountIn = positionAmountIn;
        positionState = PositionState.Flat;
        positionAmountIn = 0;
        positionAmountOut = 0;
        entryPrice = 0;
        emit TradeClosed(amountIn, amountOut, executionPrice);
    }

    /// Decodes an XYCSwap.Strategy + taker payload from tradeData and executes the swap directly
    /// against the Aqua app. AgentVault must be the direct caller so the xycSwapCallback lands here.
    function _swap(
        address assetIn,
        address assetOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata tradeData
    ) internal returns (uint256 amountOut, uint256 executionPrice) {
        (XYCSwap.Strategy memory strategy, bytes memory takerData) = abi.decode(tradeData, (XYCSwap.Strategy, bytes));

        bool matchesForward = strategy.token0 == address(assetA) && strategy.token1 == address(assetB);
        bool matchesReverse = strategy.token0 == address(assetB) && strategy.token1 == address(assetA);
        if (!matchesForward && !matchesReverse) revert InvalidAssetPair();

        bool zeroForOne = strategy.token0 == assetIn;

        amountOut = XYCSwap(adapter.executionApp()).swapExactIn(
            strategy,
            zeroForOne,
            amountIn,
            minAmountOut,
            address(this),
            takerData
        );

        executionPrice = amountOut * 1e18 / amountIn;
    }

    /// IXYCSwapCallback: settles the taker-side leg of a swap by pushing tokenIn into the maker's
    /// Aqua-tracked balance. Only the trusted execution app may invoke this.
    function xycSwapCallback(
        address tokenIn,
        address,
        uint256 amountIn,
        uint256,
        address maker,
        address app,
        bytes32 strategyHash,
        bytes calldata
    ) external override {
        if (msg.sender != adapter.executionApp()) revert Unauthorized();
        aqua.push(maker, app, strategyHash, tokenIn, amountIn);
    }


    function switchMarketMaker(
        bool active
    )
        external
        onlyAgent
        nonReentrant
    {
        if (positionState != PositionState.Flat) {
            revert InvalidMode();
        }

        if (active) {
            if (vaultMode == VaultMode.MarketMaker) {
                revert InvalidMode();
            }

            uint256 balanceA = assetA.balanceOf(address(this));
            uint256 balanceB = assetB.balanceOf(address(this));

            if (balanceA == 0 || balanceB == 0) {
                revert InvalidStrategyData();
            }

            address[] memory tokens = new address[](2);
            tokens[0] = address(assetA);
            tokens[1] = address(assetB);

            uint256[] memory amounts = new uint256[](2);
            amounts[0] = balanceA;
            amounts[1] = balanceB;

            XYCSwap.Strategy memory strategy = XYCSwap.Strategy({
                maker: address(this),
                token0: address(assetA),
                token1: address(assetB),
                feeBps: DEFAULT_MARKET_MAKER_FEE_BPS,
                salt: bytes32(0)
            });

            bytes32 strategyHash = aqua.ship(
                adapter.executionApp(),
                abi.encode(strategy),
                tokens,
                amounts
            );

            activeStrategyHash = strategyHash;
            vaultMode = VaultMode.MarketMaker;

            emit MarketMakerEnabled();

        } else {

            if (vaultMode != VaultMode.MarketMaker) {
                revert InvalidMode();
            }

            address[] memory tokens = new address[](2);
            tokens[0] = address(assetA);
            tokens[1] = address(assetB);

            aqua.dock(
                adapter.executionApp(),
                activeStrategyHash,
                tokens
            );

            activeStrategyHash = bytes32(0);
            vaultMode = VaultMode.Trading;

            emit MarketMakerDisabled();
        }
    }

    function _isSupportedAsset(address asset) internal view returns (bool) {
        return asset == address(assetA) || asset == address(assetB);
    }

    function _approve(address token, address spender, uint256 amount) internal {
        _callOptionalReturn(token, abi.encodeCall(IERC20.approve, (spender, 0)));
        _callOptionalReturn(token, abi.encodeCall(IERC20.approve, (spender, amount)));
    }

    function _safeTransfer(address token, address to, uint256 amount) internal {
        _callOptionalReturn(token, abi.encodeCall(IERC20.transfer, (to, amount)));
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        _callOptionalReturn(token, abi.encodeCall(IERC20.transferFrom, (from, to, amount)));
    }

    function _callOptionalReturn(address token, bytes memory data) internal {
        (bool success, bytes memory returndata) = token.call(data);
        if (!success || (returndata.length != 0 && !abi.decode(returndata, (bool)))) revert TransferFailed();
    }
}
