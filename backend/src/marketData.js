import "dotenv/config";
import { defaultCandlePath, readCandles, syncCandles } from "./binance.js";

const PERIOD = 14;

export class MarketDataEngine {
  constructor({
    symbol = process.env.MARKET_SYMBOL || "BTCUSDT",
    interval = process.env.MARKET_INTERVAL || "1h",
    candlePath = process.env.CANDLE_CSV_PATH || defaultCandlePath(),
    refreshMs = Number(process.env.MARKET_REFRESH_MS || 300000),
    candleLimit = Number(process.env.MARKET_CANDLE_LIMIT || 200),
    syncOnStart = process.env.MARKET_SYNC_ON_START !== "false"
  } = {}) {
    this.symbol = symbol;
    this.interval = interval;
    this.candlePath = candlePath;
    this.refreshMs = refreshMs;
    this.candleLimit = Math.max(candleLimit, 60);
    this.syncOnStart = syncOnStart;
    this.lastSync = 0;
    this.candles = [];
  }

  async snapshot() {
    const now = Date.now();
    if (!this.candles.length || (this.syncOnStart && now - this.lastSync >= this.refreshMs)) {
      try {
        this.candles = await syncCandles({ filePath: this.candlePath, symbol: this.symbol, interval: this.interval, limit: this.candleLimit });
        this.lastSync = now;
      } catch (error) {
        this.candles = await readCandles(this.candlePath, this.candleLimit);
        if (!this.candles.length) throw error;
        console.warn(`Market sync failed; using cached candles: ${error.message}`);
      }
    }
    if (this.candles.length < PERIOD + 2) throw new Error(`Not enough candle history for technical analysis: need at least ${PERIOD + 2}, got ${this.candles.length}`);
    return buildTechnicalSnapshot(this.candles, this.symbol, this.candlePath);
  }
}

export function buildTechnicalSnapshot(candles, symbol = "BTCUSDT", source = "csv") {
  const latest = candles[0];
  const closes = candles.map((candle) => candle.close);
  const returns = closes.slice(0, 23).map((close, index) => percentChange(close, closes[index + 1]));
  const bb = bollinger(closes, 20);
  const currentPrice = latest.close;
  const momentum6hPct = percentChange(currentPrice, candles[6]?.close ?? currentPrice);
  const rsi14 = rsi(candles, PERIOD);
  const atr14Pct = atrPercent(candles, PERIOD);
  return {
    symbol,
    asOf: new Date(latest.openTime).toISOString(),
    currentPrice,
    price: currentPrice,
    return24hPct: percentChange(currentPrice, candles[24]?.close ?? currentPrice),
    momentum6hPct,
    momentum: momentum6hPct / 100,
    volatility24hPct: standardDeviation(returns),
    atr14Pct,
    atr: atr14Pct,
    rsi14,
    rsi: rsi14,
    adx: adx(candles, PERIOD),
    bbWidth: bb.width,
    bollingerUpper: bb.upper,
    bollingerMiddle: bb.middle,
    bollingerLower: bb.lower,
    candleCount: candles.length,
    source
  };
}

function percentChange(current, previous) {
  return Number.isFinite(current) && Number.isFinite(previous) && previous !== 0 ? ((current - previous) / previous) * 100 : 0;
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function standardDeviation(values) {
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}

function atrPercent(candles, period) {
  const ranges = [];
  for (let index = 0; index < Math.min(period, candles.length - 1); index += 1) {
    const current = candles[index];
    const previousClose = candles[index + 1].close;
    ranges.push(Math.max(current.high - current.low, Math.abs(current.high - previousClose), Math.abs(current.low - previousClose)));
  }
  return candles[0].close === 0 ? 0 : (average(ranges) / candles[0].close) * 100;
}

function rsi(candles, period) {
  const chronological = [...candles].reverse();
  const deltas = chronological.slice(1).map((candle, index) => candle.close - chronological[index].close);
  if (deltas.length < period) return 50;
  let gains = average(deltas.slice(0, period).map((delta) => Math.max(delta, 0)));
  let losses = average(deltas.slice(0, period).map((delta) => Math.max(-delta, 0)));
  for (const delta of deltas.slice(period)) {
    gains = (gains * (period - 1) + Math.max(delta, 0)) / period;
    losses = (losses * (period - 1) + Math.max(-delta, 0)) / period;
  }
  if (losses === 0) return gains === 0 ? 50 : 100;
  return Number((100 - 100 / (1 + gains / losses)).toFixed(2));
}

function bollinger(closes, period) {
  const values = closes.slice(0, period);
  const middle = average(values);
  const deviation = standardDeviation(values);
  return { middle, upper: middle + 2 * deviation, lower: middle - 2 * deviation, width: middle === 0 ? 0 : (4 * deviation) / middle };
}

function adx(candles, period) {
  if (candles.length < period * 2) return 0;
  const chronological = [...candles].reverse();
  const tr = [];
  const plusDm = [];
  const minusDm = [];
  for (let index = 1; index < chronological.length; index += 1) {
    const current = chronological[index];
    const previous = chronological[index - 1];
    const upMove = current.high - previous.high;
    const downMove = previous.low - current.low;
    tr.push(Math.max(current.high - current.low, Math.abs(current.high - previous.close), Math.abs(current.low - previous.close)));
    plusDm.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDm.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }
  const dx = [];
  for (let index = period; index < tr.length; index += 1) {
    const trueRange = average(tr.slice(index - period, index + 1));
    const plus = trueRange === 0 ? 0 : (average(plusDm.slice(index - period, index + 1)) / trueRange) * 100;
    const minus = trueRange === 0 ? 0 : (average(minusDm.slice(index - period, index + 1)) / trueRange) * 100;
    dx.push(plus + minus === 0 ? 0 : (Math.abs(plus - minus) / (plus + minus)) * 100);
  }
  return Number(average(dx.slice(-period)).toFixed(2));
}
