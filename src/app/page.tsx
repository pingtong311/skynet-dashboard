import Link from 'next/link';

export default function Home() {
  return (
    <div className="w-full flex flex-col items-center justify-center py-12 px-4 sm:px-6">
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-5xl font-extrabold tracking-tight text-white mb-2 shadow-sm drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">
          SKYNET <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan to-purple">CENTRAL</span>
        </h1>
        <p className="text-gray-400 text-lg tracking-widest uppercase">
          天網系統核心傳送門 / SYSTEM PORTAL
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 w-full max-w-4xl">
        
        {/* Module 1: Strategy Control */}
        <Link href="/strategy" className="group block">
          <div className="h-full glass-panel p-8 rounded-2xl border border-cyan/30 hover:border-cyan transition-all duration-500 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] hover:-translate-y-2 relative overflow-hidden bg-gradient-to-b from-black/50 to-cyan/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-cyan group-hover:shadow-[0_0_10px_var(--color-cyan-glow)]"></div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-cyan/20 flex items-center justify-center border border-cyan flex-shrink-0 group-hover:scale-110 transition-transform">
                <span className="text-3xl">🎯</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white group-hover:text-cyan transition-colors">戰略控制中心</h2>
                <p className="text-xs text-cyan tracking-widest mt-1">STRATEGY CONTROL</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              調配天網策略參數，即時發送市場警戒與狙擊條件至 n8n 自動化核心。支援動態停損利及布林通道配置。
            </p>
          </div>
        </Link>
        
        {/* Module 2: Post-Trade Review (formerly root) */}
        <Link href="/review" className="group block">
          <div className="h-full glass-panel p-8 rounded-2xl border border-purple/30 hover:border-purple transition-all duration-500 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)] hover:-translate-y-2 relative overflow-hidden bg-gradient-to-b from-black/50 to-purple/10">
            <div className="absolute top-0 right-0 w-full h-1 bg-purple group-hover:shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-purple/20 flex items-center justify-center border border-purple flex-shrink-0 group-hover:scale-110 transition-transform">
                <span className="text-3xl">📊</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white group-hover:text-purple transition-colors">復盤儀表板</h2>
                <p className="text-xs text-purple tracking-widest mt-1">POST-TRADE REVIEW</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              分析市場數據與回測績效，檢視 KD交叉、MACD 等技術指標訊號，回顧演算法進出場時機與獲利狀況。
            </p>
          </div>
        </Link>

        {/* Future Module 3: Intelligence Matrix */}
        <div className="h-full glass-panel p-8 rounded-2xl border border-white/5 opacity-60 cursor-not-allowed bg-black/40 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10 p-4 text-center">
             <span className="text-2xl mb-2">🔒</span>
             <p className="text-white font-bold tracking-widest">MODULE LOCKED</p>
             <p className="text-gray-400 text-xs mt-1">開發建置中...</p>
          </div>
          <div className="flex items-center gap-4 mb-6 blur-sm">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500 flex-shrink-0">
              <span className="text-3xl">🧠</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">情報感知矩陣</h2>
              <p className="text-xs text-blue-500 tracking-widest mt-1">AI INSIGHTS</p>
            </div>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed blur-sm">
            深度學習總體經濟指標、新聞面情緒分析與異常交易量偵測，自動生成市場預警報告。
          </p>
        </div>

        {/* Future Module 4: Unknown */}
        <div className="h-full glass-panel p-8 rounded-2xl border border-white/5 opacity-60 cursor-not-allowed bg-black/40 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10 p-4 text-center">
             <span className="text-2xl mb-2">🚧</span>
             <p className="text-white font-bold tracking-widest">SYSTEM EXPANSION</p>
             <p className="text-gray-400 text-xs mt-1">預留擴充槽</p>
          </div>
          <div className="flex items-center gap-4 mb-6 blur-sm">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500 flex-shrink-0">
              <span className="text-3xl">⚡</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">自動化狙擊</h2>
              <p className="text-xs text-green-500 tracking-widest mt-1">AUTO EXECUTION</p>
            </div>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed blur-sm">
            直連券商 API，實作毫秒級程式交易，根據天網發訊號後無延遲自動掛單與平倉。
          </p>
        </div>

      </div>

      <div className="mt-16 text-center">
         <div className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 rounded-full bg-white/5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
            <span className="text-xs font-mono text-gray-400">SKYNET OPERATING NORMALLY</span>
         </div>
      </div>
    </div>
  );
}
