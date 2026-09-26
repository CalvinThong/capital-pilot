import { BrowserProvider, Contract, JsonRpcProvider, formatUnits, isAddress, parseUnits } from 'ethers'
import { CONTRACT_CONFIG } from '../config/contracts.js'
import { ERC20_ABI, FACTORY_ABI, REGIME_REGISTRY_ABI, VAULT_ABI } from '../contracts/abis.js'

export const STRATEGIES = ['Momentum', 'Technical Analysis', 'DCA']
export const MODES = ['Trading', 'Market Maker']
export const POSITIONS = ['Flat', 'Long']

export async function connectWallet() {
  if (!window.ethereum) throw new Error('MetaMask is not installed')

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CONTRACT_CONFIG.chainIdHex }],
    })
  } catch (error) {
    if (error.code !== 4902) throw error
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: CONTRACT_CONFIG.chainIdHex,
        chainName: CONTRACT_CONFIG.chainName,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: [CONTRACT_CONFIG.rpcUrl],
      }],
    })
  }

  const provider = new BrowserProvider(window.ethereum)
  await provider.send('eth_requestAccounts', [])
  const signer = await provider.getSigner()
  return { provider, signer, account: await signer.getAddress() }
}

export async function loadDashboard() {
  assertConfiguration()
  const provider = new JsonRpcProvider(CONTRACT_CONFIG.rpcUrl)
  const factory = new Contract(CONTRACT_CONFIG.factoryAddress, FACTORY_ABI, provider)
  const [assetAAddress, assetBAddress, vaultCount] = await Promise.all([
    factory.assetA(),
    factory.assetB(),
    factory.allVaultsCount(),
  ])
  const [assetA, assetB] = await Promise.all([
    loadToken(provider, assetAAddress),
    loadToken(provider, assetBAddress),
  ])
  const addresses = await Promise.all(
    Array.from({ length: Number(vaultCount) }, (_, index) => factory.allVaults(index)),
  )
  const [vaults, regimes] = await Promise.all([
    Promise.all(addresses.map((address) => loadVault(provider, address, assetA, assetB))),
    loadRegimes(provider),
  ])

  return { assetA, assetB, vaults, regimes }
}

export async function createAndFundVault({ account, strategy, amountA, amountB, minTrade, onStep }) {
  assertConfiguration()
  const { signer, account: connectedAccount } = await connectWallet()
  if (connectedAccount.toLowerCase() !== account.toLowerCase()) {
    throw new Error('Connected MetaMask account changed. Please try again.')
  }

  const factory = new Contract(CONTRACT_CONFIG.factoryAddress, FACTORY_ABI, signer)
  const [assetAAddress, assetBAddress] = await Promise.all([factory.assetA(), factory.assetB()])
  const [assetA, assetB] = await Promise.all([
    loadToken(signer, assetAAddress),
    loadToken(signer, assetBAddress),
  ])
  const amountAUnits = parseUnits(amountA, assetA.decimals)
  const amountBUnits = parseUnits(amountB || '0', assetB.decimals)
  const minTradeUnits = parseUnits(minTrade, assetA.decimals)
  if (amountAUnits <= 0n) throw new Error(`Amount ${assetA.symbol} must be greater than zero`)
  if (minTradeUnits <= 0n || minTradeUnits > amountAUnits) {
    throw new Error(`Minimum trade must be greater than zero and no more than deposited ${assetA.symbol}`)
  }

  onStep?.('Creating vault')
  const createTx = await factory.createVault(Number(strategy), minTradeUnits, amountAUnits)
  const createReceipt = await createTx.wait()
  const createdEvent = createReceipt.logs
    .map((entry) => {
      try { return factory.interface.parseLog(entry) } catch { return null }
    })
    .find((entry) => entry?.name === 'VaultCreated')
  if (!createdEvent) throw new Error('VaultCreated event was not found in the transaction receipt')
  const vaultAddress = createdEvent.args.vault

  if (amountAUnits > 0n) {
    onStep?.(`Approving ${assetA.symbol}`)
    await (await new Contract(assetA.address, ERC20_ABI, signer).approve(vaultAddress, amountAUnits)).wait()
  }
  if (amountBUnits > 0n) {
    onStep?.(`Approving ${assetB.symbol}`)
    await (await new Contract(assetB.address, ERC20_ABI, signer).approve(vaultAddress, amountBUnits)).wait()
  }

  onStep?.('Funding vault')
  await (await new Contract(vaultAddress, VAULT_ABI, signer).deposit(amountAUnits, amountBUnits)).wait()
  onStep?.('Complete')
  return vaultAddress
}

