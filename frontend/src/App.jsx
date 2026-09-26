import { useEffect, useState } from 'react'
import { AccountBalanceWalletRounded, AddRounded, DashboardRounded, InsightsRounded, ShowChartRounded } from '@mui/icons-material'
import { Alert, AppBar, Box, Button, Chip, Container, Snackbar, Tab, Tabs, Toolbar, Typography } from '@mui/material'
import { CreateVaultView } from './components/CreateVaultView.jsx'
import { RegimeView } from './components/RegimeView.jsx'
import { VaultsView } from './components/VaultsView.jsx'
import { CONTRACT_CONFIG } from './config/contracts.js'
import { connectWallet, createAndFundVault, loadDashboard, shortAddress } from './lib/contracts.js'
import './App.css'

const EMPTY_DATA = {
  assetA: { symbol: 'Asset A' },
  assetB: { symbol: 'Asset B' },
  vaults: [],
  regimes: { latest: null, history: [] },
}

const NAV_ITEMS = [
  { label: 'Market regime', icon: <InsightsRounded />, value: 'regimes' },
  { label: 'Agent vaults', icon: <DashboardRounded />, value: 'vaults' },
  { label: 'Create vault', icon: <AddRounded />, value: 'create' },
]

function App() {
  const [view, setView] = useState('regimes')
  const [account, setAccount] = useState('')
  const [data, setData] = useState(EMPTY_DATA)
  const [vaultFilter, setVaultFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function refreshData() {
    setLoading(true)
    try {
      setData(await loadDashboard())
    } catch (loadError) {
      setError(readableError(loadError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    loadDashboard()
      .then((result) => {
        if (active) setData(result)
      })
      .catch((loadError) => {
        if (active) setError(readableError(loadError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!window.ethereum) return undefined
    const handleAccounts = (accounts) => setAccount(accounts[0] || '')
    const handleChain = () => refreshData()
    window.ethereum.on('accountsChanged', handleAccounts)
    window.ethereum.on('chainChanged', handleChain)
    window.ethereum.request({ method: 'eth_accounts' }).then(handleAccounts).catch(() => {})
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccounts)
      window.ethereum.removeListener('chainChanged', handleChain)
    }
  }, [])

  async function handleConnect() {
    try {
      const wallet = await connectWallet()
      setAccount(wallet.account)
      await refreshData()
    } catch (walletError) {
      setError(readableError(walletError))
    }
  }

  async function handleCreate(values) {
    try {
      const address = await createAndFundVault({ account, ...values })
      await refreshData()
      setView('vaults')
      setVaultFilter('mine')
      return address
    } catch (createError) {
      setError(readableError(createError))
      throw createError
    }
  }

  return (
    <Box className="app-shell">
      <AppBar position="sticky" elevation={0} className="topbar">
        <Toolbar className="topbar-inner">
          <Box className="brand-lockup">
            <Box className="brand-mark"><ShowChartRounded /></Box>
            <Box><Typography className="brand-name">Capital Pilot</Typography><Typography className="brand-subtitle">Autonomous vault console</Typography></Box>
          </Box>
          <Box className="network-state"><span className="status-dot" />Localhost <span>#{CONTRACT_CONFIG.chainId}</span></Box>
          <Button variant={account ? 'outlined' : 'contained'} startIcon={<AccountBalanceWalletRounded />} onClick={handleConnect}>
            {account ? shortAddress(account) : 'Connect wallet'}
          </Button>
        </Toolbar>
      </AppBar>

      <Box className="nav-band">
        <Container maxWidth="xl">
          <Tabs value={view} onChange={(_, value) => setView(value)} variant="scrollable" scrollButtons={false}>
            {NAV_ITEMS.map((item) => <Tab key={item.value} icon={item.icon} iconPosition="start" label={item.label} value={item.value} />)}
          </Tabs>
        </Container>
      </Box>

      <Container component="main" maxWidth="xl" className="main-content">
        <Box className="protocol-strip">
          <Typography variant="caption">Factory</Typography>
          <Typography className="mono">{shortAddress(CONTRACT_CONFIG.factoryAddress)}</Typography>
          <span />
          <Typography variant="caption">Registry</Typography>
          <Typography className="mono">{shortAddress(CONTRACT_CONFIG.regimeRegistryAddress)}</Typography>
          {data.regimes.latest && <Chip size="small" label={data.regimes.latest.mode} color={data.regimes.latest.mode === 'Trading' ? 'success' : 'warning'} />}
        </Box>

        {view === 'regimes' && <RegimeView regimes={data.regimes} loading={loading} onRefresh={refreshData} />}
        {view === 'vaults' && (
          <VaultsView vaults={data.vaults} account={account} filter={vaultFilter} onFilterChange={setVaultFilter} onRefresh={refreshData} loading={loading} />
        )}
        {view === 'create' && (
          <CreateVaultView account={account} assets={{ assetA: data.assetA, assetB: data.assetB }} onConnect={handleConnect} onCreate={handleCreate} />
        )}
      </Container>

      <Snackbar open={Boolean(error)} autoHideDuration={7000} onClose={() => setError('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" variant="filled" onClose={() => setError('')}>{error}</Alert>
      </Snackbar>
    </Box>
  )
}

function readableError(error) {
  return error?.shortMessage || error?.reason || error?.message || 'Unexpected error'
}

export default App
