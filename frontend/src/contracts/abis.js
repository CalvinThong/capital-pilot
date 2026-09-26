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
  'function latestRegime() view returns (tuple(uint8 regime,uint16 confidenceBps,uint64 recordedAt,string reason))',
  'function getRegimes(uint256 offset,uint256 limit) view returns (tuple(uint8 regime,uint16 confidenceBps,uint64 recordedAt,string reason)[])',
]
