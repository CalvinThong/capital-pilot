# Node.js backend

The backend is intentionally split into chain access, policy agents, and transaction execution.

- `client.js`: reads factory and vault state using ethers.
- `agents/masterAgent.js`: classifies market regime. It never submits trades.
- `agents/decisionAgent.js`: proposes an entry amount bounded by on-chain values.
- `agents/profitTakingAgent.js`: proposes exits for existing positions.
- `transactionExecutor.js`: the only module that can submit vault transactions.
- `marketData.js`: supplies the current market snapshot to the policy pipeline.
- `strategyRunner.js`: runs the master, entry, and exit policies and returns an action proposal.

The runtime flow is:

```text
Binance hourly candles -> ADX/ATR/RSI/Bollinger snapshot -> LLM_A regime
	MARKET_MAKER -> SHIP eligible vaults
	TRADING -> LLM_B strategy selection -> OPEN selected flat vaults
					-> LLM_C exit decision -> CLOSE/HOLD open positions
```

Execution is disabled unless `EXECUTION_ENABLED=true`. `OPEN_LONG` and `CLOSE` resolve a compatible market-maker vault and encode `(XYCSwap.Strategy, takerData)` for the configured Aqua app. If no maker is available, the action is reported as `pending` and no transaction is submitted. Market-maker transitions are generated from on-chain vault assets and balances. The executor has no withdrawal, configuration, ownership, or arbitrary adapter call path.

For deterministic testing, `FORCE_GLOBAL_MODE=MARKET_MAKER|TRADING` bypasses LLM_A and `FORCE_STRATEGIES=MOMENTUM,TECHNICAL_ANALYSIS,DCA` bypasses LLM_B. Either setting may contain a subset where applicable. `MARKET_MAKER_ONLY_VAULTS` remains a comma-separated address list; those vaults are kept in market-maker mode and excluded from trading decisions.

`MarketDataEngine.snapshot()` downloads the latest Binance `BTCUSDT` candles, persists them newest-first to `data/btcusdt_1h_history.csv`, and computes RSI, ATR percentage, ADX, Bollinger bands/width, volatility, 24-hour return, and six-hour momentum. Set `MARKET_SYNC_ON_START=false` to use only an existing CSV cache. If Binance is unavailable, the engine falls back to cached candles; it fails when no usable cache exists.
