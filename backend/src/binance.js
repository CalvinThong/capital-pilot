import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import axios from "axios";

const URLS = [
  "https://api.binance.com/api/v3/klines",
  "https://data-api.binance.vision/api/v3/klines"
];
const DEFAULT_SYMBOL = "BTCUSDT";
const DEFAULT_INTERVAL = "1h";
const DEFAULT_LIMIT = 1000;
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_RETRIES = 3;
const HEADER = "OPEN_TIME,OPEN_DATE,OPEN,HIGH,LOW,CLOSE,VOLUME,CLOSE_TIME";
const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export function defaultCandlePath() {
  return path.resolve(moduleDir, "..", "..", "data", "btcusdt_1h_history.csv");
}

export async function readCandles(filePath = defaultCandlePath(), limit = DEFAULT_LIMIT) {
  try {
    const content = (await fs.readFile(filePath, "utf8")).trim();
    if (!content) return [];
    return content.split(/\r?\n/).slice(1).map(parseCandle).filter(Boolean).slice(0, limit);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

export async function syncCandles({
  filePath = defaultCandlePath(),
  symbol = DEFAULT_SYMBOL,
  interval = DEFAULT_INTERVAL,
  limit = DEFAULT_LIMIT,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retries = DEFAULT_RETRIES
} = {}) {
  const existing = await readCandles(filePath, limit);
  const downloaded = await fetchKlines({ symbol, interval, limit, timeoutMs, retries });
  const fresh = downloaded.filter((candle) => !existing.some((saved) => saved.openTime === candle.openTime));
  const candles = [...fresh, ...existing].sort((a, b) => b.openTime - a.openTime).slice(0, limit);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const rows = candles.map(formatCandle);
  await fs.writeFile(filePath, `${HEADER}\n${rows.join("\n")}\n`, "utf8");
  return candles;
}

async function fetchKlines({ symbol, interval, limit, timeoutMs, retries }) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const url = URLS[attempt % URLS.length];
    try {
      const response = await axios.get(url, {
        timeout: timeoutMs,
        params: { symbol, interval, limit }
      });
      return response.data.map((row) => ({
        openTime: Number(row[0]),
        openDate: new Date(Number(row[0])).toISOString(),
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volume: Number(row[5]),
        closeTime: Number(row[6])
      })).filter(isValidCandle).sort((a, b) => b.openTime - a.openTime);
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
  throw new Error(`Binance candle download failed: ${lastError?.message || "unknown error"}`);
}

function parseCandle(line) {
  const [openTime, openDate, open, high, low, close, volume, closeTime] = line.split(",");
  const candle = { openTime: Number(openTime), openDate, open: Number(open), high: Number(high), low: Number(low), close: Number(close), volume: Number(volume), closeTime: Number(closeTime) };
  return isValidCandle(candle) ? candle : null;
}

function isValidCandle(candle) {
  return Number.isFinite(candle.openTime) && [candle.open, candle.high, candle.low, candle.close, candle.volume, candle.closeTime].every(Number.isFinite);
}

function formatCandle(candle) {
  return [candle.openTime, candle.openDate, candle.open, candle.high, candle.low, candle.close, candle.volume, candle.closeTime].join(",");
}
