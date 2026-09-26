export const FACTORY_ABI = [
  'function assetA() view returns (address)',
  'function assetB() view returns (address)',
  'function allVaults(uint256) view returns (address)',
  'function allVaultsCount() view returns (uint256)',
  'function createVault(uint8 strategy,uint256 minTrade,uint256 maxTrade) returns (address)',
  'event VaultCreated(address indexed owner,address indexed vault,uint8 strategy)',
]

export const VAULT_ABI = [
  'function owner() view returns (address)',
  'function assetA() view returns (address)',
  'function assetB() view returns (address)',
  'function strategyType() view returns (uint8)',
  'function vaultMode() view returns (uint8)',
  'function positionState() view returns (uint8)',
  'function minTrade() view returns (uint256)',
  'function maxTrade() view returns (uint256)',
  'function positionAmountIn() view returns (uint256)',
  'function positionAmountOut() view returns (uint256)',
  'function pnl() view returns (int256)',
  'function totalClosedPositionAmountIn() view returns (uint256)',
  'function positionHistoryCount() view returns (uint256)',
  'function getPositionRecords(uint256 offset,uint256 limit) view returns (tuple(uint256 openDecisionId,uint256 closeDecisionId,uint64 openedAt,uint64 closedAt,uint16 openConfidenceBps,uint16 closeConfidenceBps,uint256 amountIn,uint256 positionAmountOut,uint256 closeAmountOut,int256 realizedPnl,string openReason,string closeReason)[])',
  'function deposit(uint256 amountA,uint256 amountB)',
]

export const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address account) view returns (uint256)',
  'function approve(address spender,uint256 amount) returns (bool)',
]

export const REGIME_REGISTRY_ABI = [
  'function historyCount() view returns (uint256)',
  'function latestRegime() view returns (tuple(uint8 regime,uint8 selectedStrategyMask,uint16 regimeConfidenceBps,uint16 strategyConfidenceBps,uint16[3] strategyConfidenceById,uint64 recordedAt,string regimeReason,string strategyReason))',
  'function getRegimes(uint256 offset,uint256 limit) view returns (tuple(uint8 regime,uint8 selectedStrategyMask,uint16 regimeConfidenceBps,uint16 strategyConfidenceBps,uint16[3] strategyConfidenceById,uint64 recordedAt,string regimeReason,string strategyReason)[])',
]
