'use client';

import { useState, useEffect } from 'react';

export default function AIPage() {
  const [mounted, setMounted] = useState(false);
  const [logs, setLogs] = useState([
    { time: '13:30:00', type: 'CORE', msg: '台股今日收盤完成。AI 虛擬投資人本日模擬收益：+1.2%' },
    { time: '11:45:22', type: 'SCAN', msg: '偵測到 2330 台積電大單敲進，AI 自動調整模擬部位權重。' },
    { time: '10:15:10', type: 'THOUGHT', msg: '半導體族群連動性強，目前 2454 聯發科展現強勁買盤支撐。' },
    { time: '09:30:01', type: 'ALERT', msg: '偵測到盤中異常大量，觸發 Skynet-Omni V10 當沖掃描邏輯。', isAlert: true },
    { time: '09:00:00', type: 'INFO', msg: '台股開盤。AI 虛擬投資人啟動自動化市場掃描引擎。' },
    { time: '08:45:00', type: 'INIT', msg: '天網 AI 模擬核心初始化，正在同步 localStorage 戰略參數。' },
  ]);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen pb-20">
      
      <div className="max-w-5xl mx-auto px-6 pt-12 animate-in fade-in duration-500">
        <div className="mb-12">
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
            Insight <span className="text-green">Matrix</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1 tracking-widest uppercase font-bold">
            AI 情報感知矩陣 / 實時思考日誌 (台股模擬版)
          </p>
        </div>

        <div className="glass-panel overflow-hidden">
          <div className="bg-white/5 px-6 py-4 border-b border-glass-border flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="status-indicator status-online"></div>
              <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">AI Neural Processing Feed</span>
            </div>
            <span className="text-[10px] font-mono text-cyan bg-cyan/10 px-2 py-1 rounded border border-cyan/20">SYNCED WITH LOCAL_STORAGE</span>
          </div>
          
          <div className="p-8 h-[600px] overflow-y-auto space-y-6 font-mono scrollbar-hide">
            {logs.map((log, i) => (
              <div key={i} className={`flex gap-6 items-start group ${log.isAlert ? 'bg-cyan/5 -mx-4 px-4 py-3 rounded-xl border border-cyan/10' : ''}`}>
                <span className="text-[10px] opacity-30 shrink-0 mt-1 font-bold">{log.time}</span>
                <div className="flex flex-col gap-1">
                  <span className={`text-[10px] font-black tracking-widest uppercase ${
                    log.type === 'ALERT' ? 'text-red' : 
                    log.type === 'THOUGHT' ? 'text-purple' : 
                    log.type === 'SCAN' ? 'text-cyan' : 'text-green'
                  }`}>
                    [{log.type}]
                  </span>
                  <p className={`text-xs leading-relaxed transition-colors ${log.isAlert ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
                    {log.msg}
                  </p>
                </div>
              </div>
            ))}
            
            <div className="pt-8 border-t border-glass-border">
              <div className="flex items-center gap-3 text-cyan animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan"></div>
                <span className="text-[10px] font-bold tracking-[0.3em] uppercase">System is analyzing real-time TSEC market data...</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatMini label="情緒指數量測" value="78 / 100" sub="市場偏向樂觀" />
          <StatMini label="異常量掃描" value="12 檔個股" sub="盤中集中在 AI 族群" />
          <StatMini label="平均延遲" value="14ms" sub="核心同步效率優化中" />
        </div>
      </div>
    </div>
  );
}

function StatMini({ label, value, sub }: { label: string, value: string, sub: string }) {
  return (
    <div className="glass-panel p-6 border-white/5">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xl font-black text-white tracking-tighter">{value}</p>
      <p className="text-[10px] text-gray-600 mt-1 italic">{sub}</p>
    </div>
  );
}
