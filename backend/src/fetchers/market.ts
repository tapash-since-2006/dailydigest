/**
 * fetchers/market.ts
 * Market data fetchers with multi-provider fallback chain per symbol.
 * India indices use Yahoo Finance as primary (NSE/BSE APIs are geo-blocked outside India).
 */

import axios from "axios";
import { KEYS, BASE_URLS } from "../config";
import { log, retry } from "../utils";
import { QuoteResult, MarketMover, MarketData } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER_AGENT = "Mozilla/5.0 (digest-bot/1.0)";
const TIMEOUT = 10_000;

// ── Yahoo Finance ─────────────────────────────────────────────────────────────

const YAHOO_HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];

async function fetchYahooQuote(sym: string): Promise<QuoteResult | null> {
  for (const host of YAHOO_HOSTS) {
    try {
      const url = `${host}/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
      const { data } = await retry(
        () => axios.get(url, { headers: { "User-Agent": USER_AGENT }, timeout: TIMEOUT }),
        2,
        2000,
      );
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) continue;
      const price = parseFloat(meta.regularMarketPrice ?? "0");
      const prev  = parseFloat(meta.chartPreviousClose ?? String(price)) || price;
      const chg   = prev ? ((price - prev) / prev) * 100 : 0;
      return { price: price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), change: `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%` };
    } catch (err) {
      log("WARN", `  Yahoo (${sym}) ${host.includes("query1") ? "q1" : "q2"} failed: ${(err as Error).message}`);
    }
  }
  return null;
}

// ── Finnhub ───────────────────────────────────────────────────────────────────

async function fetchFinnhubQuote(sym: string): Promise<QuoteResult | null> {
  if (!KEYS.FINNHUB) return null;
  try {
    const { data } = await axios.get("https://finnhub.io/api/v1/quote", {
      params: { symbol: sym, token: KEYS.FINNHUB },
      headers: { "User-Agent": USER_AGENT },
      timeout: TIMEOUT,
    });
    const price = parseFloat(data?.c ?? "0");
    const perc  = parseFloat(data?.dp ?? "0");
    if (!price) return null;
    return { price: price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), change: `${perc >= 0 ? "+" : ""}${perc.toFixed(2)}%` };
  } catch (err) {
    log("WARN", `  Finnhub (${sym}) failed: ${(err as Error).message}`);
    return null;
  }
}

// ── Twelve Data ───────────────────────────────────────────────────────────────

const TWELVEDATA_SYM_MAP: Record<string, string> = {
  "^GSPC": "SPX",   "^IXIC": "IXIC",  "^DJI": "DJI",
  "^N225": "NI225", "^FTSE": "UKXGBP","^GDAXI": "DEU40EUR",
  "GC=F":  "XAU/USD","SI=F": "XAG/USD","BZ=F": "BRN/USD",
  "BTC-USD": "BTC/USD", "USDINR=X": "USD/INR",
};

async function fetchTwelveDataQuote(sym: string): Promise<QuoteResult | null> {
  if (!KEYS.TWELVEDATA) return null;
  const tdSym = TWELVEDATA_SYM_MAP[sym];
  if (!tdSym) return null;
  try {
    const { data } = await axios.get(`${BASE_URLS.TWELVEDATA}/quote`, {
      params: { symbol: tdSym, apikey: KEYS.TWELVEDATA },
      headers: { "User-Agent": USER_AGENT },
      timeout: TIMEOUT,
    });
    if (data?.code) return null; // error response
    const close = parseFloat(data?.close ?? "0");
    const prev  = parseFloat(data?.previous_close ?? String(close)) || close;
    const chg   = prev ? ((close - prev) / prev) * 100 : 0;
    if (!close) return null;
    return { price: close.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), change: `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%` };
  } catch (err) {
    log("WARN", `  TwelveData (${sym}) failed: ${(err as Error).message}`);
    return null;
  }
}

// ── TradingView (no auth) ─────────────────────────────────────────────────────
const TV_SYM_MAP: Record<string, string> = {
  "^GSPC": "SP:SPX",        "^IXIC": "NASDAQ:COMP",   "^DJI": "DJ:DJI",
  "^N225": "TVC:NI225",     "^FTSE": "TVC:UKX",       "^GDAXI": "XETR:DAX",
  "GC=F":  "COMEX:GC1!",    "SI=F":  "COMEX:SI1!",    "BZ=F":  "NYMEX:BB1!",
  "BTC-USD": "COINBASE:BTCUSD", "USDINR=X": "FX:USDINR",
  "^NSEI": "NSE:NIFTY",     "^BSESN": "BSE:SENSEX",
};

async function fetchTradingViewQuote(sym: string): Promise<QuoteResult | null> {
  const tvSym = TV_SYM_MAP[sym];
  if (!tvSym) return null;
  try {
    const { data } = await axios.post(
      "https://scanner.tradingview.com/global/scan",
      { symbols: { tickers: [tvSym], query: { types: [] } }, columns: ["close", "change"] },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
          Origin: "https://www.tradingview.com",
          Referer: "https://www.tradingview.com/",
        },
        timeout: TIMEOUT,
      },
    );
    const d = data?.data?.[0]?.d;
    if (!d) return null;
    const price = parseFloat(d[0] ?? "0");
    const chg   = parseFloat(d[1] ?? "0");
    if (!price) return null;
    return { price: price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), change: `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%` };
  } catch (err) {
    log("WARN", `  TradingView (${sym}) failed: ${(err as Error).message}`);
    return null;
  }
}

// ── Alpha Vantage ─────────────────────────────────────────────────────────────

async function fetchAlphaVantageQuote(sym: string): Promise<QuoteResult | null> {
  if (!KEYS.ALPHAVANTAGE) return null;
  if (sym.includes("=F")) return null; // futures not supported

  try {
    if (sym.includes("=X")) {
      // Forex
      const pair = sym.replace("=X", "");
      const fromCur = pair.slice(0, 3);
      const toCur   = pair.slice(3);
      const { data } = await axios.get("https://www.alphavantage.co/query", {
        params: { function: "CURRENCY_EXCHANGE_RATE", from_currency: fromCur, to_currency: toCur, apikey: KEYS.ALPHAVANTAGE },
        timeout: TIMEOUT,
      });
      const rate = parseFloat(data?.["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"] ?? "0");
      if (!rate) return null;
      return { price: rate.toFixed(2), change: "0.00%" };
    }

    if (sym.includes("-USD")) {
      // Crypto — Alpha Vantage doesn't give reliable % change, skip
      return null;
    }

    // US stocks / ETFs
    const { data } = await axios.get("https://www.alphavantage.co/query", {
      params: { function: "GLOBAL_QUOTE", symbol: sym, apikey: KEYS.ALPHAVANTAGE },
      timeout: TIMEOUT,
    });
    const q = data?.["Global Quote"];
    if (!q) return null;
    const price = parseFloat(q["05. price"] ?? "0");
    const chg   = parseFloat(q["10. change percent"]?.replace("%", "") ?? "0");
    if (!price) return null;
    return { price: price.toFixed(2), change: `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%` };
  } catch (err) {
    log("WARN", `  AlphaVantage (${sym}) failed: ${(err as Error).message}`);
    return null;
  }
}

// ── NSE / BSE India ───────────────────────────────────────────────────────────

// NSE and BSE official APIs are geo-blocked outside India (403/422/404).
// Primary source is now Yahoo Finance which works globally.
// Yahoo symbols: ^NSEI = Nifty 50, ^BSESN = Sensex

export async function fetchNseNifty(): Promise<QuoteResult | null> {
  // Primary: Yahoo Finance (works globally)
  const yahooResult = await fetchYahooQuote("^NSEI");
  if (yahooResult) return yahooResult;

  // Fallback: TwelveData
  try {
    if (KEYS.TWELVEDATA) {
      const { data } = await axios.get(`${BASE_URLS.TWELVEDATA}/quote`, {
        params: { symbol: "NIFTY", exchange: "NSE", apikey: KEYS.TWELVEDATA },
        timeout: TIMEOUT,
      });
      if (!data?.code) {
        const price = parseFloat(data?.close ?? "0");
        const prev  = parseFloat(data?.previous_close ?? String(price)) || price;
        const chg   = prev ? ((price - prev) / prev) * 100 : 0;
        if (price) return {
          price: price.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
          change: `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%`
        };
      }
    }
  } catch (err) {
    log("WARN", `  TwelveData Nifty failed: ${(err as Error).message}`);
  }

  // Fallback: TradingView
  return fetchTradingViewQuote("^NSEI");
}

export async function fetchBseSensex(): Promise<QuoteResult | null> {
  // Primary: Yahoo Finance (works globally)
  const yahooResult = await fetchYahooQuote("^BSESN");
  if (yahooResult) return yahooResult;

  // Fallback: TwelveData
  try {
    if (KEYS.TWELVEDATA) {
      const { data } = await axios.get(`${BASE_URLS.TWELVEDATA}/quote`, {
        params: { symbol: "SENSEX", exchange: "BSE", apikey: KEYS.TWELVEDATA },
        timeout: TIMEOUT,
      });
      if (!data?.code) {
        const price = parseFloat(data?.close ?? "0");
        const prev  = parseFloat(data?.previous_close ?? String(price)) || price;
        const chg   = prev ? ((price - prev) / prev) * 100 : 0;
        if (price) return {
          price: price.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
          change: `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%`
        };
      }
    }
  } catch (err) {
    log("WARN", `  TwelveData Sensex failed: ${(err as Error).message}`);
  }

  // Fallback: TradingView
  return fetchTradingViewQuote("^BSESN");
}

// ── Generic quote with full fallback chain ────────────────────────────────────

export async function fetchQuote(sym: string): Promise<QuoteResult | null> {
  const fetchers = [
    () => fetchFinnhubQuote(sym),
    () => fetchAlphaVantageQuote(sym),
    () => fetchYahooQuote(sym),
    () => fetchTwelveDataQuote(sym),
    () => fetchTradingViewQuote(sym),
  ];

  for (const fetcher of fetchers) {
    const result = await fetcher();
    if (result) return result;
  }

  log("WARN", `  All quote providers failed for ${sym}`);
  return null;
}

// ── US Movers (Yahoo screener) ────────────────────────────────────────────────

async function fetchYahooMovers(type: "gainers" | "losers"): Promise<MarketMover[]> {
  try {
    const screener = type === "gainers" ? "day_gainers" : "day_losers";
    const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=${screener}&count=5&offset=0`;
    const { data } = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT },
      timeout: TIMEOUT,
    });
    const quotes: any[] = data?.finance?.result?.[0]?.quotes ?? [];
    return quotes.slice(0, 3).map((q: any) => ({
      symbol: q.symbol ?? "",
      name:   q.shortName ?? q.longName ?? q.symbol,
      price:  (q.regularMarketPrice ?? 0).toFixed(2),
      change: `${(q.regularMarketChangePercent ?? 0) >= 0 ? "+" : ""}${(q.regularMarketChangePercent ?? 0).toFixed(2)}%`,
    }));
  } catch (err) {
    log("WARN", `  Yahoo movers (${type}) failed: ${(err as Error).message}`);
    return [];
  }
}

