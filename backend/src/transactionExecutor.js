export class TransactionExecutor {
  constructor({ client, enabled }) {
    this.client = client;
    this.enabled = enabled;
  }

  async execute(address, action) {
    if (!this.enabled) return { submitted: false, reason: "Execution is disabled" };
    if ((action.type === "OPEN_LONG" || action.type === "CLOSE") && !action.tradeData) {
      action = { ...action, tradeData: await this.client.buildSwapTradeData(address) };
      if (!action.tradeData) {
        return { submitted: false, status: "pending", reason: "No matching market-maker vault/order was found; no trade was submitted" };
      }
    }
    if (!this.client.agent) throw new Error("AGENT_PRIVATE_KEY is required for execution");
    const vault = this.client.vaultWithAgent(address);
    let transaction;
    if (action.type === "OPEN_LONG") {
      transaction = await vault.executeTrade(action.amountIn, action.minAmountOut ?? 0, action.tradeData, action.decisionId, toConfidenceBps(action.confidence), boundedReason(action.reason));
    } else if (action.type === "CLOSE") {
      transaction = await vault.closeTrade(action.minAmountOut ?? 0, action.tradeData, action.decisionId, toConfidenceBps(action.confidence), boundedReason(action.reason));
    } else if (action.type === "SHIP") {
      transaction = await vault.switchMarketMaker(true);
    } else if (action.type === "DOCK") {
      transaction = await vault.switchMarketMaker(false);
    } else if (action.type === "HOLD") {
      return { submitted: false, reason: action.reason || "Policy returned HOLD" };
    } else {
      throw new Error(`Unsupported execution action: ${action.type}`);
    }
    return { submitted: true, hash: transaction.hash, receipt: await transaction.wait() };
  }

  async recordMarketDecision(mode, regimeDecision = {}, strategyDecision = {}) {
    if (!this.enabled) return { submitted: false, reason: "Execution is disabled" };
    if (!this.client.regimeRegistry) return { submitted: false, reason: "REGIME_REGISTRY_ADDRESS is not configured" };

    const regime = { MARKET_MAKER: 0, TRADING: 1 }[mode];
    if (regime === undefined) throw new Error(`Unsupported market regime: ${mode}`);

    let selectedStrategyMask = 0;
    const strategyConfidenceById = [0, 0, 0];
    for (const name of strategyDecision.strategies || []) {
      const strategyId = ["MOMENTUM", "TECHNICAL_ANALYSIS", "DCA"].indexOf(name);
      if (strategyId < 0) throw new Error(`Unsupported strategy: ${name}`);
      selectedStrategyMask |= 1 << strategyId;
      const detail = strategyDecision.strategyDetails?.find((candidate) => candidate.name === name);
      strategyConfidenceById[strategyId] = toConfidenceBps(detail?.confidence ?? strategyDecision.confidence);
    }
    const transaction = await this.client.regimeRegistryWithAgent().recordDecision(
      regime,
      selectedStrategyMask,
      toConfidenceBps(regimeDecision.confidence),
      toConfidenceBps(strategyDecision.confidence),
      strategyConfidenceById,
      boundedReason(regimeDecision.reason),
      boundedReason(strategyDecision.reason)
    );
    const receipt = await transaction.wait();
    return {
      submitted: true,
      hash: transaction.hash,
      receipt,
      decisionId: this.client.marketDecisionIdFromReceipt(receipt)
    };
  }
}

function toConfidenceBps(confidence) {
  const numeric = Number(confidence ?? 0);
  return Math.round(Math.max(0, Math.min(1, Number.isFinite(numeric) ? numeric : 0)) * 10_000);
}

function boundedReason(reason) {
  return String(reason || "").slice(0, 512);
}
