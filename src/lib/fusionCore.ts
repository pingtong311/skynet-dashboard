export type BattleReport = {
  ticker: string;
  name: string;
  action: string;
  confidence: number;
  price?: string;
  target?: string;
  stopLoss?: string;
  strategyType?: string;
  reason?: string;
};

export type Position = {
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number | null;
  targetPrice?: number;
  stopPrice?: number;
  type?: string;
};

export type Sniper = {
  ticker: string;
  name: string;
  triggerPrice: string;
  stopPrice: string;
  status: string;
  source: string;
};

export type LiaoCandidate = {
  symbol: string;
  name: string;
  points: number;
  price: number;
  open: number;
  diff: number;
  change_pct: number;
  volume: number;
  prev_volume: number;
  volume_ratio: number;
  amount: number;
  stop_loss: number;
  chief_net: number;
  rank_score: number;
};

export type ExtremeItem = {
  window: number;
  date: string;
  price: number;
  volume: number;
  change_pct: number;
  kind: 'red' | 'black';
};

export type ExtremeResponse = {
  symbol: string;
  name: string;
  latest_date: string;
  latest_price: number;
  items: ExtremeItem[];
};

export type FusionStock = {
  ticker: string;
  name: string;
  source: string[];
  signalTags: string[];
  skynetAction?: string;
  confidence?: number;
  liaoPoints?: number;
  liaoDiff?: number;
  volumeRatio?: number;
  changePct?: number;
  chiefNet?: number;
  price?: number | string;
  targetPrice?: number | string;
  targetBasis?: string;
  stopLoss?: number | string;
  triggerPrice?: string;
  status?: string;
  dataQuality: number;
  tradable?: boolean;
  riskReward?: number;
  qualityWarnings?: string[];
  tracking?: {
    firstSeenAt: string;
    lastSeenAt: string;
    lastMissingAt?: string;
    seenCount: number;
    observationCount: number;
    streakDays: number;
    missedCount?: number;
    scoreDelta: number;
    rankDelta: number;
    previousScore?: number;
    previousRank?: number;
    rank: number;
    phase: 'new' | 'warming' | 'persistent' | 'cooling' | 'fading';
    phaseLabel: string;
  };
  intradayTrend?: {
    observations: number;
    scoreSlope: number;
    rankSlope: number;
    ma21Slope: number;
    volumeSlope: number;
    latestScore: number | null;
    latestRank: number | null;
  };
  fusionScore: number;
};

type KLine = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const ALLOW_SYNTHETIC_FUSION = process.env.SKYNET_ALLOW_SYNTHETIC_FUSION === '1';

const STOCK_UNIVERSE: Array<[string, string]> = [
  ['2330', '台積電'], ['2317', '鴻海'], ['2454', '聯發科'], ['2308', '台達電'],
  ['2382', '廣達'], ['3231', '緯創'], ['2345', '智邦'], ['2357', '華碩'],
  ['2379', '瑞昱'], ['3661', '世芯-KY'], ['6669', '緯穎'], ['3037', '欣興'],
  ['3711', '日月光投控'], ['2303', '聯電'], ['3035', '智原'], ['8046', '南電'],
  ['2603', '長榮'], ['2609', '陽明'], ['2615', '萬海'], ['2618', '長榮航'],
  ['2610', '華航'], ['2881', '富邦金'], ['2882', '國泰金'], ['2891', '中信金'],
  ['2886', '兆豐金'], ['2892', '第一金'], ['2884', '玉山金'], ['2890', '永豐金'],
  ['2002', '中鋼'], ['1101', '台泥'], ['1102', '亞泥'], ['1216', '統一'],
  ['1301', '台塑'], ['1303', '南亞'], ['1326', '台化'], ['6505', '台塑化'],
  ['2409', '友達'], ['3481', '群創'], ['2377', '微星'], ['2376', '技嘉'],
  ['2356', '英業達'], ['2324', '仁寶'], ['2353', '宏碁'], ['2301', '光寶科'],
  ['3008', '大立光'], ['3406', '玉晶光'], ['5269', '祥碩'], ['6415', '矽力-KY'],
  ['3532', '台勝科'], ['5871', '中租-KY'], ['5876', '上海商銀'], ['8454', '富邦媒'],
  ['6409', '旭隼'], ['9921', '巨大'], ['9945', '潤泰新'], ['2912', '統一超'],
];

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function tradingDateOffset(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
}

function basePriceFor(symbol: string): number {
  const numeric = Number.parseInt(symbol.replace(/\D/g, ''), 10) || hashSeed(symbol);
  if (symbol === '2330') return 2400;
  if (numeric % 13 === 0) return 650;
  if (numeric % 7 === 0) return 260;
  if (numeric % 5 === 0) return 120;
  if (numeric % 3 === 0) return 80;
  return 45;
}

