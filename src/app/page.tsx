'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Home() {
  const [strategy, setStrategy] = useState('Skynet-05');
  const [isTriggering, setIsTriggering] = useState(false);

  const handleTrigger = async () => {
    setIsTriggering(true);
    // Simulate n8n webhook API call
    setTimeout(() => {
      setIsTriggering(false);
      alert('天網信號已發送。');
    }, 1500);
  };

  return (
    <div className="min-h-screen p-8 sm:p-20 font-[family-name:var(--font-sans)] flex flex-col items-center">
      
      {/* Main Content Grid */}
      <main className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">

        
        {/* Left Column: Strategy Controls */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          <div className="glass-panel p-6 flex flex-col gap-4">
            <h2 className="text-xl font-semibold border-b border-glass-border pb-2 mb-2">策略控制台</h2>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400">當前運行演算法</label>
              <select 
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full bg-black/50 border border-glass-border rounded-lg p-3 text-foreground focus:outline-none focus:border-cyan transition-colors"
              >
                <option value="Skynet-05">[天網-05] 核心量化引擎</option>
                <option value="StepHigh">步步高升 (波段策略)</option>
                <option value="NoMonitor">上班族免盯盤</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <label className="text-sm text-gray-400">價格過濾門檻 (元)</label>
              <input 
                type="number" 
                defaultValue={2000}
                className="w-full bg-black/50 border border-glass-border rounded-lg p-3 text-foreground focus:outline-none focus:border-cyan transition-colors"
              />
            </div>

            <button 
              onClick={handleTrigger}
              disabled={isTriggering}
              className={`mt-6 w-full py-4 rounded-lg font-bold tracking-widest ${isTriggering ? 'opacity-50 cursor-not-allowed border border-cyan text-cyan' : 'glow-btn'}`}
            >
              {isTriggering ? 'EXECUTING...' : '強制觸發運算'}
            </button>
          </div>

          <div className="glass-panel p-6">
            <h2 className="text-xl font-semibold border-b border-glass-border pb-2 mb-4">系統狀態</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">n8n 核心流程</span>
                <span className="text-green-400 text-sm">Active</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">排程掃描 (Cron)</span>
                <span className="text-green-400 text-sm">Active</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Flowise AI 引擎</span>
                <span className="text-green-400 text-sm">Active</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">資料庫連線</span>
                <span className="text-yellow-400 text-sm">Syncing...</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Data Visualization & Alerts */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Chart / Market Overview */}
          <div className="glass-panel p-6 h-[400px] flex flex-col">
            <h2 className="text-xl font-semibold border-b border-glass-border pb-2 mb-4">系統歷史勝率與獲利回測矩陣</h2>
            <div className="flex-1 w-full bg-black/20 rounded-lg p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[
                    { name: '1月', winRate: 65, profit: 12 },
                    { name: '2月', winRate: 72, profit: 18 },
                    { name: '3月', winRate: 68, profit: 14 },
                    { name: '4月', winRate: 85, profit: 24 },
                    { name: '5月', winRate: 80, profit: 22 },
                    { name: '6月', winRate: 91, profit: 30 }
                  ]}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
                  <XAxis dataKey="name" stroke="#888888" />
                  <YAxis yAxisId="left" stroke="#888888" tickFormatter={(value) => `${value}%`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#888888" tickFormatter={(value) => `${value}w`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: '#333', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" name="勝率 (Win Rate %)" dataKey="winRate" stroke="#00f0ff" strokeWidth={3} dot={{ r: 4, fill: '#00f0ff' }} activeDot={{ r: 8 }} />
                  <Line yAxisId="right" type="monotone" name="累計獲利 (萬)" dataKey="profit" stroke="#b026ff" strokeWidth={3} dot={{ r: 4, fill: '#b026ff' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Insights */}
          <div className="glass-panel p-6">
            <h2 className="text-xl font-semibold border-b border-glass-border pb-2 mb-4 flex justify-between items-center">
              <span>Flowise AI 即時洞察</span>
              <span className="text-xs bg-purple/20 text-purple px-2 py-1 rounded">Beta</span>
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-black/40 border border-glass-border rounded-lg border-l-4 border-l-purple">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-purple">2330 台積電籌碼異動分析</h3>
                  <span className="text-xs text-gray-500">10 mins ago</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  外資連續三天買超且突破短期壓力區。符合「天網-05」第一階段濾網條件。乖離率目前低於 15% 安全範圍，建議可納入觀察名單。
                </p>
              </div>
              <div className="p-4 bg-black/40 border border-glass-border rounded-lg border-l-4 border-l-cyan">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-cyan">大盤情緒指標</h3>
                  <span className="text-xs text-gray-500">1 hour ago</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  今日市場恐慌指數 (VIX) 下降，資金有向電子權值股流入跡象。
                </p>
              </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
