
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Copy, Check, Terminal, Wifi } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, AssistantState } from '../types';

interface ChatLogProps {
  history: ChatMessage[];
  state: AssistantState;
  transcript: string;
  onMicClick: () => void;
  onSendMessage: (msg: string) => void;
  theme?: 'dark' | 'light';
}

const CodeBlock = ({ children, inline, theme }: { children?: React.ReactNode; inline?: boolean; theme?: 'dark' | 'light' }) => {
  const [copied, setCopied] = useState(false);
  
  const extractText = (node: any): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (node?.props?.children) return extractText(node.props.children);
    return '';
  };

  const codeString = children ? extractText(children).replace(/\n$/, '') : '';

  const handleCopy = () => {
    if (!codeString) return;
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!children) return null;

  if (inline) {
    return (
      <code className={`px-1.5 py-0.5 rounded font-mono text-[10px] border transition-colors ${
        theme === 'dark' ? 'bg-cyan-950/50 text-cyan-300 border-cyan-500/10' : 'bg-cyan-100/50 text-cyan-800 border-cyan-200'
      }`}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative my-4 group">
      <div className={`absolute -top-3 left-2 flex items-center gap-1.5 px-2 py-0.5 border rounded text-[8px] font-orbitron z-10 shadow-lg transition-colors ${
        theme === 'dark' ? 'bg-slate-900 border-cyan-500/30 text-cyan-400' : 'bg-white border-cyan-700/20 text-cyan-800'
      }`}>
        <Terminal size={10} />
        <span>SOURCE_DATA</span>
      </div>
      <pre className={`p-4 pt-5 rounded-lg overflow-x-auto custom-scrollbar shadow-inner border transition-colors ${
        theme === 'dark' ? 'bg-black/80 border-cyan-500/20' : 'bg-slate-50 border-cyan-700/10'
      }`}>
        <code className={`text-[10px] font-mono leading-relaxed block whitespace-pre transition-colors ${
          theme === 'dark' ? 'text-cyan-100' : 'text-cyan-900'
        }`}>
          {children}
        </code>
      </pre>
    </div>
  );
};

const ChatLog: React.FC<ChatLogProps> = ({ history, state, transcript, onMicClick, onSendMessage, theme = 'dark' }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

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
  const displayValue = isListening ? transcript : input;

  return (
    <div className="fixed left-8 top-1/2 -translate-y-1/2 w-96 h-[60vh] z-30 pointer-events-none">
      <div className={`flex flex-col h-full backdrop-blur-sm border border-cyan-500/10 pointer-events-auto overflow-hidden relative shadow-2xl transition-all duration-700 ${
        theme === 'dark' ? 'bg-slate-950/60' : 'bg-white/80'
      }`}>
        
        {/* Terminal Header - Matches Screenshot */}
        <div className={`flex items-center justify-between p-4 border-b transition-colors ${
          theme === 'dark' ? 'border-cyan-500/20 bg-slate-900/40' : 'border-cyan-700/10 bg-cyan-50/50'
        }`}>
          <div className="flex items-center gap-2">
            <Wifi size={14} className={theme === 'dark' ? 'text-cyan-400' : 'text-cyan-700'} />
            <div className="flex flex-col">
              <span className={`text-[11px] font-orbitron tracking-widest transition-colors ${
                theme === 'dark' ? 'text-cyan-400' : 'text-cyan-800'
              }`}>
                UPLINK_STREAM // V4.0
              </span>
              <span className={`text-[8px] font-share-tech opacity-40 ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-900'}`}>SECURE_CHANNEL_ACTIVE</span>
            </div>
          </div>
          <div className="flex gap-2">
            <div className={`w-2 h-2 rounded-full ${isThinking ? 'bg-indigo-500 animate-pulse' : 'bg-slate-700'}`} />
            <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-cyan-400 animate-ping' : 'bg-slate-700'}`} />
          </div>
        </div>

        {/* Scrollable Message History */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-6 p-6 scrollbar-thin custom-scrollbar"
        >
          <AnimatePresence initial={false}>
            {history.map((msg, i) => (
              <motion.div
                key={`${msg.timestamp}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`relative px-4 py-3 rounded transition-colors ${
                  msg.role === 'user' 
                    ? (theme === 'dark' ? 'bg-cyan-500/5 border border-cyan-500/10' : 'bg-slate-100 border border-slate-200') 
                    : (theme === 'dark' ? 'bg-pink-500/10 border-l-[3px] border-pink-500/60' : 'bg-pink-50 border-l-[3px] border-pink-600/40')
                }`}
              >
                <div className={`text-[12px] leading-relaxed font-share-tech transition-colors ${
                  msg.role === 'user' 
                    ? (theme === 'dark' ? 'text-slate-300' : 'text-slate-800') 
                    : (theme === 'dark' ? 'text-slate-100' : 'text-cyan-900')
                }`}>
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="leading-relaxed">{children}</p>,
                      code: ({ node, className, children, ...props }: any) => {
                        const isInline = !className?.includes('language-');
                        return <CodeBlock inline={isInline} children={children} theme={theme} />;
                      },
                      strong: ({ children }) => <strong className="font-bold text-cyan-400">{children}</strong>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Command Input Area - Matches Screenshot Mic Button Layout */}
        <div className="p-6 pt-0 mt-auto">
          <form onSubmit={handleSubmit} className="relative flex items-end gap-3">
            <div className="flex-1 relative">
              <input 
                type="text"
                value={displayValue}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Input custom command"
                disabled={isThinking}
                readOnly={isListening}
                className={`w-full h-12 border rounded px-4 py-2 text-[12px] font-share-tech transition-all disabled:opacity-50 ${
                  isListening 
                    ? (theme === 'dark' ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5' : 'text-cyan-800 border-cyan-600 bg-cyan-50') 
                    : (theme === 'dark' ? 'bg-slate-900/60 border-cyan-500/20 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900')
                }`}
              />
            </div>
            
            {/* Circular Mic Button Positioned Floatingly */}
            <button 
              type="button"
              onClick={onMicClick}
              className={`flex-shrink-0 w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-300 ${
                isListening 
                  ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)] scale-110' 
                  : 'bg-slate-900/80 border-cyan-500/30 text-cyan-400 hover:border-cyan-400'
              }`}
            >
              <Mic size={20} className={isListening ? 'text-white' : ''} />
            </button>
          </form>
          
          <div className="flex justify-between items-center mt-4">
            <div className="flex flex-col">
              <span className={`text-[8px] font-orbitron tracking-widest transition-colors ${theme === 'dark' ? 'text-cyan-500/40' : 'text-cyan-800/50'}`}>
                ENCRYPTED_UPLINK
              </span>
              <span className={`text-[7px] font-mono opacity-20 ${theme === 'dark' ? 'text-cyan-600' : 'text-cyan-900'}`}>NODE_TX: 0x7F2A...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatLog;