function buildSyntheticKlines(symbol: string, period: string, days = 180): KLine[] {
  const step = period === '月' ? 30 : period === '周' ? 7 : 1;
  const random = seededRandom(hashSeed(`${symbol}-${period}-${tradingDateOffset(0)}`));
  let close = basePriceFor(symbol) * (0.92 + random() * 0.16);
  const rows: KLine[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const drift = 0.0015 + (random() - 0.48) * 0.045;
    const open = close * (1 + (random() - 0.5) * 0.024);
    close = Math.max(5, close * (1 + drift));
    const high = Math.max(open, close) * (1 + random() * 0.022);
    const low = Math.min(open, close) * (1 - random() * 0.022);
    const volumeBase = 1500 + random() * 98000;
    const volumeBoost = close > open ? 1.08 : 0.92;
    rows.push({
      date: tradingDateOffset(i * step),
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume: Math.round(volumeBase * volumeBoost * (period === '月' ? 20 : period === '周' ? 5 : 1)),
    });
  }

  return rows;
}

function calculateRecord(symbol: string, name: string, strategy: string, period: string): LiaoCandidate {
  const rows = buildSyntheticKlines(symbol, period);
  const last = rows.at(-1) as KLine;
  const prev = rows.at(-2) ?? last;
  const maWindow = rows.slice(-21);
  const ma21 = maWindow.reduce((sum, row) => sum + row.close, 0) / maWindow.length;
  const diff = ((last.close - ma21) / ma21) * 100;
  let points = diff > 2 ? 18 : diff > 0 ? 11 : 0;

  if (strategy === 'sell_black_tail' || strategy === 'breakdown') {
    points = points === 18 ? 21 : points === 11 ? 10 : 3;
  }

  const changePct = prev.close ? ((last.close - prev.close) / prev.close) * 100 : 0;
  const amount = (last.close * last.volume) / 100000000;
  const chiefNet = ((last.close - last.open) / (last.high - last.low + 0.001)) * last.volume * 0.4;
  const volumeRatio = prev.volume ? last.volume / prev.volume : 1;
  const rankScore = points * 10 + Math.max(-20, Math.min(20, diff * 2)) + changePct * 3 + Math.min(18, volumeRatio * 4);

  return {
    symbol,
    name,
    points,
    price: round(last.close),
    open: round(last.open),
    diff: round(diff),
    change_pct: round(changePct),
    volume: last.volume,
    prev_volume: prev.volume,
    volume_ratio: round(volumeRatio),
    amount: round(amount),
    stop_loss: round(last.close * (strategy === 'sell_black_tail' || strategy === 'breakdown' ? 1.02 : 0.98)),
    chief_net: Math.round(chiefNet),
    rank_score: round(rankScore),
  };
}

function filterByStrategy(record: LiaoCandidate, strategy: string): boolean {
  if (strategy === 'buy_red_tail') return [18, 11, 0].includes(record.points) && record.diff <= 6;
  if (strategy === 'breakout') return record.points >= 11 && record.change_pct >= 0;
  if (strategy === 'sell_black_tail') return [21, 10, 3].includes(record.points) && record.diff >= -6;
  if (strategy === 'breakdown') return record.points <= 10 && record.change_pct <= 0;
  return true;
}

export function buildEmbeddedLiaoCandidates(strategy = 'buy_red_tail', period = '日', limit = 48): LiaoCandidate[] {
  if (!ALLOW_SYNTHETIC_FUSION) return [];
  return STOCK_UNIVERSE
    .map(([symbol, name]) => calculateRecord(symbol, name, strategy, period))
    .filter((record) => filterByStrategy(record, strategy))
    .sort((a, b) => b.rank_score - a.rank_score)
    .slice(0, limit);
}

export function buildExtremeResponse(symbol: string, period = '日'): ExtremeResponse {
  const name = STOCK_UNIVERSE.find(([id]) => id === symbol)?.[1] ?? symbol;
  const rows = buildSyntheticKlines(symbol, period);
  const last = rows.at(-1) as KLine;
  const items = [30, 60, 120].map((window) => {
    const windowRows = rows.slice(-window);
    const maxVolume = windowRows.reduce((best, row) => row.volume > best.volume ? row : best, windowRows[0]);
    const changePct = ((last.close - maxVolume.close) / maxVolume.close) * 100;
    return {
      window,
      date: maxVolume.date,
      price: maxVolume.close,
      volume: maxVolume.volume,
      change_pct: round(changePct),
      kind: maxVolume.close >= maxVolume.open ? 'red' as const : 'black' as const,
    };
  });

  return {
    symbol,
    name,
    latest_date: last.date,
    latest_price: last.close,
    items,
  };
}

