import { useState } from 'react'
import { AddRounded, CheckCircleRounded } from '@mui/icons-material'
import { Alert, Box, Button, CircularProgress, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { STRATEGIES } from '../lib/contracts.js'

const INITIAL_FORM = { amountA: '', amountB: '', minTrade: '', strategy: '0' }

export function CreateVaultView({ account, assets, onConnect, onCreate }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [status, setStatus] = useState('')
  const [createdAddress, setCreatedAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setSubmitting(true)
    setCreatedAddress('')
    try {
      const address = await onCreate({ ...form, onStep: setStatus })
      setCreatedAddress(address)
      setForm(INITIAL_FORM)
    } catch {
      setStatus('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box className="create-layout">
      <section className="create-intro">
        <Typography variant="overline">Deploy capital</Typography>
        <Typography variant="h3">Create an agent vault</Typography>
        <Typography color="text.secondary">
          Configure risk, fund both sides, and hand execution to the authorized agent.
        </Typography>
        <Box className="flow-list">
          {['Deploy vault', 'Approve assets', 'Fund vault'].map((label, index) => (
            <Box key={label}><span>0{index + 1}</span><Typography>{label}</Typography></Box>
          ))}
        </Box>
      </section>

      <Paper component="form" onSubmit={submit} className="create-form" elevation={0}>
        <Box>
          <Typography variant="h5">Vault parameters</Typography>
          <Typography color="text.secondary">Maximum trade size is set to the deposited {assets?.assetA.symbol || 'asset A'} amount.</Typography>
        </Box>
        <TextField select label="Strategy" value={form.strategy} onChange={update('strategy')} fullWidth>
          {STRATEGIES.map((strategy, index) => <MenuItem key={strategy} value={String(index)}>{strategy}</MenuItem>)}
        </TextField>
        <Box className="form-row">
          <TextField required label={`Amount ${assets?.assetA.symbol || 'A'}`} value={form.amountA} onChange={update('amountA')} type="number" slotProps={{ htmlInput: { min: 0, step: 'any' } }} />
          <TextField label={`Amount ${assets?.assetB.symbol || 'B'}`} value={form.amountB} onChange={update('amountB')} type="number" slotProps={{ htmlInput: { min: 0, step: 'any' } }} />
        </Box>
        <TextField required label={`Minimum trade (${assets?.assetA.symbol || 'A'})`} value={form.minTrade} onChange={update('minTrade')} type="number" slotProps={{ htmlInput: { min: 0, step: 'any' } }} fullWidth />

        {!account ? (
          <Button variant="contained" size="large" onClick={onConnect}>Connect wallet to continue</Button>
        ) : (
          <Button variant="contained" size="large" type="submit" disabled={submitting} startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <AddRounded />}>
            {submitting ? status : 'Create and fund vault'}
          </Button>
        )}
        {createdAddress && <Alert icon={<CheckCircleRounded />} severity="success">Vault created: <span className="mono">{createdAddress}</span></Alert>}
      </Paper>
    </Box>
  )
}
