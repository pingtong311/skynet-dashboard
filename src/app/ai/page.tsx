'use client';

import { useEffect, useState } from 'react';

type InsightLog = {
  time: string;
  type: string;
  msg: string;
  isAlert?: boolean;
};

export default function AIPage() {
  const [mounted, setMounted] = useState(false);
  const [logs, setLogs] = useState<InsightLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/skynet/insights');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch logs', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    void fetchLogs();
    const interval = setInterval(fetchLogs, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(31,102,209,0.08),_transparent_30%),linear-gradient(180deg,_#f8fbff_0%,_#eef4fb_48%,_#eef2f7_100%)] px-4 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <p className="text-[10px] font-black tracking-[0.3em] text-[#1f66d1] uppercase">AI INSIGHT STREAM</p>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">情報感知矩陣</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                這裡顯示天網對市場訊號的即時觀測日誌。介面已改成和戰情中心一致的白底工作區，方便你在同一套視覺下切換。
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-black tracking-[0.14em] uppercase">
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                LIVE FEED
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                30s REFRESH
              </span>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" />
              <span className="text-[10px] font-black tracking-[0.22em] text-slate-500 uppercase">
                AI Neural Processing Feed
              </span>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.12em] text-slate-500">
              SYNCED WITH LOCAL_STORAGE
            </span>
          </div>

          <div className="h-[620px] overflow-y-auto px-6 py-6">
            {isLoading ? (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 text-slate-500">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1f66d1] border-t-transparent" />
                <p className="text-[10px] font-black tracking-[0.3em] uppercase">Connecting to Skynet Neural Link...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex h-full min-h-[320px] items-center justify-center text-[10px] font-black tracking-[0.22em] uppercase text-slate-500">
                No real-time insights available for current session.
              </div>
            ) : (
              <div className="space-y-4 font-mono">
                {logs.map((log, index) => (
                  <article
                    key={`${log.time}-${index}`}
                    className={`rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 ${
                      log.isAlert ? 'border-[#1f66d1]/20 bg-[#1f66d1]/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span className="shrink-0 pt-0.5 text-[10px] font-bold text-slate-400">
                        {log.time}
                      </span>
                      <div className="min-w-0">
                        <span
                          className={`text-[10px] font-black tracking-[0.22em] uppercase ${
                            log.type === 'ALERT'
                              ? 'text-rose-600'
                              : log.type === 'THOUGHT'
                                ? 'text-violet-600'
                                : log.type === 'SCAN'
                                  ? 'text-cyan-600'
                                  : 'text-emerald-600'
                          }`}
                        >
                          [{log.type}]
                        </span>
                        <p className={`mt-1 text-sm leading-7 ${log.isAlert ? 'text-slate-900' : 'text-slate-600'}`}>
                          {log.msg}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatMini label="情緒指數量測" value="78 / 100" sub="市場偏向樂觀" />
          <StatMini label="異常量掃描" value="12 檔個股" sub="盤中集中在 AI 族群" />
          <StatMini label="平均延遲" value="14ms" sub="核心同步效率優化中" />
        </section>
      </div>
    </main>
  );
}

function StatMini({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="text-xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-[10px] italic text-slate-500">{sub}</p>
    </div>
  );
}
