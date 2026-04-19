'use client';

import { useState, useEffect } from 'react';

export default function AIPage() {
  const [mounted, setMounted] = useState(false);
  const [logs, setLogs] = useState<{ time: string, type: string, msg: string, isAlert?: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/skynet/insights');
      const data = await res.json();
      setLogs(data);
    } catch (e) {
      console.error('Failed to fetch logs', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

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
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-50">
                <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] tracking-widest uppercase font-bold">Connecting to Skynet Neural Link...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-[10px] uppercase tracking-widest">
                No real-time insights available for current session.
              </div>
            ) : (
              logs.map((log, i) => (
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
