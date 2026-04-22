'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Recharts to avoid SSR issues on Vercel
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });

// Mock Data for the professional look - AI Virtual Portfolio Growth
const ASSET_DATA = [
  { time: '09:00', value: 1000000 },
  { time: '10:00', value: 1002500 },
  { time: '11:00', value: 1008200 },
  { time: '12:00', value: 1005800 },
  { time: '13:00', value: 1017100 },
  { time: '13:30', value: 1024910 },
];

const POSITIONS = [
  { id: '2330', name: '台積電', type: '模擬買入', price: 1030, current: 1045, profit: '+1.45%', color: 'text-green', time: '09:15:00' },
  { id: '2317', name: '鴻海', type: '模擬買入', price: 200, current: 205, profit: '+2.50%', color: 'text-green', time: '09:45:12' },
  { id: '2454', name: '聯發科', type: '觀察中', price: 1250, current: 1245, profit: '-0.40%', color: 'text-red', time: '10:30:05' },
];

export default function ReviewPage() {
  const [config, setConfig] = useState({
    strategy: 'Skynet-Omni-V10',
    priceThreshold: 2000,
    stopLoss: 2.5,
    takeProfit: 5.0,
    isDayTrading: true,
    bbLength: 20,
    bbMult: 2.0,
    maxBias: 3.5,
    minPrice: 50,
    initialCapital: 1000000,
  });

  const [monitoringData, setMonitoringData] = useState<any>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [lastScanTime, setLastScanTime] = useState('');
  const [mounted, setMounted] = useState(false);

  const fetchMonitoringData = async () => {
    try {
      const response = await fetch('/api/skynet/monitoring');
      if (response.ok) {
        const data = await response.json();
        setMonitoringData(data);
        setLastScanTime(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Failed to fetch monitoring data', error);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchMonitoringData();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchMonitoringData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mounted) {
      const savedConfig = localStorage.getItem('skynet_config');
      if (savedConfig) {
        try {
          setConfig(prev => ({ ...prev, ...JSON.parse(savedConfig) }));
        } catch (e) {
          console.error('Failed to parse saved config', e);
        }
      }
    }
  }, [mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('skynet_config', JSON.stringify(config));
    }
  }, [config, mounted]);

  const handleConfigChange = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      const response = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          action: 'SYNC_AI_LOGIC',
          source: 'Dashboard_Manual_Deploy',
          timestamp: new Date().toISOString()
        }),
      });

      if (response.ok) {
        alert('✅ 模擬戰略配置已成功部署至 AI 核心！');
      } else {
        throw new Error('Deployment failed');
      }
    } catch (error) {
      alert('❌ 同步失敗，請檢查網路連線。');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleResetCapital = async () => {
    if (!confirm('⚠️ 確定要將模擬本金重設歸零嗎？這將清除當前所有未實現盈虧。')) return;
    
    setIsResetting(true);
    try {
      const response = await fetch('/api/skynet/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESET_CAPITAL',
          principal: config.initialCapital,
          source: 'Dashboard_Manual_Reset',
          timestamp: new Date().toISOString()
        }),
      });

      if (response.ok) {
        alert('✅ 模擬本金已成功重設！(所有虛擬盈虧已清零)');
        fetchMonitoringData();
      } else {
        throw new Error('Reset failed');
      }
    } catch (error) {
      alert('❌ 重設失敗，請檢查網路連線。');
    } finally {
      setIsResetting(false);
    }
  };

  if (!mounted) return null;

  // Derive dynamic stats from monitoringData or defaults
  const currentCapital = monitoringData?.currentCapital || 1024910;
  const dailyPnL = monitoringData?.dailyPnL || 24910;
  const totalProfit = monitoringData?.totalProfit || 158420;
  const pnlPercent = ((dailyPnL / config.initialCapital) * 100).toFixed(2);
  const isPnLPositive = dailyPnL >= 0;

  return (
    <div className="min-h-screen pb-20 pt-6">
      {/* Header Bar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-2">
        <div>
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            SKYNET <span className="text-cyan text-xl font-light tracking-widest border-l border-glass-border pl-3">戰情中心</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">台股開盤自動化選股與模擬交易監控系統 V10</p>
        </div>
        
        <div className="flex items-center gap-6 glass-panel px-4 py-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="metric-label">市場行情</span>
            <span className="font-mono font-bold text-cyan">TSEC:INDEX</span>
            <span className="text-green">+1.24%</span>
          </div>
          <div className="flex items-center gap-2 border-l border-glass-border pl-6">
            <span className="metric-label">最近掃描</span>
            <span className="font-mono">{lastScanTime}</span>
          </div>
          <div className="flex items-center gap-2 border-l border-glass-border pl-6">
            <span className="status-indicator status-online"></span>
            <span className="text-xs font-bold uppercase tracking-widest text-green">開盤監控中</span>
          </div>
        </div>
      </header>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="relative group">
          <StatCard 
            label="AI 虛擬本金" 
            value={`${currentCapital.toLocaleString()} TWD`} 
            sub={`起始模擬資金 ${config.initialCapital.toLocaleString()}`} 
            color="cyan" 
          />
          <button 
            onClick={handleResetCapital}
            disabled={isResetting}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red/20 hover:bg-red/40 text-red text-[10px] px-2 py-0.5 rounded border border-red/30"
          >
            {isResetting ? '...' : '重設'}
          </button>
        </div>
        <StatCard 
          label="今日模擬盈虧" 
          value={`${isPnLPositive ? '+' : ''}${dailyPnL.toLocaleString()} TWD`} 
          sub={`${isPnLPositive ? '🟢' : '🔴'} 當日收益率 ${pnlPercent}%`} 
          color={isPnLPositive ? 'green' : 'red'} 
        />
        <StatCard 
          label="累計模擬獲利" 
          value={`${totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString()} TWD`} 
          sub="歷史累計績效" 
          color="cyan" 
        />
        <StatCard label="開盤監控時數" value="4 小時 30 分" sub="今日開盤執行進度" color="cyan" />
        <StatCard label="當日選股次數" value={monitoringData?.scanCount || "12"} sub="今日觸發交易條件" color="gray" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Dashboard Area (Left/Middle) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Chart Area */}
          <div className="glass-panel p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-bold uppercase tracking-widest">AI 虛擬投資人資產曲線 (模擬實戰)</h2>
              <div className="text-[10px] text-gray-500 flex gap-4 uppercase italic">
                <span>Model: Skynet-Omni V10</span>
                <span>Type: Virtual Trading</span>
                <span>Base: {(config.initialCapital / 1000000).toFixed(1)}M TWD</span>
              </div>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monitoringData?.assetHistory || ASSET_DATA}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="time" stroke="#4b5563" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#4b5563" fontSize={10} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--accent-cyan)" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Current Positions */}
          <div className="glass-panel p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-6">AI 虛擬部位監控 (當日模擬)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-glass-border uppercase text-[10px] tracking-widest">
                    <th className="pb-3 font-medium">時間</th>
                    <th className="pb-3 font-medium">標的</th>
                    <th className="pb-3 font-medium">模擬動作</th>
                    <th className="pb-3 font-medium">參考進場</th>
                    <th className="pb-3 font-medium">當前報價</th>
                    <th className="pb-3 font-medium">預計收益</th>
                    <th className="pb-3 font-medium text-right">狀態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {(monitoringData?.positions || POSITIONS).map((pos: any, idx: number) => {
                    const isProfit = (pos.profit || pos.Profit || '').toString().includes('+');
                    return (
                      <tr key={`${pos.id || pos.Ticker}-${idx}`} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 font-mono text-[10px] text-gray-500">{pos.time || pos.Date || '-'}</td>
                        <td className="py-4 font-bold">{pos.id || pos.Ticker} {pos.name || pos.Name}</td>
                        <td className="py-4">
                          <span className={`${(pos.type || pos.Action) === 'SELL' ? 'bg-red/10 text-red' : 'bg-cyan/10 text-cyan'} px-2 py-0.5 rounded text-[10px] uppercase font-bold`}>
                            {pos.type || pos.Action || '監控中'}
                          </span>
                        </td>
                        <td className="py-4 font-mono">{pos.price || pos.Entry_Price || pos.Price || '-'}</td>
                        <td className="py-4 font-mono text-cyan">{pos.current || pos.Price}</td>
                        <td className={`py-4 font-mono ${isProfit ? 'text-green' : 'text-red'}`}>{pos.profit || pos.Profit || '0.00%'}</td>
                        <td className="py-4 text-right">
                          <span className="text-[10px] uppercase border border-glass-border px-2 py-1 rounded">
                            {pos.Status || '實時觀察中'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {(!monitoringData?.positions && POSITIONS.length === 0) && <div className="py-10 text-center text-gray-500 italic">當前無模擬持倉</div>}
            </div>
          </div>
        </div>

        {/* Sidebar Area (Right) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* AI Thought Stream */}
          <div className="glass-panel flex flex-col h-[400px]">
            <div className="p-4 border-b border-glass-border flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-widest">AI 虛擬人格思考流</h2>
              <span className="text-[10px] text-cyan bg-cyan/10 px-2 py-0.5 rounded uppercase tracking-tighter">Mind Stream</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
              {monitoringData?.thoughts ? (
                monitoringData.thoughts.map((thought: any, i: number) => (
                  <ThoughtItem 
                    key={i} 
                    time={thought.time || lastScanTime} 
                    text={thought.text || thought} 
                    isAlert={thought.isAlert || thought.toString().includes('! ')} 
                  />
                ))
              ) : (
                <>
                  <ThoughtItem time="09:15:04" text="早盤強勢股掃描完成。2330 出現多頭排列，模擬買入 1 張。" isAlert />
                  <ThoughtItem time="09:45:12" text="偵測到航運板塊資金進駐，觀察長榮 (2603) 動能。" />
                  <ThoughtItem time="10:30:01" text="[天網評估] 市場量能略微萎縮，調整當沖持倉門檻。" />
                  <ThoughtItem time="11:15:44" text="2317 觸及壓力位，AI 決定先行結算 50% 模擬部位獲利。" isAlert />
                  <ThoughtItem time="13:20:22" text="尾盤拉抬預期升溫，掃描尾盤避險標的中..." />
                </>
              )}
            </div>
          </div>

          {/* Config Panel */}
          <div className="glass-panel p-6 bg-cyan/5">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-cyan rounded-full"></span> 模擬戰略調校
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="metric-label">AI 決策引擎</label>
                <select 
                  value={config.strategy}
                  onChange={(e) => handleConfigChange('strategy', e.target.value)}
                  className="w-full bg-black/40 border border-glass-border rounded p-2 text-sm focus:border-cyan outline-none"
                >
                  <option value="Skynet-Omni-V10">Skynet-Omni V10 (全能型)</option>
                  <option value="IntradayScanner">當沖精準選股 (極速型)</option>
                  <option value="StepHigh">步步高升 (趨勢型)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="metric-label">虛擬初始本金 (TWD)</label>
                <input 
                  type="number"
                  value={config.initialCapital}
                  onChange={(e) => handleConfigChange('initialCapital', parseInt(e.target.value))}
                  className="w-full bg-black/40 border border-glass-border rounded p-2 text-sm focus:border-cyan outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="metric-label">選股最低價</label>
                  <input 
                    type="number"
                    value={config.minPrice}
                    onChange={(e) => handleConfigChange('minPrice', parseInt(e.target.value))}
                    className="w-full bg-black/40 border border-glass-border rounded p-2 text-sm focus:border-cyan outline-none font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="metric-label">選股最高價</label>
                  <input 
                    type="number"
                    value={config.priceThreshold}
                    onChange={(e) => handleConfigChange('priceThreshold', parseInt(e.target.value))}
                    className="w-full bg-black/40 border border-glass-border rounded p-2 text-sm focus:border-cyan outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="metric-label">模擬停損 (%)</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={config.stopLoss}
                    onChange={(e) => handleConfigChange('stopLoss', parseFloat(e.target.value))}
                    className="w-full bg-black/40 border border-glass-border rounded p-2 text-sm focus:border-cyan outline-none font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="metric-label">模擬停利 (%)</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={config.takeProfit}
                    onChange={(e) => handleConfigChange('takeProfit', parseFloat(e.target.value))}
                    className="w-full bg-black/40 border border-glass-border rounded p-2 text-sm focus:border-cyan outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 p-3 bg-black/20 rounded border border-glass-border">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase">BB Length</label>
                  <input 
                    type="number"
                    value={config.bbLength}
                    onChange={(e) => handleConfigChange('bbLength', parseInt(e.target.value))}
                    className="w-full bg-transparent text-xs font-mono outline-none"
                  />
                </div>
                <div className="space-y-1 border-l border-glass-border pl-3">
                  <label className="text-[10px] text-gray-500 uppercase">BB Mult</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={config.bbMult}
                    onChange={(e) => handleConfigChange('bbMult', parseFloat(e.target.value))}
                    className="w-full bg-transparent text-xs font-mono outline-none"
                  />
                </div>
                <div className="space-y-1 border-l border-glass-border pl-3">
                  <label className="text-[10px] text-gray-500 uppercase">Max Bias</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={config.maxBias}
                    onChange={(e) => handleConfigChange('maxBias', parseFloat(e.target.value))}
                    className="w-full bg-transparent text-xs font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-black/20 rounded border border-glass-border">
                <span className="text-xs uppercase tracking-widest">當沖自動化掃描</span>
                <button 
                  onClick={() => handleConfigChange('isDayTrading', !config.isDayTrading)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${config.isDayTrading ? 'bg-cyan' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.isDayTrading ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>

              <button 
                onClick={handleDeploy}
                disabled={isDeploying}
                className={`w-full py-3 mt-4 rounded font-bold transition-all glow-btn ${isDeploying ? 'opacity-50 grayscale' : ''}`}
              >
                {isDeploying ? '正在同步中...' : '套用並同步至 AI 核心'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string, value: string, sub: string, color: string }) {
  const colorMap: any = {
    cyan: 'text-cyan',
    red: 'text-red',
    green: 'text-green',
    gray: 'text-gray-400'
  };
  return (
    <div className="glass-panel p-4 flex flex-col gap-1 h-full">
      <span className="metric-label">{label}</span>
      <span className={`metric-value ${colorMap[color]}`}>{value}</span>
      <span className="text-[9px] text-gray-500 uppercase tracking-tighter line-clamp-1">{sub}</span>
    </div>
  );
}

function ThoughtItem({ time, text, isAlert = false }: { time: string, text: string, isAlert?: boolean }) {
  return (
    <div className={`text-[11px] leading-relaxed flex gap-3 ${isAlert ? 'text-cyan font-bold' : 'text-gray-400'}`}>
      <span className="font-mono text-gray-600 shrink-0">{time}</span>
      <p>{isAlert && '🤖 '}{text}</p>
    </div>
  );
}

