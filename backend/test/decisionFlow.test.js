import assert from "node:assert/strict";
import test from "node:test";

import { OpenAIAgents } from "../src/llmAgents.js";
import { applyForcedTradingStrategyFallback, proposeMarketMakerAction, proposeSelectedStrategyEntry } from "../src/strategyRunner.js";

const tradingVault = {
  address: "0x0000000000000000000000000000000000000001",
  mode: 0,
  position: 0,
  minTrade: 100n,
  maxTrade: 1_000n,
  balanceA: 500n,
  balanceB: 500n
};

test("LLM_B normalizes and deduplicates selected strategies", async () => {
  const agents = new OpenAIAgents({ enabled: true, apiKey: "test" });
  agents.completeJson = async () => ({
    strategies: [
      { name: "Momentum", confidence: 0.82, supportingEvidence: ["ADX=28"], riskFlags: [] },
      { name: "TechnicalAnalysis", confidence: 0.73, supportingEvidence: ["RSI=58"], riskFlags: ["ATR elevated"] },
      { name: "momentum", confidence: 0.7, supportingEvidence: [], riskFlags: [] },
      { name: "DCA", confidence: 0.4, supportingEvidence: ["RSI=48"], riskFlags: ["Confidence too low"] }
    ],
    overallConfidence: 0.8,
    marketCharacter: "TRENDING",
    reason: "Trend and staged entry are suitable"
  });

  const decision = await agents.selectStrategies({});
  assert.deepEqual(decision.strategies, ["MOMENTUM", "TECHNICAL_ANALYSIS"]);
  assert.equal(decision.confidence, 0.8);
  assert.equal(decision.strategyDetails[0].confidence, 0.82);
  assert.deepEqual(decision.strategyDetails[1].riskFlags, ["ATR elevated"]);
  assert.equal(decision.marketCharacter, "TRENDING");
});

test("forced TRADING defaults an empty LLM_B selection to MOMENTUM", () => {
  const decision = applyForcedTradingStrategyFallback(
    { strategies: [], confidence: 0, reason: "No strategy meets the entry criteria." },
    "TRADING"
  );

  assert.deepEqual(decision.strategies, ["MOMENTUM"]);
  assert.match(decision.reason, /defaulted to MOMENTUM/);
});

test("forced TRADING preserves strategies returned by LLM_B", () => {
  const original = { strategies: ["DCA"], confidence: 0.8, reason: "DCA setup" };
  const decision = applyForcedTradingStrategyFallback(original, "TRADING");
  assert.equal(decision, original);
});

test("does not default an empty selection when TRADING is not forced", () => {
  const original = { strategies: [], confidence: 0, reason: "No setup" };
  const decision = applyForcedTradingStrategyFallback(original, "");
  assert.equal(decision, original);
});

test("LLM_C normalizes a close decision", async () => {
  const agents = new OpenAIAgents({ enabled: true, apiKey: "test" });
  agents.completeJson = async () => ({ action: "close", minAmountOut: "95", confidence: 0.9, reason: "Momentum reversed" });

  const decision = await agents.decideClose({
    market: {},
    vault: { ...tradingVault, strategy: 0, positionAmountIn: 100n, positionAmountOut: 50n, entryPrice: 2n }
  });
  assert.equal(decision.action, "CLOSE");
});

test("selected strategy opens at the vault minimum", () => {
  const proposal = proposeSelectedStrategyEntry(tradingVault, { confidence: 0.75, reason: "Selected by LLM_B" });
  assert.equal(proposal.type, "OPEN_LONG");
  assert.equal(proposal.amountIn, 100n);
});

test("market-maker transition holds while a position is open", () => {
  const proposal = proposeMarketMakerAction({ ...tradingVault, position: 1 }, "MARKET_MAKER");
  assert.equal(proposal.type, "HOLD");
});
