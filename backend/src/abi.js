export const FACTORY_ABI = [
  "function allVaults(uint256) view returns (address)",
  "function allVaultsCount() view returns (uint256)",
  "function userVaults(address,uint256) view returns (address)",
  "function userVaultCount(address) view returns (uint256)",
  "function createVault(uint8 strategy,uint256 minTrade,uint256 maxTrade) returns (address)"
];

export const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)"
];

export const MARKET_REGIME_REGISTRY_ABI = [
  "function recordRegime(uint8 regime,uint16 confidenceBps,string reason)",
  "function historyCount() view returns (uint256)",
  "function regimeAt(uint256 index) view returns (tuple(uint8 regime,uint16 confidenceBps,uint64 recordedAt,string reason))",
  "function latestRegime() view returns (tuple(uint8 regime,uint16 confidenceBps,uint64 recordedAt,string reason))",
  "function getRegimes(uint256 offset,uint256 limit) view returns (tuple(uint8 regime,uint16 confidenceBps,uint64 recordedAt,string reason)[])"
];

export const VAULT_ABI = [
  "function owner() view returns (address)",
  "function authorizedAgent() view returns (address)",
  "function assetA() view returns (address)",
  "function assetB() view returns (address)",
  "function strategyType() view returns (uint8)",
  "function vaultMode() view returns (uint8)",
  "function positionState() view returns (uint8)",
  "function minTrade() view returns (uint256)",
  "function maxTrade() view returns (uint256)",
  "function positionAmountIn() view returns (uint256)",
  "function positionAmountOut() view returns (uint256)",
  "function entryPrice() view returns (uint256)",
  "function pnl() view returns (int256)",
  "function activeStrategyHash() view returns (bytes32)",
  "function executeTrade(uint256 amountIn,uint256 minAmountOut,bytes tradeData)",
  "function closeTrade(uint256 minAmountOut,bytes tradeData)",
  "function switchMarketMaker(bool active)"
];