async function loadToken(provider, address) {
  const token = new Contract(address, ERC20_ABI, provider)
  const [symbol, decimals] = await Promise.all([token.symbol(), token.decimals()])
  return { address, symbol, decimals: Number(decimals) }
}

async function loadVault(provider, address, assetA, assetB) {
  const vault = new Contract(address, VAULT_ABI, provider)
  const corePromise = Promise.all([
    vault.owner(),
    vault.strategyType(),
    vault.vaultMode(),
    vault.positionState(),
    vault.minTrade(),
    vault.maxTrade(),
    vault.positionAmountIn(),
    vault.positionAmountOut(),
    new Contract(assetA.address, ERC20_ABI, provider).balanceOf(address),
    new Contract(assetB.address, ERC20_ABI, provider).balanceOf(address),
  ])
  const [core, pnlResult, costResult] = await Promise.all([
    corePromise,
    vault.pnl().then((value) => ({ ok: true, value })).catch(() => ({ ok: false, value: 0n })),
    vault.totalClosedPositionAmountIn().then((value) => ({ ok: true, value })).catch(() => ({ ok: false, value: 0n })),
  ])
  const positionHistory = await loadPositionHistory(vault)
  const [owner, strategy, mode, position, minTrade, maxTrade, positionAmountIn, positionAmountOut, balanceA, balanceB] = core
  const pnlSupported = pnlResult.ok && costResult.ok
  const pnlPercent = pnlSupported && costResult.value > 0n
    ? Number((pnlResult.value * 10_000n) / costResult.value) / 100
    : null

  return {
    address,
    owner,
    strategy: Number(strategy),
    mode: Number(mode),
    position: Number(position),
    minTrade,
    maxTrade,
    positionAmountIn,
    positionAmountOut,
    balanceA,
    balanceB,
    pnl: pnlSupported ? pnlResult.value : null,
    pnlPercent,
    positionHistory,
    assetA,
    assetB,
  }
}

async function loadRegimes(provider) {
  if (!isAddress(CONTRACT_CONFIG.regimeRegistryAddress)) return { latest: null, history: [] }
  const registry = new Contract(CONTRACT_CONFIG.regimeRegistryAddress, REGIME_REGISTRY_ABI, provider)
  try {
    const count = Number(await registry.historyCount())
    if (count === 0) return { latest: null, history: [] }
    const offset = Math.max(0, count - 100)
    const records = await registry.getRegimes(offset, count - offset)
    const history = records.map((record, index) => ({
      index: offset + index,
      mode: Number(record.regime) === 0 ? 'Market Maker' : 'Trading',
      selectedStrategies: STRATEGIES.filter((_, strategyId) => (Number(record.selectedStrategyMask) & (1 << strategyId)) !== 0),
      confidence: Number(record.regimeConfidenceBps) / 100,
      strategyConfidence: Number(record.strategyConfidenceBps) / 100,
      strategyConfidenceById: record.strategyConfidenceById.map((value) => Number(value) / 100),
      recordedAt: Number(record.recordedAt),
      reason: record.regimeReason,
      strategyReason: record.strategyReason,
    })).reverse()
    return { latest: history[0], history }
  } catch {
    return { latest: null, history: [] }
  }
}

async function loadPositionHistory(vault) {
  try {
    const count = Number(await vault.positionHistoryCount())
    if (count === 0) return []
    const offset = Math.max(0, count - 100)
    const records = await vault.getPositionRecords(offset, count - offset)
    return records.map((record, index) => ({
      positionId: offset + index,
      openDecisionId: Number(record.openDecisionId),
      closeDecisionId: Number(record.closeDecisionId),
      openedAt: Number(record.openedAt),
      closedAt: Number(record.closedAt),
      openConfidence: Number(record.openConfidenceBps) / 100,
      closeConfidence: Number(record.closeConfidenceBps) / 100,
      amountIn: record.amountIn,
      positionAmountOut: record.positionAmountOut,
      closeAmountOut: record.closeAmountOut,
      realizedPnl: record.realizedPnl,
      openReason: record.openReason,
      closeReason: record.closeReason,
    })).reverse()
  } catch {
    return []
  }
}

export function formatToken(value, token, maximumFractionDigits = 4) {
  if (value === null || value === undefined) return 'N/A'
  const numeric = Number(formatUnits(value, token.decimals))
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(numeric)
}

export function shortAddress(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''
}

function assertConfiguration() {
  if (!isAddress(CONTRACT_CONFIG.factoryAddress)) {
    throw new Error('Set a valid factoryAddress in src/config/contracts.js')
  }
}
