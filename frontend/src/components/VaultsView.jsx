import { AccountBalanceWalletRounded, RefreshRounded } from '@mui/icons-material'
import { Box, Chip, IconButton, Paper, Skeleton, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material'
import { formatToken, MODES, POSITIONS, shortAddress, STRATEGIES } from '../lib/contracts.js'

export function VaultsView({ vaults, account, filter, onFilterChange, onRefresh, loading }) {
  const visibleVaults = filter === 'mine' && account
    ? vaults.filter((vault) => vault.owner.toLowerCase() === account.toLowerCase())
    : vaults

  return (
    <Box className="view-stack">
      <section className="section-heading vault-heading">
        <Box>
          <Typography variant="overline">Autonomous capital</Typography>
          <Typography variant="h4">Agent vaults</Typography>
        </Box>
        <Box className="vault-controls">
          <ToggleButtonGroup exclusive size="small" value={filter} onChange={(_, value) => value && onFilterChange(value)}>
            <ToggleButton value="all">All vaults</ToggleButton>
            <ToggleButton value="mine" disabled={!account}>My vaults</ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title="Refresh vaults"><IconButton onClick={onRefresh} aria-label="Refresh vaults"><RefreshRounded /></IconButton></Tooltip>
        </Box>
      </section>

      {loading ? (
        <Box className="vault-grid">{[1, 2, 3].map((item) => <Skeleton key={item} variant="rounded" height={270} />)}</Box>
      ) : (
        <Box className="vault-grid">
          {visibleVaults.map((vault) => <VaultCard key={vault.address} vault={vault} account={account} />)}
          {!visibleVaults.length && (
            <Paper className="empty-state" elevation={0}>
              <AccountBalanceWalletRounded />
              <Typography variant="h6">No vaults in this view</Typography>
              <Typography color="text.secondary">Connect another wallet or create the first vault.</Typography>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  )
}

function VaultCard({ vault, account }) {
  const isOwner = account && vault.owner.toLowerCase() === account.toLowerCase()
  const pnlPositive = vault.pnl !== null && vault.pnl >= 0n
  return (
    <Paper className="vault-card" elevation={0}>
      <Box className="vault-card-top">
        <Box>
          <Typography variant="overline">{isOwner ? 'Your vault' : 'Vault'}</Typography>
          <Typography className="mono address" title={vault.address}>{shortAddress(vault.address)}</Typography>
        </Box>
        <Chip size="small" label={MODES[vault.mode] || 'Unknown'} color={vault.mode === 1 ? 'warning' : 'success'} />
      </Box>

      <Box className="strategy-line">
        <span className="strategy-index">0{vault.strategy + 1}</span>
        <Box><Typography color="text.secondary" variant="caption">STRATEGY</Typography><Typography variant="h6">{STRATEGIES[vault.strategy] || 'Unknown'}</Typography></Box>
      </Box>

      <Box className="balance-grid">
        <Metric label={`${vault.assetA.symbol} balance`} value={formatToken(vault.balanceA, vault.assetA)} />
        <Metric label={`${vault.assetB.symbol} balance`} value={formatToken(vault.balanceB, vault.assetB)} />
        <Metric label="Position" value={POSITIONS[vault.position] || 'Unknown'} accent={vault.position === 1} />
        <Metric
          label="Realized PnL"
          value={vault.pnl === null ? 'Legacy vault' : `${pnlPositive ? '+' : ''}${formatToken(vault.pnl, vault.assetA)} ${vault.assetA.symbol}`}
          detail={vault.pnlPercent === null ? 'No closed trades' : `${vault.pnlPercent >= 0 ? '+' : ''}${vault.pnlPercent.toFixed(2)}%`}
          tone={vault.pnl === null ? '' : pnlPositive ? 'positive' : 'negative'}
        />
      </Box>
      <Typography variant="caption" color="text.secondary" className="owner-line">Owner {shortAddress(vault.owner)}</Typography>
    </Paper>
  )
}

function Metric({ label, value, detail, accent, tone = '' }) {
  return (
    <Box className={`metric ${tone} ${accent ? 'accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </Box>
  )
}
