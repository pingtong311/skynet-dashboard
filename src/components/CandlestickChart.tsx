'use client';

/**
 * 天網 K 線圖查看器 — CandlestickChart 元件
 *
 * 使用 recharts ComposedChart 渲染 K 線圖、SMA 均線、成交量子圖。
 * 支援滑鼠滾輪縮放、拖曳平移、觸控雙指縮放與單指拖曳。
 */

import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { ChartCandle } from '@/types/kline';
import { getCandleColor, clampZoom } from '@/lib/klineUtils';

// ── Props ──────────────────────────────────────────────

interface CandlestickChartProps {
  candles: ChartCandle[];
  timeframe: 'daily' | 'intraday';
}

// ── 自訂 Tooltip ───────────────────────────────────────

interface KlineTooltipPayload {
  payload?: ChartCandle;
}

function KlineTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as ChartCandle;
  if (!d) return null;

  const label = d.date || d.time || d.dateRaw || '';
  const isValidNum = (v: unknown) => typeof v === 'number' && !isNaN(v);

  return (
    <div className="kline-tooltip">
      <p className="kline-tooltip-date">{label}</p>
      <div className="kline-tooltip-row">
        <span>開</span><span>{isValidNum(d.open) ? d.open.toFixed(2) : '--'}</span>
      </div>
      <div className="kline-tooltip-row">
        <span>高</span><span>{isValidNum(d.high) ? d.high.toFixed(2) : '--'}</span>
      </div>
      <div className="kline-tooltip-row">
        <span>低</span><span>{isValidNum(d.low) ? d.low.toFixed(2) : '--'}</span>
      </div>
      <div className="kline-tooltip-row">
        <span>收</span>
        <span style={{ color: getCandleColor(d.direction) }}>
          {isValidNum(d.close) ? d.close.toFixed(2) : '--'}
        </span>
      </div>
      <div className="kline-tooltip-row">
        <span>量</span><span>{isValidNum(d.volume) ? d.volume.toLocaleString() : '--'}</span>
      </div>
    </div>
  );
}

// ── 自訂蠟燭 Shape ─────────────────────────────────────

interface CandleShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  // recharts 傳入的 payload
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  direction?: 'up' | 'down' | 'flat';
  // recharts 內部用的 yAxis 比例函式
  background?: { y: number; height: number };
  // 完整 payload
  payload?: ChartCandle;
}

function CandleShape(props: CandleShapeProps) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    payload,
  } = props;

  if (!payload || width <= 0) return null;

  const { open, high, low, close, direction } = payload;
  const color = getCandleColor(direction);
  const centerX = x + width / 2;

  // 計算 high/low 在圖表座標系中的 y 位置
  // recharts Bar 的 y 是實體頂部，height 是實體高度
  // 我們需要根據 open/close/high/low 的比例計算影線位置
  // 由於 recharts 已幫我們計算了 bodyLow 的 y 和 bodyHeight，
  // 我們需要額外計算 high 和 low 的偏移

  const bodyTop = y;
  const bodyBottom = y + height;

  // 計算每個價格單位對應的像素數
  const bodyRange = Math.abs(close - open);
  const pixelsPerUnit = bodyRange > 0 ? height / bodyRange : 0;

  // 計算上影線頂部（high）的 y 座標
  const highY = bodyRange > 0
    ? bodyTop - (high - Math.max(open, close)) * pixelsPerUnit
    : bodyTop - 2; // 平盤時給一個小影線

  // 計算下影線底部（low）的 y 座標
  const lowY = bodyRange > 0
    ? bodyBottom + (Math.min(open, close) - low) * pixelsPerUnit
    : bodyBottom + 2; // 平盤時給一個小影線

  return (
    <g>
      {/* 上影線 */}
      <line
        x1={centerX}
        y1={highY}
        x2={centerX}
        y2={bodyTop}
        stroke={color}
        strokeWidth={1}
      />
      {/* 蠟燭實體 */}
      <rect
        x={x + 1}
        y={bodyTop}
        width={Math.max(width - 2, 1)}
        height={Math.max(height, 1)}
        fill={color}
        stroke={color}
        strokeWidth={0.5}
      />
      {/* 下影線 */}
      <line
        x1={centerX}
        y1={bodyBottom}
        x2={centerX}
        y2={lowY}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
}

// ── 主元件 ─────────────────────────────────────────────

