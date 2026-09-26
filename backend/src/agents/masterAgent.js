export const MODES = Object.freeze({ MARKET_MAKER: "MARKET_MAKER", TRADING: "TRADING", HOLD: "HOLD" });

export function classifyMarket({ adx, bbWidth, momentum }) {
  const marketMakerScore = Math.max(0, Math.min(100, Math.round(50 - adx + (bbWidth * 100) - (Math.abs(momentum) * 100))));
  const mode = marketMakerScore >= 70 ? MODES.MARKET_MAKER : marketMakerScore <= 45 ? MODES.TRADING : MODES.HOLD;
  return { marketMakerScore, mode, confidence: Math.abs(marketMakerScore - 57.5) / 42.5 };
}