// ── Main fetchMarketData ──────────────────────────────────────────────────────

export async function fetchMarketData(): Promise<MarketData> {
  log("DATA", "Fetching market data concurrently...");

  const INDICES_SYMS   = ["^GSPC", "^IXIC", "^DJI", "^N225", "^FTSE", "^GDAXI"];
  const CRYPTO_SYMS    = ["BTC-USD"];
  const FOREX_SYMS     = ["USDINR=X"];
  const COMMODITY_SYMS = ["GC=F", "SI=F", "BZ=F"];

  // All fetches fire concurrently
  const [
    nifty, sensex,
    ...quotesRaw
  ] = await Promise.allSettled([
    fetchNseNifty(),
    fetchBseSensex(),
    ...INDICES_SYMS.map((s) => fetchQuote(s)),
    ...CRYPTO_SYMS.map((s) => fetchQuote(s)),
    ...FOREX_SYMS.map((s) => fetchQuote(s)),
    ...COMMODITY_SYMS.map((s) => fetchQuote(s)),
    fetchYahooMovers("gainers"),
    fetchYahooMovers("losers"),
  ]);

  function val<T>(r: PromiseSettledResult<T>): T | null {
    return r.status === "fulfilled" ? r.value : null;
  }

  // Slice back out the results
  const indiceOffset   = 0;
  const cryptoOffset   = indiceOffset + INDICES_SYMS.length;
  const forexOffset    = cryptoOffset + CRYPTO_SYMS.length;
  const commodOffset   = forexOffset  + FOREX_SYMS.length;
  const gainersIdx     = commodOffset + COMMODITY_SYMS.length;
  const losersIdx      = gainersIdx + 1;

  function buildMap(syms: string[], offset: number): Record<string, QuoteResult> {
    const out: Record<string, QuoteResult> = {};
    syms.forEach((sym, i) => {
      const r = quotesRaw[offset + i];
      const q = val(r as PromiseSettledResult<QuoteResult | null>);
      if (q) out[sym] = q;
    });
    return out;
  }

  // Inject Indian indices
  const indices = buildMap(INDICES_SYMS, indiceOffset);
  const niftyResult   = val(nifty);
  const sensexResult  = val(sensex);
  if (niftyResult)  indices["^NSEI"]  = niftyResult;
  if (sensexResult) indices["^BSESN"] = sensexResult;

  const gainersResult = val(quotesRaw[gainersIdx] as PromiseSettledResult<MarketMover[]>) ?? [];
  const losersResult  = val(quotesRaw[losersIdx]  as PromiseSettledResult<MarketMover[]>) ?? [];

  log("DATA", `Market data fetched. Indices: ${Object.keys(indices).length}`);

  return {
    indices,
    crypto:      buildMap(CRYPTO_SYMS,    cryptoOffset),
    forex:       buildMap(FOREX_SYMS,     forexOffset),
    commodities: buildMap(COMMODITY_SYMS, commodOffset),
    usMovers:    { gainers: gainersResult, losers: losersResult },
    indiaMovers: { gainers: [], losers: [] }, // NSE movers geo-blocked outside India
  };
}
