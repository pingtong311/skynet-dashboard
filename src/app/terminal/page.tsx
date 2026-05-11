'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Send, Zap, Activity, Cpu, Trash2 } from 'lucide-react';

const SESSION_KEY = 'skynet_terminal_history';
const MAX_HISTORY = 50;

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string; // 改為 string 方便序列化
  data?: any;
};

const INIT_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'system',
    content: '天網系統控制終端 (SKYNET TERMINAL v10.2) 已就緒...',
    timestamp: new Date().toISOString(),
  },
  {
    id: '2',
    role: 'system',
    content: '輸入股票代號（如 2330）進行深度 AI 分析，或輸入「分析目前盤勢」、「今日市場看法」等自然語言指令。',
    timestamp: new Date().toISOString(),
  },
];

export default function TerminalPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(INIT_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 載入 sessionStorage 歷史
  useEffect(() => {
    setMounted(true);
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed: Message[] = JSON.parse(saved);
        if (parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {}
  }, []);

  // 儲存到 sessionStorage
  useEffect(() => {
    if (!mounted) return;
    try {
      // 只保留最近 MAX_HISTORY 筆
      const toSave = messages.slice(-MAX_HISTORY);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(toSave));
    } catch {}
  }, [messages, mounted]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const clearHistory = () => {
    setMessages(INIT_MESSAGES);
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      let response;
      let responseData;

      // If the command ends with '?', route to Flowise AI Brain
      if (currentInput.endsWith('?')) {
        response = await fetch('/api/flowise', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: currentInput }),
        });
        responseData = await response.json();
      } else {
        // Otherwise route to n8n Gateway via local Proxy
        const res = await fetch('/api/terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            command: currentInput,
            chatId: 6375207034,
            Source: 'Terminal'
          }),
        });

        const data = await res.json();
        
        // Handle n8n response format (could be an array or object)
        const n8nResponse = Array.isArray(data) ? data[0] : data;
        const responseText = n8nResponse?.message || n8nResponse?.text || '報告指揮官，任務執行完畢，但未回傳具體結果。';

        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseText,
          timestamp: new Date().toISOString(),
        };

        if (!res.ok) {
          throw new Error('伺服器連線失敗');
        }

        setMessages(prev => [...prev, assistantMsg]);
        return;
      }

      if (!response.ok) {
        const errorData = responseData || {};
        throw new Error(errorData.error || '伺服器連線失敗');
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseData.text || responseData.message || '指令執行成功。',
        timestamp: new Date().toISOString(),
        data: responseData.result || null,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `⚠️ 錯誤: ${error instanceof Error ? error.message : '連線逾時，請檢查伺服器狀態。'}`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickCommands: Array<{ label: string; cmd?: string; href?: string }> = [
    { label: '盤勢分析', cmd: '分析目前盤勢' },
    { label: '台積電', cmd: '2330' },
    { label: '聯發科', cmd: '2454' },
    { label: '今日戰報', href: '/review' },
    { label: '狙擊清單', href: '/review?tab=sniper' },
    { label: '市場看法', cmd: '今日市場看法' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-6xl mx-auto py-4 gap-4">
      {/* Header Info */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-3">
          <div className="status-indicator status-online"></div>
          <span className="text-[10px] tracking-[0.2em] font-bold text-cyan">OPERATIONAL / SECURE_LINK</span>
        </div>
        <div className="text-[10px] font-mono text-gray-500">
          NODE: ORACLE_CLOUD | SESSION: {new Date().getHours()}:00
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Sidebar - Quick Actions */}
        <div className="hidden lg:flex flex-col gap-2 w-48">
          <div className="metric-label px-2 mb-1 flex items-center gap-2">
            <Cpu size={12} className="text-cyan" /> 快速指令
          </div>
          {quickCommands.map(qc => (
            <button
              key={qc.label}
              onClick={() => {
                if (qc.href) {
                  window.location.href = qc.href;
                } else if (qc.cmd) {
                  setInput(qc.cmd);
                }
              }}
              className="px-3 py-3 text-left text-[11px] font-bold glass-panel hover:border-cyan/50 hover:text-cyan hover:bg-cyan/5 transition-all group flex items-center justify-between"
            >
              {qc.label}
              {qc.href
                ? <span className="text-[9px] opacity-40 group-hover:opacity-100">→</span>
                : <Zap size={10} className="opacity-0 group-hover:opacity-100 text-yellow-400 transition-opacity" />
              }
            </button>
          ))}
          
          <div className="mt-auto p-3 glass-panel border-cyan/20 bg-cyan/5">
            <div className="text-[9px] text-cyan/70 font-mono leading-relaxed">
              指令提示：<br/>
              - 買 [代號] [口數]<br/>
              - 賣 [代號] [口數]<br/>
              - [代號] (直接查詢)
            </div>
          </div>
        </div>

        {/* Main Terminal Area */}
        <div className="flex-1 flex flex-col glass-panel overflow-hidden border-glass-border">
          {/* Terminal Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-glass-border bg-black/20">
            <span className="text-[10px] font-bold tracking-widest text-cyan/60 uppercase">SKYNET TERMINAL</span>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-red-400 transition-colors"
              title="清除歷史記錄"
            >
              <Trash2 size={12} /> 清除
            </button>
          </div>
          {/* Output Window */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-4 scrollbar-hide terminal-view"
          >
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id} 
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold tracking-wider uppercase ${
                      msg.role === 'user' ? 'text-purple' : msg.role === 'system' ? 'text-gray-500' : 'text-cyan'
                    }`}>
                      {msg.role}
                    </span>
                    <span className="text-[9px] text-gray-600">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className={`max-w-[85%] px-4 py-2 rounded-lg text-sm leading-relaxed border transition-all ${
                    msg.role === 'user' 
                      ? 'bg-purple/10 border-purple/20 text-foreground' 
                      : msg.role === 'system'
                      ? 'bg-white/5 border-white/10 text-gray-400 italic'
                      : 'bg-cyan/5 border-cyan/20 text-foreground glow-text-cyan'
                  }`}>
                    {msg.content}
                    
                    {msg.data && (
                      <div className="mt-3 pt-3 border-t border-white/10 overflow-x-auto">
                        <pre className="text-[10px] text-cyan/80">
                          {JSON.stringify(msg.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-cyan"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse"></div>
                <span className="text-[10px] font-bold animate-pulse tracking-widest">SKYNET PROCESSING...</span>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-glass-border bg-black/20">
            <form onSubmit={handleSubmit} className="relative flex items-center">
              <span className="absolute left-3 text-cyan font-bold select-none">&gt;</span>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoFocus
                disabled={isLoading}
                placeholder="輸入指令..."
                className="w-full bg-transparent border border-glass-border rounded-md pl-8 pr-20 py-2.5 text-sm focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/20 transition-all font-mono"
              />
              <button 
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-1 px-4 py-1.5 rounded text-[10px] font-bold tracking-widest uppercase transition-all duration-200 text-cyan bg-cyan/10 hover:bg-cyan/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                EXECUTE
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
