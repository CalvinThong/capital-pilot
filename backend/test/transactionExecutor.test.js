import assert from "node:assert/strict";
import test from "node:test";

import { TransactionExecutor } from "../src/transactionExecutor.js";

test("records a normalized market regime and waits for confirmation", async () => {
  const calls = [];
  const receipt = { status: 1 };
  const client = {
    regimeRegistry: {},
    regimeRegistryWithAgent() {
      return {
        async recordRegime(...args) {
          calls.push(args);
          return { hash: "0x1234", wait: async () => receipt };
        }
      };
    }
  };
  const executor = new TransactionExecutor({ client, enabled: true });

  const result = await executor.recordMarketRegime("TRADING", {
    confidence: 0.825,
    reason: "Strong directional trend"
  });

  assert.deepEqual(calls, [[1, 8250, "Strong directional trend"]]);
  assert.equal(result.submitted, true);
  assert.equal(result.hash, "0x1234");
  assert.equal(result.receipt, receipt);
});

test("does not record market regimes when execution is disabled", async () => {
  const executor = new TransactionExecutor({ client: {}, enabled: false });
  const result = await executor.recordMarketRegime("MARKET_MAKER", { confidence: 1 });
  assert.equal(result.submitted, false);
});