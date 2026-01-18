
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send } from 'lucide-react';
import { ChatMessage, AssistantState } from '../types';

interface ChatLogProps {
  history: ChatMessage[];
  state: AssistantState;
  onMicClick: () => void;
  onSendMessage: (msg: string) => void;
}

const ChatLog: React.FC<ChatLogProps> = ({ history, state, onMicClick, onSendMessage }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && state !== 'THINKING') {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const isListening = state === 'LISTENING';
  const isThinking = state === 'THINKING';

  return (
    <div className="fixed left-8 top-1/2 -translate-y-1/2 w-80 h-[65vh] z-30 pointer-events-none">
      <div className="flex flex-col h-full bg-slate-900/40 backdrop-blur-md border-l border-cyan-500/30 pointer-events-auto overflow-hidden relative shadow-[0_0_20px_rgba(6,182,212,0.1)]">
        
        {/* Terminal Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-500/20">
          <div className="flex flex-col">
            <span className="text-[10px] font-orbitron tracking-tighter text-cyan-400/60 uppercase">
              Comm_Log // Session_01
            </span>
            <span className="text-[8px] text-cyan-500/30">Direct_Neural_Link</span>
          </div>
          <div className="flex gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isThinking ? 'bg-indigo-500 animate-pulse' : 'bg-cyan-500/20'}`} />
            <div className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-cyan-400 animate-ping' : 'bg-cyan-500/20'}`} />
          </div>
        </div>

        {/* Scrollable Container */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-6 p-4 pr-2 scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent custom-scrollbar"
        >
          <AnimatePresence initial={false}>
            {history.length === 0 ? (
              <div className="text-[10px] text-cyan-500/30 italic font-share-tech">
                No active data streams...
              </div>
            ) : (
              history.map((msg, i) => (
                <motion.div
                  key={`${msg.timestamp}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`relative pl-4 border-l ${
                    msg.role === 'user' ? 'border-cyan-500/50' : 'border-pink-500/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-orbitron ${
                      msg.role === 'user' ? 'text-cyan-400' : 'text-pink-400'
                    }`}>
                      {msg.role === 'user' ? 'USER' : 'JARVIS'}
                    </span>
                    <span className="text-[8px] text-slate-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={`text-[11px] leading-relaxed font-share-tech ${
                    msg.role === 'user' ? 'text-slate-300' : 'text-cyan-100'
                  }`}>
                    {msg.content}
                  </div>
                  
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {msg.sources.slice(0, 2).map((source, idx) => (
                        <a 
                          key={idx}
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[8px] text-cyan-600 hover:text-cyan-400 underline truncate max-w-[150px]"
                        >
                          Source [{idx + 1}]
                        </a>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Command Input Area */}
        <div className="p-4 bg-slate-950/50 border-t border-cyan-500/20">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="relative group">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Listening..." : "Enter command..."}
                disabled={isThinking}
                className="w-full bg-cyan-900/10 border border-cyan-500/30 rounded px-3 py-2 text-[11px] font-share-tech text-cyan-100 placeholder:text-cyan-500/40 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(34,211,238,0.2)] transition-all disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isThinking}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-500 hover:text-cyan-400 disabled:opacity-0 transition-all"
              >
                <Send size={14} />
              </button>
            </div>

            {/* Mic Button Row */}
            <div className="flex items-center justify-between">
               <span className="text-[8px] text-cyan-500/40 font-orbitron uppercase tracking-widest">
                Interface_v4.2
               </span>
               <button 
                type="button"
                onClick={onMicClick}
                className={`p-2 rounded-full transition-all duration-300 border ${
                  isListening 
                    ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
                    : 'bg-transparent border-cyan-500/20 hover:border-cyan-500/50'
                }`}
                title="Toggle Voice Command"
              >
                {isListening ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Mic size={16} className="text-cyan-400" />
                  </motion.div>
                ) : (
                  <Mic size={16} className="text-cyan-500/60" />
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(transparent_50%,rgba(0,255,255,0.1)_50%)] bg-[length:100%_4px]" />
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(6, 182, 212, 0.5);
        }
      `}</style>
    </div>
  );
};

export default ChatLog;
