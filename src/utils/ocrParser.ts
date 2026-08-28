import { AssetClass, TradeDirection } from '../types';

export interface ExtractedTradeData {
  symbol?: string;
  assetClass?: AssetClass;
  direction?: TradeDirection;
  timeframe?: string;
  entryPrice?: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  quantity?: number;
  pnl?: number;
}

const COMMON_SYMBOLS = [
  'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
  'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'EURGBP', 'EURAUD', 'GBPAUD',
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT',
  'US30', 'NAS100', 'SPX500', 'GER40', 'UK100', 'JPN225', 'NVDA', 'AAPL', 'TSLA'
];

export function parseTradeFromOCRText(rawText: string): ExtractedTradeData {
  const text = rawText.toUpperCase();
  const result: ExtractedTradeData = {};

  // 1. Detect Symbol
  for (const s of COMMON_SYMBOLS) {
    // Exact word boundary or standard occurrence
    const regex = new RegExp(`\\b${s}\\b|${s}`, 'i');
    if (regex.test(text)) {
      result.symbol = s;
      if (['XAUUSD', 'XAGUSD'].includes(s)) {
        result.assetClass = 'Commodities';
      } else if (s.endsWith('USDT') || ['BTC', 'ETH', 'SOL'].some(c => s.startsWith(c))) {
        result.assetClass = 'Crypto';
      } else if (['US30', 'NAS100', 'SPX500', 'GER40', 'UK100', 'JPN225'].includes(s)) {
        result.assetClass = 'Indices';
      } else if (['NVDA', 'AAPL', 'TSLA'].includes(s)) {
        result.assetClass = 'Stocks';
      } else {
        result.assetClass = 'Forex';
      }
      break;
    }
  }

  // 2. Detect Direction
  if (/\b(BUY|LONG|CALL)\b/i.test(text)) {
    result.direction = 'LONG';
  } else if (/\b(SELL|SHORT|PUT)\b/i.test(text)) {
    result.direction = 'SHORT';
  }

  // 3. Detect Timeframe
  const tfMatch = text.match(/\b(1M|3M|5M|15M|30M|1H|4H|1D|1W|DAILY|WEEKLY)\b/i);
  if (tfMatch) {
    const rawTf = tfMatch[1].toLowerCase();
    if (rawTf === 'daily' || rawTf === '1d') result.timeframe = '1D';
    else if (rawTf === '1w' || rawTf === 'weekly') result.timeframe = '1W';
    else result.timeframe = rawTf;
  }

  // 4. Detect SL (Stop Loss)
  const slMatch = text.match(/(?:SL|STOP\s*LOSS|STOP)[\s:=]+([0-9]+(?:\.[0-9]+)?)/i);
  if (slMatch && slMatch[1]) {
    const val = parseFloat(slMatch[1]);
    if (!isNaN(val) && val > 0) result.stopLoss = val;
  }

  // 5. Detect TP (Take Profit)
  const tpMatch = text.match(/(?:TP|TAKE\s*PROFIT|TARGET)[\s:=]+([0-9]+(?:\.[0-9]+)?)/i);
  if (tpMatch && tpMatch[1]) {
    const val = parseFloat(tpMatch[1]);
    if (!isNaN(val) && val > 0) result.takeProfit = val;
  }

  // 6. Detect Entry / Open Price
  const entryMatch = text.match(/(?:ENTRY|OPEN|PRICE|BUY\s*AT|SELL\s*AT|@)[\s:=]+([0-9]+(?:\.[0-9]+)?)/i);
  if (entryMatch && entryMatch[1]) {
    const val = parseFloat(entryMatch[1]);
    if (!isNaN(val) && val > 0) result.entryPrice = val;
  }

  // 7. Detect Exit / Close Price
  const exitMatch = text.match(/(?:EXIT|CLOSE|CLOSED\s*AT)[\s:=]+([0-9]+(?:\.[0-9]+)?)/i);
  if (exitMatch && exitMatch[1]) {
    const val = parseFloat(exitMatch[1]);
    if (!isNaN(val) && val > 0) result.exitPrice = val;
  }

  // 8. Detect Lot / Quantity
  const lotMatch = text.match(/(?:LOT|LOTS|QTY|SIZE|VOLUME)[\s:=]+([0-9]+(?:\.[0-9]+)?)/i);
  if (lotMatch && lotMatch[1]) {
    const val = parseFloat(lotMatch[1]);
    if (!isNaN(val) && val > 0) result.quantity = val;
  }

  // 9. Detect PnL / Profit / Loss
  const pnlMatch = text.match(/(?:PNL|PROFIT|LOSS|NET)[\s:=]+([+-]?[0-9]+(?:\.[0-9]+)?)/i);
  if (pnlMatch && pnlMatch[1]) {
    const val = parseFloat(pnlMatch[1]);
    if (!isNaN(val)) result.pnl = val;
  }

  return result;
}

