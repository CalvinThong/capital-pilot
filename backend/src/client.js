import { AbiCoder, Contract, JsonRpcProvider, NonceManager, Wallet } from "ethers";
import { ERC20_ABI, FACTORY_ABI, MARKET_REGIME_REGISTRY_ABI, VAULT_ABI } from "./abi.js";

// Mirrors AgentVault.DEFAULT_MARKET_MAKER_FEE_BPS; the active salt is read from each maker vault.
const DEFAULT_MARKET_MAKER_FEE_BPS = 30;

export class TradingClient {
  constructor({ rpcUrl, factoryAddress, regimeRegistryAddress = "", agentPrivateKey = "" } = {}) {
    this.provider = new JsonRpcProvider(rpcUrl);
    this.factory = new Contract(factoryAddress, FACTORY_ABI, this.provider);
    this.regimeRegistry = regimeRegistryAddress
      ? new Contract(regimeRegistryAddress, MARKET_REGIME_REGISTRY_ABI, this.provider)
      : null;
    this.agent = agentPrivateKey
      ? new NonceManager(new Wallet(agentPrivateKey, this.provider))
      : null;
  }

  async readMarketRegimeHistory(offset = 0, limit = 100) {
    if (!this.regimeRegistry) throw new Error("REGIME_REGISTRY_ADDRESS is required to read market regime history");
    const [count, records] = await Promise.all([
      this.regimeRegistry.historyCount(),
      this.regimeRegistry.getRegimes(offset, limit)
    ]);
    return {
      count: Number(count),
      records: records.map(formatRegimeRecord)
    };
  }

  async listVaults() {
    const count = Number(await this.factory.allVaultsCount());
    return Promise.all(Array.from({ length: count }, (_, index) => this.factory.allVaults(index)));
  }

  async readVault(address) {
    const vault = new Contract(address, VAULT_ABI, this.provider);
    const [owner, authorizedAgent, assetA, assetB, strategy, mode, position, minTrade, maxTrade, amountIn, amountOut, entryPrice, pnl, totalClosedPositionAmountIn, activeStrategyHash, activeStrategySalt] = await Promise.all([
      vault.owner(), vault.authorizedAgent(), vault.assetA(), vault.assetB(), vault.strategyType(), vault.vaultMode(), vault.positionState(), vault.minTrade(), vault.maxTrade(), vault.positionAmountIn(), vault.positionAmountOut(), vault.entryPrice(), vault.pnl(), vault.totalClosedPositionAmountIn(), vault.activeStrategyHash(), vault.activeStrategySalt()
    ]);
    const [balanceA, balanceB] = await Promise.all([
      new Contract(assetA, ERC20_ABI, this.provider).balanceOf(address),
      new Contract(assetB, ERC20_ABI, this.provider).balanceOf(address)
    ]);
    return {
      address,
      owner,
      authorizedAgent,
      assetA,
      assetB,
      strategy: Number(strategy),
      mode: Number(mode),
      position: Number(position),
      minTrade,
      maxTrade,
      positionAmountIn: amountIn,
      positionAmountOut: amountOut,
      entryPrice,
      pnl,
      totalClosedPositionAmountIn,
      activeStrategyHash,
      activeStrategySalt,
      balanceA,
      balanceB
    };
  }

  async buildSwapTradeData(takerAddress) {
    const taker = await this.readVault(takerAddress);
    const vaults = await this.listVaults();
    const snapshots = await Promise.all(vaults.filter((address) => address.toLowerCase() !== takerAddress.toLowerCase()).map((address) => this.readVault(address)));
    const maker = snapshots.find((candidate) => candidate.mode === 1 && candidate.assetA.toLowerCase() === taker.assetA.toLowerCase() && candidate.assetB.toLowerCase() === taker.assetB.toLowerCase());
    if (!maker) return null;

    const coder = AbiCoder.defaultAbiCoder();
    // Matches XYCSwap.Strategy / AgentVault's internal strategy construction: (maker, token0, token1, feeBps, salt).
    // AgentVault derives zeroForOne itself from which side of {token0,token1} is being sold, so it is not encoded here.
    const strategy = {
      maker: maker.address,
      token0: maker.assetA,
      token1: maker.assetB,
      feeBps: DEFAULT_MARKET_MAKER_FEE_BPS,
      salt: maker.activeStrategySalt
    };
    return coder.encode(
      ["tuple(address maker,address token0,address token1,uint256 feeBps,bytes32 salt)", "bytes"],
      [strategy, "0x"]
    );
  }

  vaultWithAgent(address) {
    if (!this.agent) throw new Error("AGENT_PRIVATE_KEY is required for execution");
    return new Contract(address, VAULT_ABI, this.agent);
  }

  regimeRegistryWithAgent() {
    if (!this.regimeRegistry) throw new Error("REGIME_REGISTRY_ADDRESS is required to record market regimes");
    if (!this.agent) throw new Error("AGENT_PRIVATE_KEY is required for execution");
    return this.regimeRegistry.connect(this.agent);
  }

  marketDecisionIdFromReceipt(receipt) {
    for (const entry of receipt.logs) {
      try {
        const parsed = this.regimeRegistry.interface.parseLog(entry);
        if (parsed?.name === "MarketRegimeRecorded") return parsed.args.index;
      } catch {}
    }
    throw new Error("MarketRegimeRecorded event was not found in the transaction receipt");
  }
}

function formatRegimeRecord(record) {
  const recordedAt = Number(record.recordedAt);
  return {
    mode: Number(record.regime) === 0 ? "MARKET_MAKER" : "TRADING",
    selectedStrategyMask: Number(record.selectedStrategyMask),
    confidence: Number(record.regimeConfidenceBps) / 10_000,
    strategyConfidence: Number(record.strategyConfidenceBps) / 10_000,
    strategyConfidenceById: record.strategyConfidenceById.map((value) => Number(value) / 10_000),
    recordedAt,
    recordedAtIso: new Date(recordedAt * 1000).toISOString(),
    reason: record.regimeReason,
    strategyReason: record.strategyReason
  };
}
