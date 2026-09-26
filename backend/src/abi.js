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
  "function recordDecision(uint8 regime,uint8 selectedStrategyMask,uint16 regimeConfidenceBps,uint16 strategyConfidenceBps,uint16[3] strategyConfidenceById,string regimeReason,string strategyReason) returns (uint256)",
  "function historyCount() view returns (uint256)",
  "function regimeAt(uint256 index) view returns (tuple(uint8 regime,uint8 selectedStrategyMask,uint16 regimeConfidenceBps,uint16 strategyConfidenceBps,uint16[3] strategyConfidenceById,uint64 recordedAt,string regimeReason,string strategyReason))",
  "function latestRegime() view returns (tuple(uint8 regime,uint8 selectedStrategyMask,uint16 regimeConfidenceBps,uint16 strategyConfidenceBps,uint16[3] strategyConfidenceById,uint64 recordedAt,string regimeReason,string strategyReason))",
  "function getRegimes(uint256 offset,uint256 limit) view returns (tuple(uint8 regime,uint8 selectedStrategyMask,uint16 regimeConfidenceBps,uint16 strategyConfidenceBps,uint16[3] strategyConfidenceById,uint64 recordedAt,string regimeReason,string strategyReason)[])",
  "event MarketRegimeRecorded(uint256 indexed index,uint8 indexed regime,uint8 selectedStrategyMask,uint16 regimeConfidenceBps,uint16 strategyConfidenceBps,uint64 recordedAt,string regimeReason,string strategyReason)"
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
  "function totalClosedPositionAmountIn() view returns (uint256)",
  "function positionHistoryCount() view returns (uint256)",
  "function getPositionRecords(uint256 offset,uint256 limit) view returns (tuple(uint256 openDecisionId,uint256 closeDecisionId,uint64 openedAt,uint64 closedAt,uint16 openConfidenceBps,uint16 closeConfidenceBps,uint256 amountIn,uint256 positionAmountOut,uint256 closeAmountOut,int256 realizedPnl,string openReason,string closeReason)[])",
  "function activeStrategyHash() view returns (bytes32)",
  "function activeStrategySalt() view returns (bytes32)",
  "function executeTrade(uint256 amountIn,uint256 minAmountOut,bytes tradeData,uint256 decisionId,uint16 confidenceBps,string reason)",
  "function closeTrade(uint256 minAmountOut,bytes tradeData,uint256 decisionId,uint16 confidenceBps,string reason)",
  "function switchMarketMaker(bool active)"
];
