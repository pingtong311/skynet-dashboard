import Link from 'next/link';

export default function Home() {
  return (
    <div className="w-full flex flex-col items-center justify-center py-20 px-4">
      {/* Hero Section */}
      <div className="text-center mb-20 space-y-6">
        <div className="inline-block px-4 py-1.5 rounded-full bg-cyan/10 border border-cyan/20 text-[10px] font-bold tracking-[0.3em] text-cyan uppercase mb-4">
          Taiwan Stock Market AI Simulation Core
        </div>
        <h1 className="text-6xl font-black tracking-tighter text-white">
          SKYNET <span className="text-cyan italic">OS</span>
        </h1>
        <p className="text-gray-500 text-sm tracking-widest uppercase max-w-lg mx-auto leading-relaxed">
          天網系統全能極速量化交易引擎 V10
          <br />
          <span className="text-[10px] text-cyan/60 mt-2 block italic font-bold">AI 虛擬投資人實戰監控中心</span>
        </p>
      </div>

      {/* Grid of Control Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
        
        {/* Module 1: Strategy Control */}
        <ControlCard 
          href="/strategy"
          title="模擬戰略中心"
          sub="STRATEGY MATRIX"
          desc="調配 AI 虛擬投資人的交易邏輯。設定台股選股門檻、趨勢追蹤參數與模擬風控條件。"
          icon="🎯"
          color="cyan"
        />
        
        {/* Module 2: War Room (Review) */}
        <ControlCard 
          href="/review"
          title="實時戰情儀表"
          sub="WAR ROOM MONITOR"
          desc="同步台股開盤行情，觀摩 AI 虛擬投資人的即時部位增長、盈虧變化與模擬實戰績效。"
          icon="📊"
          color="purple"
        />

        {/* Module 3: AI Intelligence */}
        <ControlCard 
          href="/ai"
          title="情報感知矩陣"
          sub="AI INSIGHT STREAM"
          desc="查看 AI 在交易時段的思考邏輯。包含市場情緒掃描、異常量偵測與實時選股日誌。"
          icon="🧠"
          color="green"
        />

        {/* Module 4: Execution System */}
        <div className="group relative overflow-hidden glass-panel p-8 opacity-40 grayscale cursor-not-allowed">
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center z-10 p-4 text-center">
             <div className="text-xs font-black tracking-widest uppercase border border-white/20 px-3 py-1 rounded">Locked</div>
             <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-tighter">實盤 API 介接開發中</p>
          </div>
          <div className="flex items-center gap-5 mb-6 blur-sm">
            <div className="w-14 h-14 rounded-xl bg-gray-500/10 flex items-center justify-center border border-white/10 shrink-0">
              <span className="text-3xl">⚡</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">自動狙擊系統</h2>
              <p className="text-[10px] text-gray-500 tracking-widest mt-0.5">LIVE EXECUTION</p>
            </div>
          </div>
          <p className="text-gray-500 text-xs leading-relaxed blur-sm">
            直連券商 API，實作毫秒級程式交易，根據天網發訊號後無延遲自動掛單與平倉。
          </p>
        </div>
      </div>

      <div className="mt-24 text-center">
         <div className="inline-flex items-center gap-3 px-6 py-3 border border-glass-border rounded-full bg-glass-bg backdrop-blur-sm">
            <span className="status-indicator status-online"></span>
            <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Skynet Core Operating Normally</span>
         </div>
      </div>
    </div>
  );
}

function ControlCard({ href, title, sub, desc, icon, color }: { href: string, title: string, sub: string, desc: string, icon: string, color: string }) {
  const colorMap: any = {
    cyan: 'group-hover:border-cyan hover:shadow-[0_0_30px_rgba(0,240,255,0.15)] border-cyan/20',
    purple: 'group-hover:border-purple hover:shadow-[0_0_30px_rgba(188,19,254,0.15)] border-purple/20',
    green: 'group-hover:border-green hover:shadow-[0_0_30px_rgba(0,255,157,0.15)] border-green/20'
  };
  const iconBgMap: any = {
    cyan: 'bg-cyan/10 border-cyan/30 text-cyan',
    purple: 'bg-purple/10 border-purple/30 text-purple',
    green: 'bg-green/10 border-green/30 text-green'
  };

  return (
    <Link href={href} className="group block">
      <div className={`h-full glass-panel p-8 transition-all duration-500 hover:-translate-y-1 ${colorMap[color]}`}>
        <div className="flex items-center gap-5 mb-6">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center border shrink-0 group-hover:scale-110 transition-transform ${iconBgMap[color]}`}>
            <span className="text-3xl">{icon}</span>
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight group-hover:text-white transition-colors">{title}</h2>
            <p className={`text-[10px] tracking-widest mt-0.5 font-bold opacity-70`}>{sub}</p>
          </div>
        </div>
        <p className="text-gray-400 text-xs leading-relaxed group-hover:text-gray-300 transition-colors">
          {desc}
        </p>
        <div className="mt-6 flex items-center gap-2 text-[10px] font-bold tracking-widest text-cyan opacity-0 group-hover:opacity-100 transition-opacity">
          ACCESS TERMINAL <span>→</span>
        </div>
      </div>
    </Link>
  );
}

