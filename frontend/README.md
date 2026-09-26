# Capital Pilot frontend

React, MUI, ethers, and Vite dashboard for the local Capital Pilot deployment.

## Run locally

Start Anvil and deploy the contracts, then update `src/config/contracts.js` with the active factory and market-regime registry addresses.

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:5173` and connect MetaMask to chain ID `31337` at `http://127.0.0.1:8545`.

## Vault creation

Creating and funding a vault requires MetaMask confirmations for the factory deployment, each nonzero ERC-20 approval, and the final deposit. The deposited asset-A amount is used as the vault's maximum trade size.

Realized PnL percentage requires vaults deployed from the current `AgentVault` bytecode. Older local vaults remain visible but are marked as legacy vaults.

## Checks

```powershell
npm run lint
npm run build
```# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
