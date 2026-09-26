import { AccessTimeRounded, InsightsRounded } from '@mui/icons-material'
import { Box, Chip, Paper, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'

function formatDate(timestamp) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(timestamp * 1000))
}

export function RegimeView({ regimes, loading }) {
  if (loading) {
    return <Skeleton variant="rounded" height={360} sx={{ bgcolor: 'rgba(255,255,255,.05)' }} />
  }

  const latest = regimes.latest
  return (
    <Box className="view-stack">
      <section className="section-heading">
        <Box>
          <Typography variant="overline">Decision layer</Typography>
          <Typography variant="h4">Market regime</Typography>
        </Box>
        <Typography color="text.secondary">Last 100 on-chain classifications</Typography>
      </section>

      <Paper className="regime-hero" elevation={0}>
        <Box className="regime-icon"><InsightsRounded /></Box>
        {latest ? (
          <>
            <Box>
              <Typography variant="overline">Current regime</Typography>
              <Typography variant="h2">{latest.mode}</Typography>
              <Typography color="text.secondary" className="regime-reason">{latest.reason}</Typography>
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
              <TableCell align="right">Confidence</TableCell>
              <TableCell>Decision rationale</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {regimes.history.map((record) => (
              <TableRow key={record.index} hover>
                <TableCell data-label="Date"><span className="date-cell"><AccessTimeRounded />{formatDate(record.recordedAt)}</span></TableCell>
                <TableCell data-label="Regime"><Chip size="small" label={record.mode} color={record.mode === 'Trading' ? 'success' : 'warning'} /></TableCell>
                <TableCell data-label="Confidence" align="right">{record.confidence.toFixed(2)}%</TableCell>
                <TableCell data-label="Decision rationale">{record.reason}</TableCell>
              </TableRow>
            ))}
            {!regimes.history.length && (
              <TableRow><TableCell className="empty-history" colSpan={4} align="center">No history available</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
