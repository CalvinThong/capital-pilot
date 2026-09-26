import { config } from "./config.js";
import { TradingClient } from "./client.js";
import { MarketDataEngine } from "./marketData.js";
import { GLOBAL_MODES, OpenAIAgents, STRATEGY_NAMES } from "./llmAgents.js";
import { fallbackGlobalMode, proposeMarketMakerAction, proposeSelectedStrategyEntry, proposeVaultTradingAction } from "./strategyRunner.js";
import { TransactionExecutor } from "./transactionExecutor.js";

const client = new TradingClient(config);
const marketData = new MarketDataEngine();
const llmAgents = new OpenAIAgents(config);
const executor = new TransactionExecutor({ client, enabled: config.executionEnabled });

async function scan() {
  const market = await marketData.snapshot();
  log("market_snapshot", { market });

  const globalDecision = config.forceGlobalMode
    ? { mode: config.forceGlobalMode, confidence: 1, reason: "FORCE_GLOBAL_MODE override" }
    : await llmAgents.classifyMarket(market);
  const globalMode = globalDecision.mode || fallbackGlobalMode(market);
  log("llm_a_market_regime", { mode: globalMode, decision: globalDecision });

  const addresses = await client.listVaults();
  const vaults = await Promise.all(addresses.map((address) => client.readVault(address)));

  if (globalMode === GLOBAL_MODES.MARKET_MAKER) {
    await runMarketMakerMode(vaults, globalMode);
    return;
  }

  await runTradingMode(vaults, market, globalMode);
}

async function runMarketMakerMode(vaults, globalMode) {
  for (const vault of vaults) {
    const proposal = proposeMarketMakerAction(vault, globalMode);
    await executeAndLog("market_maker_action", vault, proposal);
  }
}

async function runTradingMode(vaults, market, globalMode) {
  const strategyDecision = config.forceStrategies.size
    ? { strategies: [...config.forceStrategies], confidence: 1, reason: "FORCE_STRATEGIES override" }
    : await llmAgents.selectStrategies(market);
  const selectedStrategyIds = new Set(strategyDecision.strategies.map((name) => STRATEGY_NAMES.indexOf(name)));
  log("llm_b_strategy_selection", { selectedStrategies: strategyDecision.strategies, decision: strategyDecision });

  for (const vault of vaults) {
    if (config.marketMakerOnlyVaults.has(vault.address.toLowerCase())) {
      const proposal = proposeMarketMakerAction(vault, GLOBAL_MODES.MARKET_MAKER);
      await executeAndLog("market_maker_only_action", vault, proposal);
      continue;
    }

    const tradingVault = await ensureTradingMode(vault, globalMode);
    if (!tradingVault) continue;

    if (tradingVault.position === 1) {
      await evaluateClose(tradingVault, market);
      continue;
    }

    if (!selectedStrategyIds.has(tradingVault.strategy)) {
      log("entry_strategy_skipped", {
        vault: tradingVault.address,
        strategy: STRATEGY_NAMES[tradingVault.strategy] || "UNKNOWN",
        reason: "Strategy was not selected by LLM_B"
      });
      continue;
    }

    const strategyName = STRATEGY_NAMES[tradingVault.strategy];
    const strategyDetail = strategyDecision.strategyDetails?.find((strategy) => strategy.name === strategyName);
    const entryDecision = strategyDetail
      ? {
          confidence: strategyDetail.confidence,
          reason: strategyDecision.reason,
          supportingEvidence: strategyDetail.supportingEvidence,
          riskFlags: strategyDetail.riskFlags
        }
      : strategyDecision;
    const proposal = strategyDecision.fallback
      ? proposeVaultTradingAction(tradingVault, market, null, config.tradeData)
      : proposeSelectedStrategyEntry(tradingVault, entryDecision, config.tradeData);
    await executeAndLog("entry_action", tradingVault, proposal);
  }
}

