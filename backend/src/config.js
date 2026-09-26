import "dotenv/config";

import { GLOBAL_MODES, STRATEGY_NAMES } from "./llmAgents.js";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const optionalEnum = (name, allowed) => {
  const value = (process.env[name] || "").trim().toUpperCase();
  if (value && !allowed.includes(value)) throw new Error(`${name} must be one of: ${allowed.join(", ")}`);
  return value;
};

const optionalEnumSet = (name, allowed) => {
  const values = (process.env[name] || "").split(",").map((value) => value.trim().toUpperCase()).filter(Boolean);
  const invalid = values.filter((value) => !allowed.includes(value));
  if (invalid.length) throw new Error(`${name} contains invalid values: ${invalid.join(", ")}`);
  return new Set(values);
};

export const config = {
  rpcUrl: required("RPC_URL"),
  factoryAddress: required("FACTORY_ADDRESS"),
  agentPrivateKey: process.env.AGENT_PRIVATE_KEY || "",
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || 30000),
  executionEnabled: process.env.EXECUTION_ENABLED === "true",
  tradeData: process.env.TRADE_DATA || "",
  openaiEnabled: process.env.OPENAI_ENABLED === "true",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  forceGlobalMode: optionalEnum("FORCE_GLOBAL_MODE", Object.values(GLOBAL_MODES)),
  forceStrategies: optionalEnumSet("FORCE_STRATEGIES", STRATEGY_NAMES),
  marketMakerOnlyVaults: new Set(
    (process.env.MARKET_MAKER_ONLY_VAULTS || "")
      .split(",")
      .map((address) => address.trim().toLowerCase())
      .filter(Boolean)
  )
};

