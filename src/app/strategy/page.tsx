'use client';

import { useState } from 'react';

export default function StrategyPage() {
  const [minPrice, setMinPrice] = useState(2000);
  const [maxBias, setMaxBias] = useState(15);
  const [strategy, setStrategy] = useState('skynet');
  const [isDeploying, setIsDeploying] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleDeploy = async () => {
    setIsDeploying(true);
    setStatusMsg(null);
    
    // Payload to send to n8n Webhook
    const payload = {
      priceThreshold: minPrice,
      maxBiasPercentage: maxBias,
      selectedStrategy: strategy,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setStatusMsg({ type: 'success', text: '✅ 設定已成功部署至天網 (n8n Webhook) !' });
      } else {
        setStatusMsg({ type: 'error', text: `❌ 部署失敗：${data.error || '不明錯誤'}` });
      }
    } catch (error) {
      console.error('部署發生錯誤:', error);
      setStatusMsg({ type: 'error', text: '❌ 網路錯誤，請確認 Webhook URL 與伺服器狀態。' });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="glass-panel p-8">
        <h2 className="text-2xl font-bold border-b border-glass-border pb-4 mb-6">進階參數與策略控制</h2>
        <p className="text-gray-400 mb-8">在這裡動態調整您的 Skynet 篩選條件。所有設定將即時傳送至 n8n Webhook。</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="flex flex-col gap-4">
            <h3 className="text-xl text-cyan">過濾器設定</h3>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300">最小價格門檻</label>
              <input 
                type="number" 
                value={minPrice} 
                onChange={(e) => setMinPrice(Number(e.target.value))}
                className="bg-black/50 border border-glass-border rounded p-3 text-white focus:outline-none focus:border-cyan" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300">最大乖離率 (%)</label>
              <input 
                type="number" 
                value={maxBias} 
                onChange={(e) => setMaxBias(Number(e.target.value))}
                className="bg-black/50 border border-glass-border rounded p-3 text-white focus:outline-none focus:border-cyan" 
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-xl text-purple">策略選擇</h3>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 bg-black/30 p-3 rounded border border-glass-border cursor-pointer hover:border-purple transition-colors">
                <input 
                  type="radio" 
                  name="strategy" 
                  value="skynet" 
                  checked={strategy === 'skynet'} 
                  onChange={(e) => setStrategy(e.target.value)}
                  className="text-purple" 
                />
                <span>[天網-05] 核心量化引擎</span>
              </label>
              <label className="flex items-center gap-3 bg-black/30 p-3 rounded border border-glass-border cursor-pointer hover:border-purple transition-colors">
                <input 
                  type="radio" 
                  name="strategy" 
                  value="stephigh" 
                  checked={strategy === 'stephigh'}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="text-purple" 
                />
                <span>步步高升 追高策略</span>
              </label>
            </div>
          </div>

        </div>

        {statusMsg && (
          <div className={`mt-6 p-4 rounded border ${statusMsg.type === 'success' ? 'bg-green-900/20 border-green-500/50 text-green-400' : 'bg-red-900/20 border-red-500/50 text-red-400'}`}>
            {statusMsg.text}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-glass-border flex justify-end">
          <button 
            disabled={isDeploying}
            onClick={handleDeploy}
            className={`glow-btn px-8 py-3 font-bold rounded ${isDeploying ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isDeploying ? '連線中...' : '儲存並部署至 n8n'}
          </button>
        </div>
      </div>
    </div>
  );
}
