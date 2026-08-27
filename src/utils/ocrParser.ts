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
