import { AccessTimeRounded, InsightsRounded, RefreshRounded } from '@mui/icons-material'
import { Box, Chip, IconButton, Paper, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material'
import { STRATEGIES } from '../lib/contracts.js'

function formatDate(timestamp) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(timestamp * 1000))
}

export function RegimeView({ regimes, loading, onRefresh }) {
  if (loading) {
    return <Skeleton variant="rounded" height={360} sx={{ bgcolor: 'rgba(255,255,255,.05)' }} />
  }

  const latest = regimes.latest
  const latestStrategies = latest?.selectedStrategies || []
  const latestStrategyConfidenceById = latest?.strategyConfidenceById || []
  return (
    <Box className="view-stack">
      <section className="section-heading">
        <Box>
          <Typography variant="overline">Decision layer</Typography>
          <Typography variant="h4">Market regime</Typography>
        </Box>
        <Box className="vault-controls">
          <Typography color="text.secondary">Last 100 on-chain classifications</Typography>
          <Tooltip title="Refresh market regimes">
            <IconButton onClick={onRefresh} aria-label="Refresh market regimes"><RefreshRounded /></IconButton>
          </Tooltip>
        </Box>
      </section>

      <Paper className="regime-hero" elevation={0}>
        <Box className="regime-icon"><InsightsRounded /></Box>
        {latest ? (
          <>
            <Box>
              <Typography variant="overline">Current regime</Typography>
              <Typography variant="h2">{latest.mode}</Typography>
              <Typography color="text.secondary" className="regime-reason">{latest.reason}</Typography>
              <Box className="strategy-chips">
                {latestStrategies.map((strategy) => (
                  <Chip key={strategy} size="small" variant="outlined" label={`${strategy} ${latestStrategyConfidenceById[STRATEGIES.indexOf(strategy)]?.toFixed(2) || (latest.strategyConfidence ?? 0).toFixed(2)}%`} />
                ))}
              </Box>
              {latest.strategyReason && <Typography className="strategy-reason">{latest.strategyReason}</Typography>}
            </Box>
            <Box className="regime-metrics">
              <Box><span>Confidence</span><strong>{latest.confidence.toFixed(2)}%</strong></Box>
              <Box><span>Recorded</span><strong>{formatDate(latest.recordedAt)}</strong></Box>
            </Box>
          </>
        ) : (
          <Box>
            <Typography variant="h5">No regime recorded</Typography>
            <Typography color="text.secondary">The registry is ready for its first backend publication.</Typography>
          </Box>
        )}
      </Paper>

      <TableContainer component={Paper} elevation={0} className="data-table">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Regime</TableCell>
              <TableCell>Selected strategies</TableCell>
              <TableCell>Confidence</TableCell>
              <TableCell>Decision rationale</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {regimes.history.map((record) => (
              <TableRow key={record.index} hover>
                <TableCell data-label="Date"><span className="date-cell"><AccessTimeRounded />{formatDate(record.recordedAt)}</span></TableCell>
                <TableCell data-label="Regime"><Chip size="small" label={record.mode} color={record.mode === 'Trading' ? 'success' : 'warning'} /></TableCell>
                <TableCell data-label="Selected strategies">
                  <Box className="strategy-chips compact">
                    {record.selectedStrategies?.length ? record.selectedStrategies.map((strategy) => <Chip key={strategy} size="small" variant="outlined" label={strategy} />) : 'None'}
                  </Box>
                </TableCell>
                <TableCell data-label="Confidence"><span className="confidence-pair">Regime {record.confidence.toFixed(2)}%<br />Strategy {(record.strategyConfidence ?? 0).toFixed(2)}%</span></TableCell>
                <TableCell data-label="Decision rationale">
                  <span className="decision-rationale"><strong>Regime</strong>{record.reason}<strong>Strategy</strong>{record.strategyReason || 'No strategy selection for this regime.'}</span>
                </TableCell>
              </TableRow>
            ))}
            {!regimes.history.length && (
              <TableRow><TableCell className="empty-history" colSpan={5} align="center">No history available</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