/**
 * Parses raw text copied directly from MetaTrader (MT4/MT5), TradingView,
 * cTrader, or Telegram signal channels into structured trade fields.
 *
 * Example formats supported:
 * 1. MT5 tab-separated history line:
 *    "2026.08.28 14:30:00	buy	0.50	xauusd	2500.50	2490.00	2520.00	2026.08.28 16:45:12	2515.20	0.00	0.00	735.00"
 * 2. Signal syntax:
 *    "BUY XAUUSD @ 2500 SL: 2490 TP: 2520 LOT: 0.5 PROFIT: +735"
 * 3. Compact notation:
 *    "EURUSD SELL 1.0850 SL 1.0880 TP 1.0790 1.0 LOT"
 */
export function parseRawTradeText(rawInput: string): ExtractedTradeData | null {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const raw = rawInput.trim();
  if (raw.length === 0) return null;

  // 1. Try Tab-Separated or Multi-Space MT4 / MT5 History Row
  // Standard MT5: [Time, Position/Ticket, Type(buy/sell), Volume, Symbol, PriceOpen, S/L, T/P, TimeClose, PriceClose, Commission, Swap, Profit]
  const tabTokens = raw.split(/\t+/).map(t => t.trim()).filter(Boolean);
  if (tabTokens.length >= 5) {
    const parsed = parseMetaTraderTokens(tabTokens);
    if (parsed && (parsed.symbol || parsed.entryPrice)) {
      return parsed;
    }
  }

  // 2. Try space-separated tokens if it looks like MT row
  const spaceTokens = raw.split(/\s+/);
  if (spaceTokens.length >= 6) {
    const parsed = parseMetaTraderTokens(spaceTokens);
    if (parsed && (parsed.symbol || parsed.entryPrice)) {
      return parsed;
    }
  }

  // 3. Fallback to NLP / regex rule matcher (signals / sentences / raw formats)
  const regexResult = parseTradeFromOCRText(raw);
  if (regexResult.symbol || regexResult.entryPrice || regexResult.pnl !== undefined) {
    return regexResult;
  }

  return null;
}

function parseMetaTraderTokens(tokens: string[]): ExtractedTradeData | null {
  const result: ExtractedTradeData = {};

  // Find symbol in tokens
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].toUpperCase().replace(/[^A-Z0-9]/g, '');
    const matchedSym = COMMON_SYMBOLS.find(s => token === s || token.startsWith(s));
    if (matchedSym) {
      result.symbol = matchedSym;
      if (['XAUUSD', 'XAGUSD'].includes(matchedSym)) result.assetClass = 'Commodities';
      else if (matchedSym.endsWith('USDT') || ['BTC', 'ETH', 'SOL'].some(c => matchedSym.startsWith(c))) result.assetClass = 'Crypto';
      else if (['US30', 'NAS100', 'SPX500', 'GER40', 'UK100', 'JPN225'].includes(matchedSym)) result.assetClass = 'Indices';
      else if (['NVDA', 'AAPL', 'TSLA'].includes(matchedSym)) result.assetClass = 'Stocks';
      else result.assetClass = 'Forex';
      break;
    }
  }

  // Find Direction
  for (const t of tokens) {
    const upper = t.toUpperCase();
    if (['BUY', 'LONG', 'BUY_LIMIT', 'BUY_STOP'].includes(upper)) {
      result.direction = 'LONG';
      break;
    } else if (['SELL', 'SHORT', 'SELL_LIMIT', 'SELL_STOP'].includes(upper)) {
      result.direction = 'SHORT';
      break;
    }
  }

  // Extract all pure numeric tokens (possible prices, lot, pnl)
  const numericValues: number[] = [];
  for (const t of tokens) {
    const cleaned = t.replace(/[$,]/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && !/^\d{4}[.-/]\d{2}[.-/]\d{2}$/.test(t) && !/^\d{2}:\d{2}/.test(t)) {
      numericValues.push(num);
    }
  }

  // If we have numbers, intelligently map typical MT4/MT5 position columns:
  // [volume, openPrice, sl, tp, closePrice, (commission), (swap), profit]
  if (numericValues.length >= 3) {
    // Check first small number as volume / lot
    const firstNum = numericValues[0];
    if (firstNum > 0 && firstNum <= 100 && numericValues.length >= 4) {
      result.quantity = firstNum;
      result.entryPrice = numericValues[1];
      if (numericValues[2] > 0) result.stopLoss = numericValues[2];
      if (numericValues[3] > 0) result.takeProfit = numericValues[3];
      if (numericValues.length >= 5 && numericValues[4] > 0) result.exitPrice = numericValues[4];
      // Last item is usually profit
      const lastNum = numericValues[numericValues.length - 1];
      result.pnl = lastNum;
    } else {
      // Fallback: search prices based on magnitude
      if (!result.entryPrice && numericValues[0]) result.entryPrice = numericValues[0];
      if (!result.exitPrice && numericValues.length >= 2) result.exitPrice = numericValues[1];
    }
  }

  return (result.symbol || result.entryPrice || result.pnl !== undefined) ? result : null;
}
