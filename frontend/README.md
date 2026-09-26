# Capital Pilot frontend

React, MUI, ethers, and Vite dashboard for the local Capital Pilot deployment.

## Run locally

Start Anvil and deploy the contracts together, then update `src/config/contracts.js` with the active factory and market-regime registry addresses. The factory and all vaults must reference that same registry.

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:5173` and connect MetaMask to chain ID `31337` at `http://127.0.0.1:8545`.

## Vault creation

Creating and funding a vault requires MetaMask confirmations for the factory deployment, each nonzero ERC-20 approval, and the final deposit. The deposited asset-A amount is used as the vault's maximum trade size.

Realized PnL percentage and linked position decisions require vaults deployed from the current `AgentVault` bytecode. Older local vaults remain visible but are marked as legacy vaults.

## Checks

```powershell
npm run lint
npm run build
```

## Deploy to Firebase Hosting

Hosting config is in `firebase.json`; it serves `dist` as a single-page app.

1. Create a project in the Firebase console, then log in:

   ```powershell
   npx firebase-tools login
   ```

2. Point `src/config/contracts.js` at Sepolia. The hosted site cannot reach `127.0.0.1:8545`.

   ```js
   chainId: 11155111,
   chainIdHex: '0xaa36a7',
   chainName: 'Sepolia',
   rpcUrl: '<SEPOLIA_RPC_URL>',
   factoryAddress: '<FACTORY_ADDRESS>',
   regimeRegistryAddress: '<REGIME_REGISTRY_ADDRESS>',
   ```

3. Build and deploy, passing your project ID:

   ```powershell
   npm run build
   npx firebase-tools deploy --only hosting --project <project-id>
   ```

   To avoid passing `--project` every time, link the project once with `npx firebase-tools use --add`; after that, `npm run deploy` builds and deploys. Find your project ID with `npx firebase-tools projects:list`.

The site is served at `https://<project-id>.web.app`. The RPC URL is bundled into the public site, so restrict any provider API key to your Firebase domain.
