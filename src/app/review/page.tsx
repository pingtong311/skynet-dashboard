'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Target, 
  TrendingUp, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  Terminal, 
  RefreshCw, 
  AlertTriangle,
  ChevronRight,
  Database,
  BarChart3,
  Search,
  Settings2,
  Crosshair
} from 'lucide-react';

// Dynamically import Recharts to avoid SSR issues
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });

const ASSET_DATA = [
  { time: '09:00', value: 1000000 },
  { time: '10:00', value: 1002500 },
  { time: '11:00', value: 1008200 },
  { time: '12:00', value: 1005800 },
  { time: '13:00', value: 1017100 },
  { time: '13:30', value: 1024910 },
];

const POSITIONS_MOCK = [
  { id: '2330', name: '台積電', Action: 'BUY', Entry_Price: 1030, Price: 1045, Profit: '+1.45%', time: '09:15:00', Status: '持有中' },
  { id: '2317', name: '鴻海', Action: 'BUY', Entry_Price: 200, Price: 205, Profit: '+2.50%', time: '09:45:12', Status: '持有中' },
  { id: '2454', name: '聯發科', Action: 'WAIT', Entry_Price: 1250, Price: 1245, Profit: '-0.40%', time: '10:30:05', Status: '觀察中' },
];

export default function ReviewPage() {
  const [config, setConfig] = useState({
    strategy: 'Skynet-Omni-V10',
    initialCapital: 1000000,
    minPrice: 20,
    priceThreshold: 3000,
    stopLoss: 1.5,
    takeProfit: 3.0,
    minVolumeRatio: 1.0,
    bbLength: 20,
    bbMult: 2.0,
    maxBias: 3.5,
    isDayTrading: true,
  });

  const [monitoringData, setMonitoringData] = useState<any>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [lastScanTime, setLastScanTime] = useState('');
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMonitoringData = async () => {
    try {
      const response = await fetch('/api/skynet/monitoring');
      if (response.ok) {
        const data = await response.json();
        setMonitoringData(data);
        setLastScanTime(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('skynet_config');
    if (saved) setConfig(JSON.parse(saved));
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 5000); // 5s refresh for real-time feedback
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem('skynet_config', JSON.stringify(config));
  }, [config, mounted]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [monitoringData?.thoughts]);

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, action: 'SYNC_AI_LOGIC' }),
      });
      alert('✅ 戰略配置同步成功');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('⚠️ 重設模擬本金？')) return;
    setIsResetting(true);
    try {
      await fetch('/api/skynet/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_CAPITAL', principal: config.initialCapital }),
      });
      fetchMonitoringData();
    } finally {
      setIsResetting(false);
    }
  };

  if (!mounted) return null;

  const dailyPnL = monitoringData?.dailyPnL || 0;
  const totalProfit = monitoringData?.totalProfit || 0;
  const currentCapital = config.initialCapital + totalProfit;
  const pnlPercent = ((dailyPnL / config.initialCapital) * 100).toFixed(2);

  return (
    <div className="min-h-screen pb-10 pt-4 px-4 max-w-[1600px] mx-auto overflow-hidden">
      {/* Top Navigation / Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-cyan/10 border border-cyan/30 rounded-xl flex items-center justify-center glow-text-cyan">
            <Cpu size={28} className="text-cyan" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter flex items-center gap-2">
              SKYNET <span className="text-cyan font-light opacity-50">/</span> <span className="text-sm font-bold tracking-[0.3em] uppercase text-gray-400">Tactical Command</span>
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="status-indicator status-online"></span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-green/80">Active Monitoring Mode</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="glass-panel px-4 py-2 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
            <div className="flex items-center gap-2 border-r border-glass-border pr-4">
              <RefreshCw size={12} className="text-cyan animate-spin-slow" />
              <span className="text-gray-500">Last Scan</span>
              <span className="font-mono text-cyan">{lastScanTime || '--:--:--'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Database size={12} className="text-purple" />
              <span className="text-gray-500">Source</span>
              <span className="text-purple">Railway Cloud</span>
            </div>
          </div>
          <button 
            onClick={fetchMonitoringData}
            className="w-10 h-10 glass-panel flex items-center justify-center hover:bg-cyan/10 hover:text-cyan transition-all"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </motion.header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: KPI & Strategy */}
        <div className="lg:col-span-3 space-y-6">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <StatCard 
              icon={<TrendingUp size={16} />}
              label="模擬淨資產" 
              value={`${currentCapital.toLocaleString()}`} 
              sub="TWD"
              trend={totalProfit >= 0 ? `+${totalProfit.toLocaleString()}` : totalProfit.toLocaleString()}
              color={totalProfit >= 0 ? "cyan" : "red"}
            />
            <StatCard 
              icon={<Activity size={16} />}
              label="今日模擬盈虧" 
              value={`${dailyPnL >= 0 ? '+' : ''}${dailyPnL.toLocaleString()}`} 
              sub={`${pnlPercent}%`}
              color={dailyPnL >= 0 ? "green" : "red"}
            />
          </motion.div>

          {/* Strategy Panel */}
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-panel p-5 bg-cyan/5 border-cyan/20"
          >
            <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2 text-cyan">
              <Settings2 size={14} /> 戰略控制台
            </h3>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="metric-label">AI 決策引擎</label>
                <div className="relative">
                  <select 
                    value={config.strategy}
                    onChange={(e) => setConfig({...config, strategy: e.target.value})}
                    className="w-full bg-black/60 border border-glass-border rounded-lg p-2.5 text-xs focus:border-cyan outline-none appearance-none font-bold"
                  >
                    <option value="Skynet-Omni-V10">Skynet-Omni V10 (全能型)</option>
                    <option value="IntradayScanner">當沖精準選股 (極速型)</option>
                  </select>
                  <ChevronRight size={14} className="absolute right-3 top-3 text-gray-500 rotate-90" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="metric-label">最高價限</label>
                  <input 
                    type="number"
                    value={config.priceThreshold}
                    onChange={(e) => setConfig({...config, priceThreshold: parseInt(e.target.value)})}
                    className="w-full bg-black/40 border border-glass-border rounded-lg p-2 text-xs font-mono outline-none focus:border-cyan"
                  />
                </div>
                <div className="space-y-2">
                  <label className="metric-label">最低量比</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={config.minVolumeRatio}
                    onChange={(e) => setConfig({...config, minVolumeRatio: parseFloat(e.target.value)})}
                    className="w-full bg-black/40 border border-glass-border rounded-lg p-2 text-xs font-mono outline-none focus:border-cyan"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-glass-border mt-2">
                <div className="flex items-center gap-2">
                  <Zap size={14} className={config.isDayTrading ? 'text-yellow-400' : 'text-gray-500'} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">當沖自動掃描</span>
                </div>
                <button 
                  onClick={() => setConfig({...config, isDayTrading: !config.isDayTrading})}
                  className={`w-10 h-5 rounded-full relative transition-all ${config.isDayTrading ? 'bg-cyan' : 'bg-gray-700'}`}
                >
                  <motion.div 
                    animate={{ x: config.isDayTrading ? 20 : 0 }}
                    className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow-lg"
                  />
                </button>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <button 
                  onClick={handleDeploy}
                  disabled={isDeploying}
                  className="glow-btn w-full py-3.5 text-[11px] flex items-center gap-2"
                >
                  {isDeploying ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  Deploy Strategy
                </button>
                <button 
                  onClick={handleReset}
                  className="text-[10px] uppercase font-bold text-gray-500 hover:text-red transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={10} /> Reset Principal
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Center Column: Charts & Positions */}
        <div className="lg:col-span-6 space-y-6">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass-panel p-6 h-[350px]"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <BarChart3 size={18} className="text-cyan" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em]">資產增長曲線 (模擬)</h2>
              </div>
              <div className="flex gap-4">
                <span className="text-[9px] bg-cyan/10 text-cyan px-2 py-0.5 rounded border border-cyan/20">LIVE FEED</span>
              </div>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monitoringData?.assetHistory || ASSET_DATA}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="time" stroke="#4b5563" fontSize={9} axisLine={false} tickLine={false} />
                  <YAxis stroke="#4b5563" fontSize={9} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                    itemStyle={{ color: 'var(--accent-cyan)' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--accent-cyan)" strokeWidth={3} fillOpacity={1} fill="url(#chartGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <Crosshair size={18} className="text-red" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em]">實時模擬部位監控</h2>
              </div>
              <span className="text-[10px] text-gray-500 font-mono">Count: {(monitoringData?.positions || []).length}</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-500 border-b border-glass-border uppercase text-[9px] tracking-widest font-black">
                    <th className="pb-4">Ticker</th>
                    <th className="pb-4">Action</th>
                    <th className="pb-4">五檔力道</th>
                    <th className="pb-4">Entry</th>
                    <th className="pb-4">Current</th>
                    <th className="pb-4">PnL</th>
                    <th className="pb-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {(monitoringData?.positions || POSITIONS_MOCK).map((pos: any, i: number) => (
                    <motion.tr 
                      key={i} 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="group hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black">{pos.Ticker || pos.id}</span>
                          <span className="text-[10px] text-gray-500 font-bold">{pos.Name || pos.name}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase ${pos.Action === 'SELL' ? 'bg-red/10 text-red border border-red/20' : 'bg-cyan/10 text-cyan border border-cyan/20'}`}>
                          {pos.Action || pos.type}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-1">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(v => (
                              <div key={v} className={`w-1.5 h-3 rounded-sm ${v <= (pos.BidAskRatio || 3) ? 'bg-cyan' : 'bg-gray-800'}`} />
                            ))}
                          </div>
                          <span className="text-[9px] font-mono text-cyan ml-1">+{pos.Momentum || '2.4'}</span>
                        </div>
                      </td>
                      <td className="py-4 font-mono text-xs">{pos.Entry_Price || pos.price}</td>
                      <td className="py-4 font-mono text-xs text-cyan glow-text-cyan">{pos.Price || pos.current}</td>
                      <td className={`py-4 font-mono text-xs font-bold ${(pos.Profit || pos.profit || '').includes('+') ? 'text-green' : 'text-red'}`}>
                        {pos.Profit || pos.profit}
                      </td>
                      <td className="py-4 text-right">
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">
                          {pos.Status || 'Active'}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {(!monitoringData?.positions && POSITIONS_MOCK.length === 0) && (
                <div className="py-12 text-center">
                  <Activity size={32} className="mx-auto text-gray-700 mb-3 animate-pulse" />
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest italic">Waiting for market signals...</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column: AI Log & Sentiment */}
        <div className="lg:col-span-3 space-y-6">
          {/* Sentiment Gauge */}
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="glass-panel p-5 text-center"
          >
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-gray-500">市場風險情緒 (模擬)</h3>
            <div className="relative w-32 h-32 mx-auto">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-800" />
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="364.4" strokeDashoffset={364.4 * (1 - 0.72)} className="text-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black font-mono">72</span>
                <span className="text-[8px] uppercase tracking-widest text-cyan">OPTIMISTIC</span>
              </div>
            </div>
          </motion.div>

          {/* AI Terminal Log */}
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-panel terminal-view flex flex-col h-[525px]"
          >
            <div className="p-3 border-b border-white/5 flex justify-between items-center bg-black/40">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-cyan" />
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan/80">AI Cognitive Stream</span>
              </div>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red/30"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-400/30"></div>
                <div className="w-2 h-2 rounded-full bg-green/30"></div>
              </div>
            </div>
            
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-[10px] scroll-smooth"
            >
              <AnimatePresence mode="popLayout">
                {(monitoringData?.thoughts || [
                  "INITIALIZING SKYNET COGNITIVE ENGINE...",
                  "CORE-V10 ONLINE. CONNECTING TO RAILWAY-N8N...",
                  "SCANNING HISTOCK HOT LIST (15 TICKERS)...",
                  "MATCHING FOCUS_TAGS: [記憶體, 半導體]...",
                  "VOL_RATIO CALCULATION COMPLETED.",
                  "READY FOR TACTICAL DEPLOYMENT."
                ]).map((t: any, i: number) => (
                  <motion.div 
                    key={i}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex gap-3 text-gray-400 leading-relaxed group"
                  >
                    <span className="text-cyan/40 shrink-0 select-none">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                    <p className="group-hover:text-cyan transition-colors">
                      {typeof t === 'string' ? t : (t.text || t.toString())}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="p-3 border-t border-white/5 bg-black/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-cyan animate-pulse">_</span>
                <span className="text-[8px] text-gray-600 uppercase font-black">System Ready. Awaiting next cycle.</span>
              </div>
              <div className="text-[8px] font-bold text-cyan/40">LATENCY: 42ms</div>
            </div>
          </motion.div>

          {/* New: Intraday Momentum Monitor (Five-Level Quote) */}
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-panel p-5"
          >
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Zap size={14} className="text-yellow-400" /> 五檔即時動能監測
            </h3>
            <div className="space-y-3">
              {[
                { ticker: '2330', name: '台積電', momentum: 85, bid: 450, ask: 120 },
                { ticker: '2317', name: '鴻海', momentum: 92, bid: 890, ask: 45 },
                { ticker: '2454', name: '聯發科', momentum: 42, bid: 120, ask: 180 },
              ].map((m, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[9px] font-bold">
                    <span>{m.ticker} {m.name}</span>
                    <span className="text-cyan">{m.momentum}% Strength</span>
                  </div>
                  <div className="flex h-1.5 w-full bg-red/20 rounded-full overflow-hidden">
                    <div className="bg-cyan h-full" style={{ width: `${(m.bid / (m.bid + m.ask)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Background Decor */}
      <div className="fixed bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-cyan/5 to-transparent pointer-events-none -z-10" />
    </div>
  );
}

function StatCard({ icon, label, value, sub, trend, color }: any) {
  const colors: any = {
    cyan: 'text-cyan border-cyan/20',
    green: 'text-green border-green/20',
    red: 'text-red border-red/20',
  };
  
  return (
    <div className={`glass-panel p-5 flex flex-col gap-1 border-l-4 ${colors[color]}`}>
      <div className="flex justify-between items-start">
        <span className="metric-label flex items-center gap-2">
          {icon} {label}
        </span>
        {trend && (
          <span className={`text-[9px] font-mono font-bold ${trend.startsWith('+') ? 'text-green' : 'text-red'}`}>
            {trend}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 mt-2">
        <span className={`metric-value ${colors[color].split(' ')[0]}`}>{value}</span>
        <span className="text-xs text-gray-500 font-bold">{sub}</span>
      </div>
    </div>
  );
}
