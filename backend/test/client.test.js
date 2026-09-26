import assert from "node:assert/strict";
import test from "node:test";

import { NonceManager } from "ethers";
import { TradingClient } from "../src/client.js";

test("uses one nonce-managed signer for agent transactions", () => {
  const client = new TradingClient({
    rpcUrl: "http://127.0.0.1:8545",
    factoryAddress: "0x0000000000000000000000000000000000000001",
    agentPrivateKey: `0x${"1".padStart(64, "0")}`
  });

  assert.ok(client.agent instanceof NonceManager);
  assert.equal(client.vaultWithAgent("0x0000000000000000000000000000000000000002").runner, client.agent);
});