/**
 * 交易時段工具函式
 * 使用台北時間（Asia/Taipei）判斷當前交易時段
 */

export type TradingSession = 'pre-market' | 'trading' | 'post-market' | 'weekend';

export interface TradingDayStatus {
  date: string;
  isTradingDay: boolean;
  reason: string | null;
}

const TAIWAN_MARKET_HOLIDAYS: Record<string, string> = {
  '2026-01-01': '元旦休市',
  '2026-02-16': '春節休市',
  '2026-02-17': '春節休市',
  '2026-02-18': '春節休市',
  '2026-02-19': '春節休市',
  '2026-02-20': '春節休市',
  '2026-04-03': '兒童節/清明節連假休市',
  '2026-04-06': '兒童節/清明節補假休市',
  '2026-05-01': '勞動節休市',
  '2026-06-19': '端午節休市',
  '2026-09-25': '中秋節休市',
  '2026-10-09': '國慶日補假休市',
};

function taipeiParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  return {
    weekday: partMap.weekday ?? '',
    hour: parseInt(partMap.hour ?? '0', 10),
    minute: parseInt(partMap.minute ?? '0', 10),
    date: `${partMap.year}-${partMap.month}-${partMap.day}`,
  };
}

export function getTradingDayStatus(date: Date): TradingDayStatus {
  const parts = taipeiParts(date);
  if (parts.weekday === 'Sat' || parts.weekday === 'Sun') {
    return {
      date: parts.date,
      isTradingDay: false,
      reason: parts.weekday === 'Sat' ? '週六休市' : '週日休市',
    };
  }

  const holidayReason = TAIWAN_MARKET_HOLIDAYS[parts.date];
  if (holidayReason) {
    return {
      date: parts.date,
      isTradingDay: false,
      reason: holidayReason,
    };
  }

  return {
    date: parts.date,
    isTradingDay: true,
    reason: null,
  };
}

/**
 * 根據給定的 Date 物件判斷台北時間的交易時段
 *
 * 規則：
 *   週六（6）、週日（0）與台股休市日 → 'weekend'
 *   週一至週五 09:00 前 → 'pre-market'
 *   週一至週五 09:00–13:30 → 'trading'
 *   週一至週五 13:30 後 → 'post-market'
 *
 * @param date - 任意 Date 物件（UTC 時間戳）
 * @returns TradingSession
 */
export function getTradingSession(date: Date): TradingSession {
  const dayStatus = getTradingDayStatus(date);
  if (!dayStatus.isTradingDay) {
    return 'weekend';
  }

  const { hour, minute } = taipeiParts(date);
  // 換算為分鐘數方便比較
  const totalMinutes = hour * 60 + minute;
  const marketOpen = 9 * 60;       // 09:00 = 540 分鐘
  const marketClose = 13 * 60 + 30; // 13:30 = 810 分鐘

  if (totalMinutes < marketOpen) {
    return 'pre-market';
  } else if (totalMinutes <= marketClose) {
    return 'trading';
  } else {
    return 'post-market';
  }
}
