'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  { id: '2330', name: '台積電', type: '模擬買入', price: 810, current: 815, profit: '+0.62%', color: 'text-green' },
  { id: '2317', name: '鴻海', type: '模擬買入', price: 150, current: 152, profit: '+1.33%', color: 'text-green' },
  { id: '2454', name: '聯發科', type: '觀察中', price: 1120, current: 1115, profit: '-0.45%', color: 'text-red' },
];

export default function ReviewPage() {
  const [config, setConfig] = useState({
    strategy: 'Skynet-Omni-V10',
    priceThreshold: 2000,
    stopLoss: 2.5,
    isDayTrading: true,
  });

  const [isDeploying, setIsDeploying] = useState(false);
  const [lastScanTime, setLastScanTime] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedConfig = localStorage.getItem('skynet_config');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error('Failed to parse saved config', e);
      }
    }
    setLastScanTime(new Date().toLocaleString());
  }, []);

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

  if (!mounted) return null;

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
        <StatCard label="AI 虛擬本金" value="1,024,910 TWD" sub="起始模擬資金 1,000,000" color="cyan" />
        <StatCard label="今日模擬盈虧" value="+24,910 TWD" sub="當日未實現損益" color="green" />
        <StatCard label="累計模擬獲利" value="+158,420 TWD" sub="歷史累計績效" color="cyan" />
        <StatCard label="開盤監控時數" value="4 小時 30 分" sub="今日開盤執行進度" color="cyan" />
        <StatCard label="當日選股次數" value="12" sub="今日觸發交易條件" color="gray" />
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
                <span>Base: 1.0M TWD</span>
              </div>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ASSET_DATA}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="time" stroke="#4b5563" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#4b5563" fontSize={10} axisLine={false} tickLine={false} domain={['dataMin - 5000', 'dataMax + 5000']} />
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
                    <th className="pb-3 font-medium">標的</th>
                    <th className="pb-3 font-medium">模擬動作</th>
                    <th className="pb-3 font-medium">參考進場</th>
                    <th className="pb-3 font-medium">當前報價</th>
                    <th className="pb-3 font-medium">預計收益</th>
                    <th className="pb-3 font-medium text-right">狀態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {POSITIONS.map((pos) => (
                    <tr key={pos.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 font-bold">{pos.id} {pos.name}</td>
                      <td className="py-4"><span className="bg-cyan/10 text-cyan px-2 py-0.5 rounded text-[10px] uppercase font-bold">{pos.type}</span></td>
                      <td className="py-4 font-mono">{pos.price}</td>
                      <td className="py-4 font-mono text-cyan">{pos.current}</td>
                      <td className={`py-4 font-mono ${pos.color}`}>{pos.profit}</td>
                      <td className="py-4 text-right">
                        <span className="text-[10px] uppercase border border-glass-border px-2 py-1 rounded">實時觀察中</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {POSITIONS.length === 0 && <div className="py-10 text-center text-gray-500 italic">當前無模擬持倉</div>}
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
              <ThoughtItem time="09:15:04" text="早盤強勢股掃描完成。2330 出現多頭排列，模擬買入 1 張。" isAlert />
              <ThoughtItem time="09:45:12" text="偵測到航運板塊資金進駐，觀察長榮 (2603) 動能。" />
              <ThoughtItem time="10:30:01" text="[天網評估] 市場量能略微萎縮，調整當沖持倉門檻。" />
              <ThoughtItem time="11:15:44" text="2317 觸及壓力位，AI 決定先行結算 50% 模擬部位獲利。" isAlert />
              <ThoughtItem time="13:20:22" text="尾盤拉抬預期升溫，掃描尾盤避險標的中..." />
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="metric-label">選股門檻 (元)</label>
                  <input 
                    type="number"
                    value={config.priceThreshold}
                    onChange={(e) => handleConfigChange('priceThreshold', parseInt(e.target.value))}
                    className="w-full bg-black/40 border border-glass-border rounded p-2 text-sm focus:border-cyan outline-none font-mono"
                  />
                </div>
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
    <div className="glass-panel p-4 flex flex-col gap-1">
      <span className="metric-label">{label}</span>
      <span className={`metric-value ${colorMap[color]}`}>{value}</span>
      <span className="text-[9px] text-gray-500 uppercase tracking-tighter">{sub}</span>
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

