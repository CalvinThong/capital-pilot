# Shared AI Autonomous Trading Platform

This repository contains the on-chain risk boundary and a Node.js transaction backend for user-owned strategy vaults.

## Architecture

- `AgentFactory` deploys one immutable `AgentVault` per user.
- `AgentVault` owns allowlisted USDT/BTC-style ERC-20 assets and enforces strategy metadata, trade bounds, position state, and agent permissions.
- `AquaTradingAdapter` is a thin, stateless pointer to the deployed `XYCSwap`-compatible Aqua app and the Aqua registry. It holds no funds and takes no custody.
- `AgentVault` calls the Aqua app (`XYCSwap.swapExactIn`) directly and implements `IXYCSwapCallback.xycSwapCallback` itself, since Aqua's callback pattern always targets the direct caller. The vault validates the callback comes from the trusted execution app before pushing tokens back to Aqua's virtual ledger via `aqua.push`.
- `AgentVault` calls Aqua `ship` and `dock` directly so Aqua records the vault as the maker. Aqua never takes custody of tokens; it only tracks virtual balances backed by the vault's own ERC-20 allowance. The vault approves only the configured asset amounts for each strategy.
- The Node.js backend reads vault state, runs deterministic agent policies, and submits only `executeTrade`, `closeTrade`, and `switchMarketMaker` transactions.

AI is an untrusted decision-maker. The vault remains the final authority.

## Smart contracts

Prerequisite: install Foundry.

```powershell
forge test
forge build
```

The current contracts are intentionally non-upgradeable. The Aqua adapter is deployed and bound in this order:

1. Use the official Aqua registry. Deploy an `XYCSwap` app instance pointed at it (anyone can build an app on top of Aqua; there is no single official router).
2. Deploy `AquaTradingAdapter(app, aqua)`.
3. Deploy `AgentFactory(assetA, assetB, adapter, aqua, authorizedAgent)`.
4. Create vaults through the factory.

The supplied deterministic deployment is:

- Aqua registry: `0x1111113ccf1426a8e30e2bff5e005d929bf6a90`

For a local Anvil deployment:

```powershell
anvil
forge script script/DeployLocal.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

For a real network deployment, set these environment variables first:

```powershell
$env:ASSET_A = "0x..."
$env:ASSET_B = "0x..."
$env:AQUA = "0x1111113ccf1426a8e30e2bff5e005d929bf6a90"
$env:AUTHORIZED_AGENT = "0x..."
```

Then deploy with the deployer key supplied through Foundry:

```powershell
forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --broadcast
```

The production script deploys `XYCSwap` (bound to the real Aqua registry), `AquaTradingAdapter`, `MarketRegimeRegistry`, and `AgentFactory` in the same broadcast sequence. It does not deploy or modify the official Aqua registry. Set the backend's `REGIME_REGISTRY_ADDRESS` to the returned registry address.

The factory binds every new vault to its market-regime registry. Changes to the linked decision and position-history schema therefore require redeploying the registry, factory, and vaults together.

To deploy a vault through an existing factory:

```powershell
$env:FACTORY_ADDRESS = "0x..."
$env:STRATEGY = "0"       # 0 Momentum, 1 TechnicalAnalysis, 2 DCA
$env:MIN_TRADE = "100000000"
$env:MAX_TRADE = "1000000000"

forge script script/DeployVault.s.sol:DeployVault `
	--rpc-url $env:RPC_URL `
	--private-key $env:PRIVATE_KEY `
	--broadcast
```

The broadcasting account becomes the vault owner. The vault's authorized agent is copied from the factory. Trade amounts use the configured asset's smallest units; the example values assume six-decimal USDT-style units.

`IAqua.sol` matches Aqua's registry API: `ship`, `dock`, `pull`, `push`, `rawBalances`, and `safeBalances`. `src/adapters/XYCSwap.sol` and `src/AquaApp.sol` are the official Aqua reference app/base contract, imported as-is. Trade payloads passed to `executeTrade` and `closeTrade` are ABI-encoded as `(XYCSwap.Strategy, takerData)`; `AgentVault` derives the swap direction (`zeroForOne`) itself from which side of `{token0,token1}` matches the asset being sold, and validates the strategy's token pair matches the vault's own `{assetA,assetB}` before calling the app. The local tests deploy the real `XYCSwap` contract against a virtual-ledger-accurate `MockAqua`, so the constant-product swap math and callback settlement are exercised end-to-end, not stubbed out.


## Backend

Prerequisite: Node.js 20+.

```powershell
npm install
Copy-Item .env.example .env
npm start
```

The backend is scaffolded for read-only polling by default. Set `EXECUTION_ENABLED=true` only after configuring a dedicated agent key and reviewing the adapter ABI and risk controls.

Environment variables are documented in `.env.example`.
