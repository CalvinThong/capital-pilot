import { classifyMarket, MODES } from "./agents/masterAgent.js";
import { decideEntry } from "./agents/decisionAgent.js";
import { decideExit } from "./agents/profitTakingAgent.js";

export function fallbackGlobalMode(market) {
  return classifyMarket(market).mode === MODES.MARKET_MAKER ? MODES.MARKET_MAKER : MODES.TRADING;
}

export function proposeMarketMakerAction(vault, marketMode) {
  if (marketMode === MODES.MARKET_MAKER && vault.mode === 0) {
    if (vault.position !== 0) {
      return { type: "HOLD", reason: "Vault must close its open position before entering market-maker mode" };
    }
    if (vault.balanceA === 0n || vault.balanceB === 0n) {
      return { type: "HOLD", reason: `Vault ${vault.address} has no assets to ship` };
    }
    return {
      type: "SHIP",
      reason: "Global OpenAI regime is MARKET_MAKER"
    };
  }
  if (marketMode === MODES.TRADING && vault.mode === 1) {
    return {
      type: "DOCK",
      reason: "Global OpenAI regime is TRADING"
    };
  }
  return { type: "HOLD", reason: "Vault already matches global market mode" };
}

export function proposeSelectedStrategyEntry(vault, strategyDecision, tradeData = "") {
  if (vault.mode !== 0 || vault.position !== 0) {
    return { type: "HOLD", reason: "Vault is not flat and trading" };
  }
  
  console.log(vault.balanceA, vault.minTrade, "vault.balanceA, vault.minTrade");

  if (vault.balanceA < vault.minTrade) {
    return { type: "HOLD", reason: "Vault balance is below its minimum trade amount" };
  }
  return {
    type: "OPEN_LONG",
    amountIn: vault.minTrade,
    minAmountOut: 0n,
    tradeData,
    confidence: strategyDecision.confidence,
    reason: strategyDecision.reason,
    supportingEvidence: strategyDecision.supportingEvidence || [],
    riskFlags: strategyDecision.riskFlags || []
  };
}

export function proposeVaultTradingAction(vault, market, decision, tradeData = "") {
  if (vault.mode !== 0) return { type: "HOLD", reason: "Vault is not in trading mode" };
  if (decision) {
    return {
      type: decision.action,
      amountIn: BigInt(decision.amountIn || 0),
      minAmountOut: BigInt(decision.minAmountOut || 0),
      tradeData,
      confidence: decision.confidence,
      reason: decision.reason
    };
  }

  if (vault.position === 1) {
    const exit = decideExit({ vault, currentPrice: market.price });
    return { ...exit, type: exit.action, tradeData };
  }

  const entry = decideEntry({ vault, market });
  return {
    ...entry,
    type: entry.action,
    amountIn: entry.amountIn === 0 ? 0n : entry.amountIn,
    tradeData
  };
}
