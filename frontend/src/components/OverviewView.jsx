import { AccountBalanceWalletRounded, AutoGraphRounded, BalanceRounded, GroupsRounded, InsightsRounded, LockRounded, PsychologyRounded, ReceiptLongRounded, SavingsRounded, SwapHorizRounded, TrendingUpRounded, VerifiedUserRounded, WaterDropRounded } from '@mui/icons-material'
import { Box, Button, Paper, Typography } from '@mui/material'

const AUDIENCES = [
  { icon: <AccountBalanceWalletRounded />, title: 'Crypto holders', text: 'Put idle BTC and stablecoins to work with rules-based automation instead of watching charts all day.' },
  { icon: <WaterDropRounded />, title: 'Liquidity providers', text: 'Earn swap fees in ranging markets and step aside when strong trends would leave passive liquidity lopsided.' },
  { icon: <GroupsRounded />, title: 'DAOs and treasuries', text: 'Run transparent, auditable strategies where every automated decision can be reviewed on-chain.' },
  { icon: <PsychologyRounded />, title: 'AI and DeFi builders', text: 'Explore how AI agents can make accountable, verifiable decisions over real on-chain capital.' },
]

const BENEFITS = [
  { icon: <SwapHorizRounded />, title: 'Adapts to the market', text: 'Vaults switch between strategy trading and market making as the market regime changes.' },
  { icon: <ReceiptLongRounded />, title: 'Explainable decisions', text: 'Every AI decision is recorded on-chain with its confidence, rationale, and timestamp.' },
  { icon: <LockRounded />, title: 'Non-custodial', text: 'You own your vault. The agent can trade within your limits but can never withdraw funds.' },
  { icon: <BalanceRounded />, title: 'Bounded risk', text: 'Minimum and maximum trade sizes are enforced by the smart contract, not by trust.' },
  { icon: <AutoGraphRounded />, title: 'Multiple strategies', text: 'Choose Momentum, Technical Analysis, or DCA. The AI only enters when your strategy is selected.' },
  { icon: <VerifiedUserRounded />, title: 'Measurable results', text: 'Realized PnL and position history link each trade back to the decision that caused it.' },
]

const FLOW = [
  { step: '01', title: 'Read the market', text: 'Live BTC data is turned into RSI, ADX, ATR, Bollinger Band, and momentum signals.' },
  { step: '02', title: 'Classify the regime', text: 'An AI agent decides whether the market favors trading or market making.' },
  { step: '03', title: 'Select strategies', text: 'In trading mode, a second agent picks which strategies have a valid entry.' },
  { step: '04', title: 'Act and record', text: 'Vaults open, close, or provide liquidity, and each action is linked to its on-chain decision.' },
]

export function OverviewView({ onNavigate }) {
  return (
    <Box className="view-stack overview">
      <Paper className="overview-hero" elevation={0}>
        <Typography variant="overline">Capital Pilot</Typography>
        <Typography variant="h2">AI-managed vaults that adapt to every market</Typography>
        <Typography className="overview-lead" color="text.secondary">
          Capital Pilot reads the market, decides whether it is trending or ranging, and routes your capital accordingly:
          trading when there is a clear direction, and earning liquidity fees when there is not. Every decision is transparent and recorded on-chain.
        </Typography>
        <Box className="overview-actions">
          <Button variant="contained" size="large" startIcon={<InsightsRounded />} onClick={() => onNavigate('regimes')}>View market regime</Button>
          <Button variant="outlined" size="large" startIcon={<TrendingUpRounded />} onClick={() => onNavigate('create')}>Create a vault</Button>
        </Box>
      </Paper>

      <section className="overview-section">
        <Box className="overview-section-heading">
          <Typography variant="overline">Purpose</Typography>
          <Typography variant="h4">Why Capital Pilot exists</Typography>
        </Box>
        <Box className="overview-split">
          <Paper className="overview-card" elevation={0}>
            <Typography variant="h6">The problem</Typography>
            <Typography color="text.secondary">
              Crypto markets alternate between strong trends and sideways ranges. A single static strategy loses in one of them,
              managing positions by hand is exhausting, and most trading bots are black boxes you cannot audit. Connecting to LLM could be costly and complex for individual traders.
            </Typography>
          </Paper>
          <Paper className="overview-card accent" elevation={0}>
            <Typography variant="h6">Our approach</Typography>
            <Typography color="text.secondary">
              Capital Pilot combines AI market analysis with smart-contract vaults. The AI chooses the right mode and strategy,
              the contracts enforce your limits, and the reasoning behind every action is published on-chain.
            </Typography>
          </Paper>
        </Box>
      </section>

      <section className="overview-section">
        <Box className="overview-section-heading">
          <Typography variant="overline">Who it is for</Typography>
          <Typography variant="h4">Built for people who want automation they can trust</Typography>
        </Box>
        <Box className="overview-grid four">
          {AUDIENCES.map((item) => <FeatureCard key={item.title} {...item} />)}
        </Box>
      </section>

      <section className="overview-section">
        <Box className="overview-section-heading">
          <Typography variant="overline">How it works</Typography>
          <Typography variant="h4">From market data to on-chain action</Typography>
        </Box>
        <Box className="overview-flow">
          {FLOW.map((item) => (
            <Paper key={item.step} className="overview-flow-step" elevation={0}>
              <span className="mono">{item.step}</span>
              <Typography variant="h6">{item.title}</Typography>
              <Typography color="text.secondary">{item.text}</Typography>
            </Paper>
          ))}
        </Box>
      </section>

      <section className="overview-section">
        <Box className="overview-section-heading">
          <Typography variant="overline">Benefits</Typography>
          <Typography variant="h4">Why it benefits users</Typography>
        </Box>
        <Paper className="overview-card accent overview-highlight" elevation={0}>
          <Box className="overview-icon"><SavingsRounded /></Box>
          <Box>
            <Typography variant="overline">Main benefit</Typography>
            <Typography variant="h5">AI agent trading without paying for the AI</Typography>
            <Typography color="text.secondary">
              Running LLM agents around the clock is expensive: every market analysis, strategy selection, and exit decision is a paid API call.
              Capital Pilot runs these agents once for everyone and shares each decision across all vaults, so traders get AI-driven
              management without an LLM subscription or per-request fees. Users only pay the network gas their own trades need.
            </Typography>
          </Box>
        </Paper>
        <Box className="overview-grid three">
          {BENEFITS.map((item) => <FeatureCard key={item.title} {...item} />)}
        </Box>
      </section>
    </Box>
  )
}

function FeatureCard({ icon, title, text }) {
  return (
    <Paper className="overview-card" elevation={0}>
      <Box className="overview-icon">{icon}</Box>
      <Typography variant="h6">{title}</Typography>
      <Typography color="text.secondary">{text}</Typography>
    </Paper>
  )
}
