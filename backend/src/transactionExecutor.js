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
      transaction = await vault.executeTrade(action.amountIn, action.minAmountOut ?? 0, action.tradeData);
    } else if (action.type === "CLOSE") {
      transaction = await vault.closeTrade(action.minAmountOut ?? 0, action.tradeData);
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

  async recordMarketRegime(mode, decision = {}) {
    if (!this.enabled) return { submitted: false, reason: "Execution is disabled" };
    if (!this.client.regimeRegistry) return { submitted: false, reason: "REGIME_REGISTRY_ADDRESS is not configured" };

    const regime = { MARKET_MAKER: 0, TRADING: 1 }[mode];
    if (regime === undefined) throw new Error(`Unsupported market regime: ${mode}`);

    const confidence = Number(decision.confidence ?? 0);
    const confidenceBps = Math.round(Math.max(0, Math.min(1, confidence)) * 10_000);
    const reason = String(decision.reason || "").slice(0, 512);
    const transaction = await this.client.regimeRegistryWithAgent().recordRegime(regime, confidenceBps, reason);
    return { submitted: true, hash: transaction.hash, receipt: await transaction.wait() };
  }
}
