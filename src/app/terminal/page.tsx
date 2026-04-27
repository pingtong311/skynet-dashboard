'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Send, Zap, Activity, Cpu, ShieldCheck } from 'lucide-react';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  data?: any;
};

export default function TerminalPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: '天網系統控制終端 (SKYNET TERMINAL v10.2) 已就緒...',
      timestamp: new Date(),
    },
    {
      id: '2',
      role: 'system',
      content: '輸入「查 2330」進行深度量化分析，或輸入「買/賣 [標的]」啟動記帳流程。',
      timestamp: new Date(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // Use environment variables for webhook URL
      const WEBHOOK_URL = process.env.NEXT_PUBLIC_SKYNET_WEBHOOK_URL || 'https://primary-production-22702.up.railway.app/webhook/skynet-terminal-gateway';
      
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
          timestamp: new Date(),
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
        timestamp: new Date(),
        data: responseData.result || null,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `⚠️ 錯誤: ${error instanceof Error ? error.message : '連線逾時，請檢查伺服器狀態。'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickCommands = [
    { label: '市場分析', cmd: '分析目前盤勢' },
    { label: '查詢台積電', cmd: '查 2330' },
    { label: '今日戰報', cmd: '戰報' },
    { label: '系統狀態', cmd: 'status' },
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
          NODE: RAILWAY_PRIME | SESSION: {new Date().getHours()}:00
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
              onClick={() => { setInput(qc.cmd); }}
              className="px-3 py-3 text-left text-[11px] font-bold glass-panel hover:border-cyan/50 hover:text-cyan hover:bg-cyan/5 transition-all group flex items-center justify-between"
            >
              {qc.label}
              <Zap size={10} className="opacity-0 group-hover:opacity-100 text-yellow-400 transition-opacity" />
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
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
