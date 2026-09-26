import assert from "node:assert/strict";
import test from "node:test";

import { TransactionExecutor } from "../src/transactionExecutor.js";

test("records a combined market decision and returns its ID", async () => {
  const calls = [];
  const receipt = { status: 1 };
  const client = {
    regimeRegistry: {},
    regimeRegistryWithAgent() {
      return {
        async recordDecision(...args) {
          calls.push(args);
          return { hash: "0x1234", wait: async () => receipt };
        }
      };
    },
    marketDecisionIdFromReceipt() { return 42n; }
  };
  const executor = new TransactionExecutor({ client, enabled: true });

  const result = await executor.recordMarketDecision("TRADING", {
    confidence: 0.825,
    reason: "Strong directional trend"
  }, {
    strategies: ["MOMENTUM", "DCA"],
    confidence: 0.78,
    reason: "Momentum and DCA selected",
    strategyDetails: [
      { name: "MOMENTUM", confidence: 0.81 },
      { name: "DCA", confidence: 0.72 }
    ]
  });

  assert.deepEqual(calls, [[1, 5, 8250, 7800, [8100, 0, 7200], "Strong directional trend", "Momentum and DCA selected"]]);
  assert.equal(result.submitted, true);
  assert.equal(result.hash, "0x1234");
  assert.equal(result.receipt, receipt);
  assert.equal(result.decisionId, 42n);
});

test("does not record market regimes when execution is disabled", async () => {
  const executor = new TransactionExecutor({ client: {}, enabled: false });
  const result = await executor.recordMarketDecision("MARKET_MAKER", { confidence: 1 });
  assert.equal(result.submitted, false);
});

test("forwards market decision metadata when opening a position", async () => {
  const calls = [];
  const client = {
    agent: {},
    vaultWithAgent() {
      return {
        async executeTrade(...args) {
          calls.push(args);
          return { hash: "0xabcd", wait: async () => ({ status: 1 }) };
        }
      };
    }
  };
  const executor = new TransactionExecutor({ client, enabled: true });

  await executor.execute("0x0000000000000000000000000000000000000001", {
    type: "OPEN_LONG",
    amountIn: 100n,
    minAmountOut: 90n,
    tradeData: "0x1234",
    decisionId: 42n,
    confidence: 0.8125,
    reason: "Momentum setup"
  });

  assert.deepEqual(calls, [[100n, 90n, "0x1234", 42n, 8125, "Momentum setup"]]);
});