function scoreAction(action?: string): number {
  if (action === 'BUY') return 24;
  // WAIT 是觀察，不是可直接放大的交易訊號
  if (action === 'WAIT') return 4;
  if (action === 'SELL') return -20;
  return 0;
}

function scoreLiao(points?: number, diff?: number): number {
  if (points === undefined) return 0;
  const pointScore = points >= 18 ? 30 : points >= 11 ? 22 : points === 0 ? 12 : 4;
  const diffScore = diff !== undefined ? Math.max(-8, Math.min(12, 8 - Math.abs(diff) * 0.45)) : 0;
  return pointScore + diffScore;
}

function isEtfLikePosition(position: Position): boolean {
  const ticker = String(position.ticker || '').trim().toUpperCase();
  const name = String(position.name || '').trim();
  const type = String(position.type || '').trim().toUpperCase();
  return (
    /^00\d{3}[A-Z]?$/.test(ticker) ||
    type.includes('ETF') ||
    name.includes('ETF') ||
    name.includes('主動') ||
    name.includes('群益台灣') ||
    name.includes('國泰永續') ||
    name.includes('大華優利') ||
    name.includes('半導體')
  );
}

function toNumber(value: unknown): number | null {
  const num = typeof value === 'number' ? value : Number(String(value || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(num) && num > 0 ? num : null;
}

function addPct(price: number, pct: number): number {
  return round(price * (1 + pct / 100));
}

function calculateTargetPct(stock: FusionStock): number {
  const base = stock.skynetAction === 'SELL' ? -3.5 : stock.skynetAction === 'WAIT' ? 2.2 : 4.2;
  const confidenceBoost = Math.max(0, Math.min(1.6, ((stock.confidence || 0) - 65) / 25));
  const liaoBoost = stock.liaoPoints !== undefined ? (stock.liaoPoints >= 18 ? 1.3 : stock.liaoPoints >= 11 ? 0.7 : -0.4) : 0;
  const volumeBoost = stock.volumeRatio !== undefined ? Math.max(-0.7, Math.min(1.1, (stock.volumeRatio - 1) * 1.2)) : 0;
  const trendBoost = stock.changePct !== undefined ? Math.max(-0.8, Math.min(0.9, stock.changePct * 0.15)) : 0;
  return Math.max(stock.skynetAction === 'SELL' ? -8 : 1.2, Math.min(8, base + confidenceBoost + liaoBoost + volumeBoost + trendBoost));
}

function enrichFusionStock(stock: FusionStock): FusionStock {
  const price = toNumber(stock.price);
  const stop = toNumber(stock.stopLoss);
  const hasCrossSource = stock.source.length >= 2;
  const hasTechnical = stock.liaoPoints !== undefined || stock.liaoDiff !== undefined || stock.volumeRatio !== undefined;
  const warnings: string[] = [];
  let fusionScore = stock.fusionScore;
  let dataQuality = stock.dataQuality;

  if (!hasCrossSource) {
    fusionScore *= 0.72;
    warnings.push('single_source_signal');
  }
  if (!hasTechnical && stock.skynetAction === 'BUY') {
    fusionScore *= 0.86;
    warnings.push('missing_technical_confirm');
  }
  if (dataQuality < 55 && stock.skynetAction === 'BUY') {
    fusionScore *= 0.84;
    warnings.push('low_data_quality');
  }
  if (price && price >= 1000 && !hasCrossSource) {
    fusionScore -= 8;
    dataQuality = Math.max(0, dataQuality - 6);
    warnings.push('high_price_without_cross_check');
  }

  const targetPct = price ? calculateTargetPct(stock) : 0;
  const targetPrice = price ? addPct(price, targetPct) : stock.targetPrice;
  const fallbackStop = price
    ? addPct(price, stock.skynetAction === 'SELL' ? 2.2 : -Math.max(2.2, Math.min(4.8, Math.abs(targetPct) * 0.65)))
    : stock.stopLoss;
  const resolvedStop = stop || fallbackStop;
  const riskReward = price && typeof targetPrice === 'number' && typeof resolvedStop === 'number'
    ? Math.abs((targetPrice - price) / Math.max(0.01, price - resolvedStop))
    : undefined;

  const tradable = stock.skynetAction === 'BUY'
    ? dataQuality >= 55 && (hasCrossSource || hasTechnical) && price !== null
    : dataQuality >= 45;

  return {
    ...stock,
    dataQuality: Math.max(0, Math.min(100, Math.round(dataQuality))),
    fusionScore: round(Math.max(-20, fusionScore), 2),
    targetPrice,
    targetBasis: price ? `品質${Math.round(dataQuality)}・來源${stock.source.length}・目標${round(targetPct, 2)}%` : undefined,
    stopLoss: resolvedStop,
    riskReward: riskReward !== undefined ? round(riskReward, 2) : undefined,
    tradable,
    qualityWarnings: warnings,
  };
}

export function buildFusionStocks(input: {
  reports: BattleReport[];
  positions: Position[];
  snipers: Sniper[];
  liaoCandidates: LiaoCandidate[];
}): FusionStock[] {
  const map = new Map<string, FusionStock>();

  for (const report of input.reports) {
    const ticker = String(report.ticker || '').trim();
    if (!ticker) continue;
    map.set(ticker, {
      ticker,
      name: report.name || ticker,
      source: ['Omni'],
      signalTags: [report.action ? `Omni ${report.action}` : 'Omni'],
      skynetAction: report.action,
      confidence: report.confidence,
      price: report.price,
      stopLoss: report.stopLoss,
      targetPrice: report.target,
      dataQuality: 34,
      fusionScore: scoreAction(report.action) + Math.max(0, Math.min(18, (report.confidence || 0) * 0.18)),
    });
  }

  for (const sniper of input.snipers) {
    const ticker = String(sniper.ticker || '').trim();
    if (!ticker) continue;
    const prev = map.get(ticker);
    map.set(ticker, {
      ticker,
      name: prev?.name || sniper.name || ticker,
      source: Array.from(new Set([...(prev?.source || []), '狙擊'])),
      signalTags: Array.from(new Set([...(prev?.signalTags || []), sniper.status || '狙擊追蹤'])),
      skynetAction: prev?.skynetAction,
      confidence: prev?.confidence,
      price: prev?.price,
      triggerPrice: sniper.triggerPrice,
      stopLoss: prev?.stopLoss || sniper.stopPrice,
      status: sniper.status,
      dataQuality: Math.min(100, (prev?.dataQuality || 0) + 18),
      fusionScore: (prev?.fusionScore || 0) + (sniper.status === '待觸發' ? 16 : 6),
    });
  }

  for (const position of input.positions) {
    const ticker = String(position.ticker || '').trim();
    if (!ticker) continue;
    if (isEtfLikePosition(position)) continue;
    const prev = map.get(ticker);
    map.set(ticker, {
      ticker,
      name: prev?.name || position.name || ticker,
      source: Array.from(new Set([...(prev?.source || []), '持倉'])),
      signalTags: Array.from(new Set([...(prev?.signalTags || []), '持倉風控'])),
      skynetAction: prev?.skynetAction,
      confidence: prev?.confidence,
      price: prev?.price || position.currentPrice || position.avgCost,
      triggerPrice: prev?.triggerPrice,
      stopLoss: prev?.stopLoss || position.stopPrice,
      status: prev?.status,
      dataQuality: Math.min(100, (prev?.dataQuality || 0) + 12),
      fusionScore: (prev?.fusionScore || 0) + 10,
    });
  }

  for (const candidate of input.liaoCandidates) {
    const ticker = String(candidate.symbol || '').trim();
    if (!ticker) continue;
    const prev = map.get(ticker);
    map.set(ticker, {
      ticker,
      name: prev?.name || candidate.name || ticker,
      source: Array.from(new Set([...(prev?.source || []), '內建21點'])),
      signalTags: Array.from(new Set([
        ...(prev?.signalTags || []),
        `${candidate.points}點`,
        candidate.volume_ratio >= 1.2 ? '量增' : '量縮/平量',
        candidate.change_pct >= 0 ? '紅K動能' : '回測整理',
      ])),
      skynetAction: prev?.skynetAction,
      confidence: prev?.confidence,
      price: prev?.price || candidate.price,
      triggerPrice: prev?.triggerPrice,
      liaoPoints: candidate.points,
      liaoDiff: candidate.diff,
      volumeRatio: candidate.volume_ratio,
      changePct: candidate.change_pct,
      chiefNet: candidate.chief_net,
      stopLoss: prev?.stopLoss || candidate.stop_loss,
      status: prev?.status,
      dataQuality: Math.min(100, (prev?.dataQuality || 0) + 32),
      fusionScore: (prev?.fusionScore || 0) + scoreLiao(candidate.points, candidate.diff),
    });
  }

  return Array.from(map.values())
    .map(enrichFusionStock)
    .sort((a, b) => b.fusionScore - a.fusionScore)
    .slice(0, 24);
}