export default function CandlestickChart({ candles, timeframe }: CandlestickChartProps) {
  // 縮放與平移狀態
  const [visibleCount, setVisibleCount] = useState(() => Math.min(candles.length, 60));
  const [startIndex, setStartIndex] = useState(0);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartIndex = useRef(0);

  // 觸控縮放
  const lastTouchDist = useRef<number | null>(null);

  // 當 candles 變化時重置視窗
  useEffect(() => {
    const count = Math.min(candles.length, 60);
    setVisibleCount(count);
    setStartIndex(Math.max(0, candles.length - count));
  }, [candles]);

  // 計算可見資料
  const visibleCandles = candles.slice(startIndex, startIndex + visibleCount);

  // ── 滾輪縮放 ──────────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 5 : -5;
    setVisibleCount((prev) => {
      const next = clampZoom(prev + delta);
      // 調整 startIndex 使視窗右端固定
      setStartIndex((si) => {
        const maxStart = Math.max(0, candles.length - next);
        return Math.min(si, maxStart);
      });
      return next;
    });
  }, [candles.length]);

  // ── 拖曳平移 ──────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    setIsDraggingState(true);
    dragStartX.current = e.clientX;
    dragStartIndex.current = startIndex;
  }, [startIndex]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStartX.current;
    // 每 8px 移動一根蠟燭
    const candleShift = Math.round(-dx / 8);
    const newStart = Math.max(
      0,
      Math.min(
        candles.length - visibleCount,
        dragStartIndex.current + candleShift
      )
    );
    setStartIndex(newStart);
  }, [candles.length, visibleCount]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    setIsDraggingState(false);
  }, []);

  // ── 觸控縮放與拖曳 ────────────────────────────────────

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1) {
      isDragging.current = true;
      setIsDraggingState(true);
      dragStartX.current = e.touches[0].clientX;
      dragStartIndex.current = startIndex;
    }
  }, [startIndex]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = lastTouchDist.current / dist;
      lastTouchDist.current = dist;
      setVisibleCount((prev) => clampZoom(Math.round(prev * ratio)));
    } else if (e.touches.length === 1 && isDragging.current) {
      const dx = e.touches[0].clientX - dragStartX.current;
      const candleShift = Math.round(-dx / 8);
      const newStart = Math.max(
        0,
        Math.min(
          candles.length - visibleCount,
          dragStartIndex.current + candleShift
        )
      );
      setStartIndex(newStart);
    }
  }, [candles.length, visibleCount]);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    setIsDraggingState(false);
    lastTouchDist.current = null;
  }, []);

  // ── 渲染 ───────────────────────────────────────────────

  if (!candles.length) {
    return (
      <div className="kline-empty">
        <p>無資料</p>
      </div>
    );
  }

  // X 軸標籤格式
  const xKey = timeframe === 'daily' ? 'date' : 'time';

  // Y 軸範圍（加 padding）
  const prices = visibleCandles.flatMap((c) => [c.high, c.low]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const pricePadding = (maxPrice - minPrice) * 0.05 || 1;
  const yDomain: [number, number] = [
    Math.floor((minPrice - pricePadding) * 100) / 100,
    Math.ceil((maxPrice + pricePadding) * 100) / 100,
  ];

  // 成交量 Y 軸範圍
  const maxVolume = Math.max(...visibleCandles.map((c) => c.volume), 1);

  return (
    <div
      className="kline-chart-wrap"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: isDraggingState ? 'grabbing' : 'grab', userSelect: 'none' }}
    >
      {/* 主圖（K 線 + SMA） */}
      <div style={{ height: '68%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={visibleCandles}
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis
              dataKey={xKey}
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(148,163,184,0.15)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={yDomain}
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v: number) => v.toFixed(1)}
            />
            <Tooltip content={<KlineTooltip />} />

            {/* 蠟燭實體（使用 bodyLow 作為基準，bodyHeight 作為高度） */}
            <Bar
              dataKey="bodyHeight"
              minPointSize={1}
              shape={<CandleShape />}
              isAnimationActive={false}
            >
              {visibleCandles.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getCandleColor(entry.direction)}
                />
              ))}
            </Bar>

            {/* SMA 均線 */}
            <Line
              type="monotone"
              dataKey="sma5"
              stroke="#eab308"
              strokeWidth={1.5}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
              name="SMA5"
            />
            <Line
              type="monotone"
              dataKey="sma10"
              stroke="#f97316"
              strokeWidth={1.5}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
              name="SMA10"
            />
            <Line
              type="monotone"
              dataKey="sma20"
              stroke="#a855f7"
              strokeWidth={1.5}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
              name="SMA20"
            />
            <Line
              type="monotone"
              dataKey="sma60"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
              name="SMA60"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 成交量子圖 */}
      <div style={{ height: '28%', marginTop: '4px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={visibleCandles}
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.05)" />
            <XAxis
              dataKey={xKey}
              tick={false}
              tickLine={false}
              axisLine={{ stroke: 'rgba(148,163,184,0.1)' }}
            />
            <YAxis
              domain={[0, maxVolume * 1.1]}
              tick={{ fill: '#64748b', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v: number) => {
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                return String(v);
              }}
            />
            <Bar
              dataKey="volume"
              isAnimationActive={false}
            >
              {visibleCandles.map((entry, index) => (
                <Cell
                  key={`vol-${index}`}
                  fill={entry.direction === 'up' ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.5)'}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* SMA 圖例 */}
      <div className="kline-legend">
        <span style={{ color: '#eab308' }}>● SMA5</span>
        <span style={{ color: '#f97316' }}>● SMA10</span>
        <span style={{ color: '#a855f7' }}>● SMA20</span>
        <span style={{ color: '#3b82f6' }}>● SMA60</span>
      </div>
    </div>
  );
}