async function ensureTradingMode(vault, globalMode) {
  if (vault.mode === 0) return vault;

  const proposal = proposeMarketMakerAction(vault, globalMode);
  const execution = await executeAndLog("trading_mode_transition", vault, proposal);
  if (!execution.submitted) return null;

  const refreshed = await client.readVault(vault.address);
  if (refreshed.mode !== 0) throw new Error(`Vault ${vault.address} did not enter Trading mode after DOCK`);
  return refreshed;
}

async function evaluateClose(vault, market) {
  const decision = await llmAgents.decideClose({ vault, market });
  const proposal = decision.action === "FALLBACK"
    ? { type: "HOLD", reason: decision.reason }
    : proposeVaultTradingAction(vault, market, decision, config.tradeData);
  log("llm_c_close_decision", { vault: vault.address, decision });
  await executeAndLog("close_action", vault, proposal);
}

async function executeAndLog(event, vault, proposal) {
  const execution = await executor.execute(vault.address, proposal);
  log(event, {
    vault: vault.address,
    strategy: STRATEGY_NAMES[vault.strategy] || "UNKNOWN",
    mode: vault.mode,
    position: vault.position,
    proposal,
    execution
  });
  return execution;
}

function log(event, details) {
  const row = {
    event,
    time: new Date().toISOString(),
    vault: details.vault,
    mode: details.mode ?? details.decision?.mode,
    strategy: details.strategy,
    position: formatPosition(details.position),
    action: details.proposal?.type ?? details.decision?.action,
    selectedStrategies: formatList(details.selectedStrategies),
    marketCharacter: details.decision?.marketCharacter,
    price: details.market?.price,
    adx: details.market?.adx,
    atr: details.market?.atr14Pct,
    rsi: details.market?.rsi14,
    bbWidth: details.market?.bbWidth,
    confidence: details.decision?.confidence ?? details.proposal?.confidence,
    submitted: details.execution?.submitted,
    status: details.execution?.status,
    txHash: details.execution?.hash,
    reason: details.proposal?.reason ?? details.decision?.reason
  };

  console.table(Object.fromEntries(
    Object.entries(row).filter(([, value]) => value !== undefined && value !== null && value !== "")
  ));
}

// function log(event, details) {
//   const row = {
//     event,
//     time: new Date().toISOString(),
//     vault: details.vault,
//     mode: details.mode ?? details.decision?.mode,
//     strategy: details.strategy,
//     position: formatPosition(details.position),
//     action: details.proposal?.type ?? details.decision?.action,
//     selectedStrategies: formatList(details.selectedStrategies),
//     marketCharacter: details.decision?.marketCharacter,
//     price: details.market?.price,
//     adx: details.market?.adx,
//     atr: details.market?.atr14Pct,
//     rsi: details.market?.rsi14,
//     bbWidth: details.market?.bbWidth,
//     confidence: details.decision?.confidence ?? details.proposal?.confidence,
//     submitted: details.execution?.submitted,
//     status: details.execution?.status,
//     txHash: details.execution?.hash,
//     reason: details.proposal?.reason ?? details.decision?.reason
//   };

//   console.table(Object.fromEntries(
//     Object.entries(row).filter(([, value]) => value !== undefined && value !== null && value !== "")
//   ));
// }

function formatPosition(position) {
  return position === 1 ? "LONG" : position === 0 ? "FLAT" : position;
}

function formatList(values) {
  return Array.isArray(values) ? values.join(", ") : values;
}

function replacer(_key, value) {
  return typeof value === "bigint" ? value.toString() : value;
}

function serialize(value) {
  return JSON.parse(JSON.stringify(value, replacer));
}

console.log(`Trading backend started; polling every ${config.pollIntervalMs}ms`);
await scan();
setTimeout(runNextScan, config.pollIntervalMs);

async function runNextScan() {
  try {
    await scan();
  } catch (error) {
    console.error(error);
  } finally {
    setTimeout(runNextScan, config.pollIntervalMs);
  }
}
