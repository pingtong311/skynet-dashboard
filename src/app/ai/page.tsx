'use client';

import { useState } from 'react';

export default function AILogPage() {
  const [query, setQuery] = useState('請解析 2330 台積電 籌碼面與近期技術線型');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAskAI = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setResponse(null);

    try {
      const res = await fetch('/api/flowise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query })
      });
      const data = await res.json();
      
      if (res.ok) {
        setResponse(data.text);
      } else {
        setResponse(`❌ 請求失敗: ${data.error}`);
      }
    } catch (error) {
      console.error(error);
      setResponse(`❌ 網路錯誤，無法連接至 Flowise 引擎。`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">每日 Flowise AI 解讀報告</h2>
        <span className="bg-purple/20 text-purple px-3 py-1 rounded-full text-sm font-medium">Flowise Engine Active</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left: Chat Interface */}
        <div className="glass-panel p-6 flex flex-col gap-4">
          <h3 className="text-lg text-cyan font-semibold border-b border-glass-border pb-2">專家董事會詢問視窗</h3>
          <p className="text-sm text-gray-400">輸入標的代號或大盤情境，Flowise AI 將召集各方流派為您解析。</p>
          
          <textarea 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-24 bg-black/50 border border-glass-border rounded-lg p-3 text-white focus:outline-none focus:border-cyan resize-none"
            placeholder="請輸入欲查詢的股票代號..."
          />
          
          <button 
            onClick={handleAskAI}
            disabled={isLoading}
            className={`glow-btn w-full py-3 rounded font-bold tracking-widest ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? '解析中... (等候專家決策)' : '送出至 Flowise 引擎'}
          </button>
        </div>

        {/* Right: AI Response */}
        <div className="glass-panel p-6 flex flex-col gap-4">
          <h3 className="text-lg text-purple font-semibold border-b border-glass-border pb-2">AI 董事會決策成果</h3>
          
          <div className="flex-1 bg-black/30 border border-glass-border rounded-lg p-4 overflow-y-auto min-h-[300px]">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4 text-purple animate-pulse">
                <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>分析運算中...</span>
              </div>
            ) : response ? (
              <div className="w-full flex justify-center">
                {(() => {
                  let parsed = null;
                  try {
                    // Try to parse if Flowise sent back JSON
                    const cleanStr = response.replace(/```json/g, "").replace(/```/g, "").trim();
                    parsed = JSON.parse(cleanStr);
                  } catch (e) {
                    // Fallback to text
                  }

                  if (parsed && typeof parsed === 'object') {
                    return (
                      <div className="w-full flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-glass-border pb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-white">{parsed.Name || '未知標的'}</span>
                            <span className="text-gray-400">({parsed.Ticker || '---'})</span>
                          </div>
                          <span className={`px-4 py-1 text-sm font-bold rounded ${parsed.Action === 'BUY' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : parsed.Action === 'SELL' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'}`}>
                            {parsed.Action || 'WAIT'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-black/40 p-3 rounded border border-glass-border">
                            <p className="text-xs text-gray-500 mb-1">目標價 (Target)</p>
                            <p className="text-lg text-cyan font-medium">{parsed.Target || '未設定'}</p>
                          </div>
                          <div className="bg-black/40 p-3 rounded border border-glass-border">
                            <p className="text-xs text-gray-500 mb-1">停損點 (StopLoss)</p>
                            <p className="text-lg text-red-400 font-medium">{parsed.StopLoss || '未設定'}</p>
                          </div>
                        </div>

                        <div className="bg-purple/10 border border-purple/30 p-4 rounded-lg mt-2">
                          <h4 className="text-purple text-sm font-semibold mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            AI 分析理由
                          </h4>
                          <p className="text-sm text-gray-300 leading-relaxed">
                            {parsed.Reason || parsed.reason || '無詳細理由'}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  // Fallback for plain text response
                  return <div className="whitespace-pre-wrap text-gray-200 text-sm leading-relaxed">{response}</div>;
                })()}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                尚未傳送任何查詢
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
