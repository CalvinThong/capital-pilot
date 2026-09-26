import OpenAI from "openai";

export const GLOBAL_MODES = Object.freeze({ MARKET_MAKER: "MARKET_MAKER", TRADING: "TRADING" });

export const STRATEGY_NAMES = Object.freeze(["MOMENTUM", "TECHNICAL_ANALYSIS", "DCA"]);
const MARKET_CHARACTERS = Object.freeze(["TRENDING", "RANGING", "WEAK", "VOLATILE", "UNCLEAR"]);
const MIN_STRATEGY_CONFIDENCE = 0.65;

export class OpenAIAgents {
  constructor({ apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_MODEL || "gpt-4o-mini", enabled = process.env.OPENAI_ENABLED === "true", openaiApiKey, openaiModel, openaiEnabled } = {}) {
    apiKey = openaiApiKey || apiKey;
    model = openaiModel || model;
    enabled = openaiEnabled ?? enabled;
    this.enabled = enabled;
    this.model = model;
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async classifyMarket(market) {
    if (!this.enabled) return { mode: null, confidence: 0, reason: "OpenAI disabled" };
    const result = await this.completeJson(
    `
    You are the global market-regime controller for an autonomous trading platform.

    Your job is to classify the CURRENT BTCUSDT MARKET REGIME into exactly one of:

    - MARKET_MAKER
    - TRADING

    Do NOT select a specific trade, price, order size, strike, or vault.
    Do NOT make a prediction about the future.
    Base the classification only on the supplied market indicators.

    Definitions:

    MARKET_MAKER:
    Use this regime when the market is relatively balanced/range-like and
    price action is suitable for repeatedly providing liquidity and capturing
    trading fees without strong directional momentum.

    Typical characteristics:
    - weak or moderate trend strength
    - price oscillating around its recent mean
    - no strong directional momentum
    - volatility sufficient to generate trading activity
    - no clear persistent directional trend

    TRADING:
    Use this regime when the market has a meaningful directional trend,
    strong momentum, a significant breakout/pullback, or conditions where
    inventory risk from passive liquidity provision may become elevated.

    Typical characteristics:
    - strong ADX / trend strength
    - strong directional momentum
    - significant deviation or breakout from the recent range
    - asymmetric directional movement
    - conditions where passive LP inventory can become heavily skewed

    Important:
    - A strong trend should generally favor TRADING even if short-term momentum
    temporarily reverses.
    - A temporary pullback inside a strong trend does not by itself make the
    market MARKET_MAKER.
    - High volatility alone is NOT sufficient to classify the market as TRADING.
    - Do not use a single indicator in isolation.
    - Consider the indicators together and explain the dominant regime.
    - If indicators conflict, prioritize trend strength and multi-timeframe
    directional evidence over a single short-term indicator.
    - confidence must represent how clearly the supplied indicators support the
    selected regime.
    - If the data is missing, invalid, contradictory, or insufficient to make a
    reliable classification, reduce confidence rather than inventing data.

    Return only the requested JSON fields.
    `,
    {
        task: "classify_global_market",
        market
    },
    {
        mode: [GLOBAL_MODES.MARKET_MAKER, GLOBAL_MODES.TRADING],
        confidence: "number 0..1",
        reason: "string"
    }
    );
    const mode = normalizeEnum(result?.mode);
    if (!Object.values(GLOBAL_MODES).includes(mode)) {
      throw new Error(`Invalid global mode from OpenAI: ${JSON.stringify(result?.mode)}`);
    }
    return { ...result, mode };
  }

  async selectStrategies(market) {
    if (!this.enabled) {
      return { strategies: [...STRATEGY_NAMES], confidence: 0, reason: "OpenAI disabled; using deterministic entry policies", fallback: true };
    }
    const result = await this.completeJson(
      `
    You are LLM_B, the Strategy Selection Agent in an autonomous trading system.

    Your ONLY responsibility is to determine which predefined trading strategies
    have a technically justified LONG ENTRY setup based on the supplied market
    indicators.

    You MUST NOT:
    - choose a vault
    - choose a trader
    - choose trade size
    - decide leverage
    - close positions
    - modify configuration
    - invent missing market data
    - make decisions based on assumptions not supported by the supplied data

    You may select ZERO, ONE, or MULTIPLE strategies.

    IMPORTANT:
    Do not select a strategy merely because it is available.
    Select it only when the supplied indicators provide a coherent setup.

    ==================================================
    AVAILABLE STRATEGIES
    ==================================================

    1. Momentum
    Goal:
    Capture an established directional move that is likely to continue.

    Prefer Momentum when:
    - ADX indicates a meaningful trend
    - momentum is positive
    - price action supports the direction
    - RSI is bullish but not severely overbought
    - price is not showing obvious exhaustion

    Typical supporting conditions:
    - ADX >= 20
    - momentum > 0
    - RSI approximately 50-70
    - price above Bollinger middle band

    Strong disqualifiers:
    - ADX very low / no trend
    - negative momentum
    - RSI showing severe exhaustion (for example > 75)
    - strong bearish price structure

    2. TechnicalAnalysis
    Goal:
    Capture a technically attractive entry based on price structure,
    trend, momentum, RSI and Bollinger positioning.

    Prefer TechnicalAnalysis when:
    - price structure is favorable
    - momentum is improving or positive
    - RSI supports a bullish entry
    - Bollinger position is supportive
    - the setup does not require a strong established trend

    Typical supporting conditions:
    - RSI approximately 45-65
    - momentum >= 0
    - price near or above Bollinger middle band
    - ADX can be low-to-moderate

    Strong disqualifiers:
    - clearly bearish momentum
    - severe volatility shock
    - RSI indicates extreme exhaustion
    - contradictory indicators with no clear setup

    3. DCA
    Goal:
    Accumulate an asset gradually rather than aggressively entering a
    strong directional breakout.

    Prefer DCA when:
    - the asset is temporarily weak or oversold
    - volatility is manageable
    - trend strength is low-to-moderate
    - the market is not in a severe crash regime

    Typical supporting conditions:
    - RSI <= 45 can support a DCA entry
    - ADX < 25 can support DCA
    - price near/below Bollinger middle band can support DCA
    - momentum may be slightly negative or neutral

    Strong disqualifiers:
    - extreme crash / abnormal downside momentum
    - extreme volatility
    - very strong bearish trend
    - evidence that the asset is undergoing a disorderly selloff

    ==================================================
    DECISION PROCESS
    ==================================================

    For EACH strategy:

    Step 1:
    Read all supplied indicators.

    Step 2:
    Determine whether the indicators are internally consistent with the
    strategy objective.

    Step 3:
    Identify supporting evidence.

    Step 4:
    Identify disqualifying evidence.

    Step 5:
    Assign a confidence from 0.0 to 1.0.

    Step 6:
    Select the strategy only if confidence >= 0.65 AND there is no major
    disqualifying condition.

    If indicators conflict materially, prefer:
    - no selection
    over
    - forcing a strategy selection.

    If market data is missing, do not infer it.

    IMPORTANT:
    The same strategy may be selected together with another strategy when
    their objectives are compatible.

    For example:
    - Momentum + TechnicalAnalysis can coexist when both see a strong bullish
      technical setup.
    - DCA should generally NOT be selected together with Momentum when the
      market is already strongly trending upward, unless the supplied data
      clearly supports both.
    - During extreme volatility or a crash-like move, selecting zero strategies
      is preferred.

    ==================================================
    CONFIDENCE
    ==================================================

    Confidence should reflect the quality and consistency of the evidence.

    0.90-1.00 = very strong, highly consistent setup
    0.80-0.89 = strong setup
    0.65-0.79 = acceptable setup with some uncertainty
    0.50-0.64 = weak / conflicting setup
    <0.50 = do not select

    Do NOT artificially increase confidence simply because multiple indicators
    are mildly positive.

    ==================================================
    OUTPUT REQUIREMENTS
    ==================================================

    Return ONLY valid JSON matching this structure:

    {
      "strategies": [
        {
          "name": "Momentum | TechnicalAnalysis | DCA",
          "confidence": 0.0,
          "supportingEvidence": [
            "ADX=...",
            "RSI=...",
            "momentum=...",
            "price relative to Bollinger middle=..."
          ],
          "riskFlags": [
            "..."
          ]
        }
      ],
      "overallConfidence": 0.0,
      "marketCharacter": "TRENDING | RANGING | WEAK | VOLATILE | UNCLEAR",
      "reason": "Concise explanation of why these strategies were or were not selected."
    }

    When no strategy has a sufficiently strong setup:

    {
      "strategies": [],
      "overallConfidence": 0.0,
      "marketCharacter": "...",
      "reason": "No strategy meets the entry criteria."
    }

    Never include markdown.
    Never include additional fields.
    `,
      {
        task: "select_entry_strategies",
        market
      },
      {
        strategies: [
          {
            name: "Momentum | TechnicalAnalysis | DCA",
            confidence: "number 0..1",
            supportingEvidence: ["string"],
            riskFlags: ["string"]
          }
        ],
        overallConfidence: "number 0..1",
        marketCharacter: "TRENDING | RANGING | WEAK | VOLATILE | UNCLEAR",
        reason: "string"
      }
    );

    const strategyDetails = normalizeStrategySelections(result?.strategies);
    const strategies = strategyDetails.map(({ name }) => name);
    const confidence = normalizeConfidence(result?.overallConfidence, "overallConfidence");
    const marketCharacter = normalizeEnum(result?.marketCharacter);
    if (!MARKET_CHARACTERS.includes(marketCharacter)) {
      throw new Error(`Invalid marketCharacter from OpenAI: ${JSON.stringify(result?.marketCharacter)}`);
    }
    return { ...result, strategies, strategyDetails, confidence, marketCharacter };
  }

  async decideClose({ vault, market }) {
    if (!this.enabled) return { action: "FALLBACK", minAmountOut: "0", confidence: 0, reason: "OpenAI disabled" };
    const result = await this.completeJson(
      "You are LLM_C, the position exit agent. Evaluate only whether this existing long position should CLOSE now or HOLD. Use the market indicators, immutable vault strategy, entry price, and position amounts together. Require a clear reason to close; do not open positions, resize positions, select strategies, or request withdrawals.",
      {
        task: "decide_position_exit",
        market,
        vault: {
          address: vault.address,
          strategy: STRATEGY_NAMES[vault.strategy] || "UNKNOWN",
          strategyId: vault.strategy,
          positionAmountIn: vault.positionAmountIn.toString(),
          positionAmountOut: vault.positionAmountOut.toString(),
          entryPrice: vault.entryPrice.toString()
        }
      },
      { action: ["CLOSE", "HOLD"], minAmountOut: "integer string", confidence: "number 0..1", reason: "string" }
    );

    const action = normalizeEnum(result?.action);
    if (!["CLOSE", "HOLD"].includes(action)) {
      throw new Error(`Invalid close action from OpenAI: ${JSON.stringify(result?.action)}`);
    }
    return { ...result, action };
  }

  async completeJson(system, input, schema) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${system}\nOutput valid JSON matching this shape: ${JSON.stringify(schema)}` },
        { role: "user", content: JSON.stringify(input) }
      ]
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned an empty response");
    return JSON.parse(content);
  }
}

function normalizeEnum(value) {
  if (Array.isArray(value)) {
    value = value.length === 1 ? value[0] : "";
  }
  return typeof value === "string"
    ? value.replace(/[\u00a0\u2000-\u200b]/g, " ").trim().toUpperCase()
    : "";
}

function normalizeStrategySelections(value) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const selections = values.map((selection) => {
    const detail = typeof selection === "object" && selection !== null ? selection : { name: selection };
    const name = normalizeStrategyName(detail.name);
    if (!STRATEGY_NAMES.includes(name)) {
      throw new Error(`Invalid strategy from OpenAI: ${JSON.stringify(selection)}`);
    }
    return {
      name,
      confidence: normalizeConfidence(detail.confidence ?? 1, `${name}.confidence`),
      supportingEvidence: normalizeStringArray(detail.supportingEvidence),
      riskFlags: normalizeStringArray(detail.riskFlags)
    };
  });

  return selections
    .filter((selection) => selection.confidence >= MIN_STRATEGY_CONFIDENCE)
    .filter((selection, index, filtered) =>
      filtered.findIndex((candidate) => candidate.name === selection.name) === index
    );
}

function normalizeStrategyName(value) {
  const normalized = normalizeEnum(value).replace(/[\s_-]/g, "");
  return STRATEGY_NAMES.find((strategy) => strategy.replace(/_/g, "") === normalized) || "";
}

function normalizeConfidence(value, field) {
  const confidence = Number(value);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error(`Invalid ${field} from OpenAI: ${JSON.stringify(value)}`);
  }
  return confidence;
}

function normalizeStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}
