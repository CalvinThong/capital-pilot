export const STRATEGIES = Object.freeze({ MOMENTUM: 0, TECHNICAL_ANALYSIS: 1, DCA: 2 });

export function decideEntry({ vault, market }) {
  if (vault.mode !== 0 || vault.position !== 0) return { action: "HOLD", amountIn: 0, reason: "Vault is not flat and trading" };
  const bullish = market.momentum > 0 && market.rsi < 70;
  if (!bullish) return { action: "HOLD", amountIn: 0, reason: "Entry conditions are not met" };
  return { action: "OPEN_LONG", amountIn: vault.minTrade, reason: "Policy conditions are met" };
}
