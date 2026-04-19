'use client';

import { useState, useEffect } from 'react';

export default function StrategyPage() {
  const [config, setConfig] = useState({
    minPrice: 2000,
    maxBias: 15,
    takeProfit: 5.0,
    stopLoss: 2.5,
    bbLength: 20,
    bbMult: 2.0,
    strategy: 'Skynet-Omni-V10',
    isDayTrading: true,
  });

  const [isDeploying, setIsDeploying] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Persistence: Load from localStorage
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('skynet_strategy_config');
    if (saved) {
      try {
        setConfig(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch (e) {
        console.error('Failed to parse strategy config', e);
      }
    }
  }, []);

  // Persistence: Save to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('skynet_strategy_config', JSON.stringify(config));
    }
  }, [config, mounted]);

  const handleChange = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    setStatusMsg(null);
    
    try {
      const response = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          source: 'Dashboard_Strategy_Matrix',
          action: 'SYNC_AI_LOGIC',
          timestamp: new Date().toISOString()
        }),
      });

      if (response.ok) {
        setStatusMsg({ type: 'success', text: '✅ 模擬戰略參數已成功同步至 AI 核心引擎。' });
      } else {
        setStatusMsg({ type: 'error', text: '❌ 同步失敗，請檢查 n8n 服務狀態。' });
      }
    } catch (error) {
      setStatusMsg({ type: 'error', text: '❌ 網路錯誤，無法連線至 Webhook。' });
    } finally {
      setIsDeploying(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen pb-20">
      
      <div className="max-w-5xl mx-auto px-6 pt-12 animate-in fade-in duration-500">
        <div className="mb-12">
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
            Strategy <span className="text-cyan">Matrix</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1 tracking-widest uppercase font-bold">
            AI 虛擬投資人戰略調校矩陣 / TSEC SIMULATION
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Section 1: Filters */}
          <div className="glass-panel p-8 space-y-8">
            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-cyan">
                <span className="w-4 h-[1px] bg-cyan"></span> 市場過濾矩陣 (TSEC)
              </h3>
              <div className="space-y-4">
                <InputGroup 
                  label="選股價格門檻 (TWD)" 
                  value={config.minPrice} 
                  onChange={(v) => handleChange('minPrice', v)} 
                  unit="元"
                />
                <InputGroup 
                  label="最大允許乖離率" 
                  value={config.maxBias} 
                  onChange={(v) => handleChange('maxBias', v)} 
                  unit="%"
                />
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-green">
                <span className="w-4 h-[1px] bg-green"></span> 模擬盈虧目標
              </h3>
              <div className="space-y-4">
                <InputGroup 
                  label="單筆預期獲利" 
                  value={config.takeProfit} 
                  onChange={(v) => handleChange('takeProfit', v)} 
                  unit="%"
                  color="green"
                  step={0.1}
                />
                <InputGroup 
                  label="硬性熔斷停損" 
                  value={config.stopLoss} 
                  onChange={(v) => handleChange('stopLoss', v)} 
                  unit="%"
                  color="red"
                  step={0.1}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Indicators & Strategy */}
          <div className="glass-panel p-8 space-y-8">
            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-purple">
                <span className="w-4 h-[1px] bg-purple"></span> 布林通道過濾 (BB)
              </h3>
              <div className="space-y-4">
                <InputGroup 
                  label="通道長度 (Period)" 
                  value={config.bbLength} 
                  onChange={(v) => handleChange('bbLength', v)} 
                  unit="BARS"
                />
                <InputGroup 
                  label="標準差乘數 (StdDev)" 
                  value={config.bbMult} 
                  onChange={(v) => handleChange('bbMult', v)} 
                  unit="x"
                  step={0.1}
                />
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-gray-400">
                <span className="w-4 h-[1px] bg-gray-400"></span> 模擬模型選擇
              </h3>
              <div className="space-y-3">
                <StrategyOption 
                  label="[天網-Omni] 全能極速量化" 
                  desc="V10 旗艦版，台股實戰模擬推薦"
                  selected={config.strategy === 'Skynet-Omni-V10'}
                  onClick={() => handleChange('strategy', 'Skynet-Omni-V10')}
                />
                <StrategyOption 
                  label="步步高升 (Trend Follower)" 
                  desc="中長線趨勢追蹤優化模型"
                  selected={config.strategy === 'StepHigh'}
                  onClick={() => handleChange('strategy', 'StepHigh')}
                />
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-glass-border">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-white">當沖選股模式</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">開盤期間自動化高頻掃描</p>
                  </div>
                  <button 
                    onClick={() => handleChange('isDayTrading', !config.isDayTrading)}
                    className={`w-12 h-6 rounded-full relative transition-all ${config.isDayTrading ? 'bg-cyan shadow-[0_0_10px_rgba(0,240,255,0.4)]' : 'bg-gray-800'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.isDayTrading ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {statusMsg && (
          <div className={`mt-10 p-4 rounded border text-xs font-bold tracking-widest flex items-center gap-3 animate-in slide-in-from-top-2 ${
            statusMsg.type === 'success' ? 'bg-green/10 border-green/30 text-green' : 'bg-red/10 border-red/30 text-red'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current"></span>
            {statusMsg.text}
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-glass-border flex justify-end">
          <button 
            disabled={isDeploying}
            onClick={handleDeploy}
            className={`glow-btn px-10 py-4 font-black rounded text-sm ${isDeploying ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isDeploying ? 'SYNCING WITH CORE...' : '套用並執行模擬同步'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InputGroup({ label, value, onChange, unit, color = 'cyan', step = 1 }: { label: string, value: number, onChange: (v: number) => void, unit: string, color?: string, step?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="metric-label">{label}</label>
        <span className="text-[10px] text-gray-600 font-mono italic">UNIT: {unit}</span>
      </div>
      <div className="relative group">
        <input 
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full bg-black/40 border border-glass-border rounded-lg p-3 text-sm font-mono focus:border-cyan outline-none transition-all group-hover:bg-black/60"
        />
        <div className={`absolute bottom-0 left-0 h-[2px] bg-${color} transition-all w-0 group-focus-within:w-full`}></div>
      </div>
    </div>
  );
}

function StrategyOption({ label, desc, selected, onClick }: { label: string, desc: string, selected: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        selected 
          ? 'bg-purple/10 border-purple text-purple shadow-[0_0_15px_rgba(188,19,254,0.1)]' 
          : 'bg-black/20 border-glass-border text-gray-400 hover:border-gray-600'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full border-2 ${selected ? 'bg-purple border-purple' : 'border-gray-600'}`}></div>
        <div>
          <div className={`text-xs font-bold uppercase tracking-wider ${selected ? 'text-white' : ''}`}>{label}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">{desc}</div>
        </div>
      </div>
    </button>
  );
}



