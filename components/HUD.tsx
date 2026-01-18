
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Battery, Cpu, Wifi, MessageSquare, AlertTriangle, Square, Pause, Play, Radio, WifiOff, Sun, Moon, Settings } from 'lucide-react';
import { AssistantState, ChatMessage } from '../types';

interface HUDProps {
  state: AssistantState;
  transcript: string;
  history: ChatMessage[];
  isPaused?: boolean;
  onStopVoice?: () => void;
  onTogglePauseVoice?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

const HUD: React.FC<HUDProps> = ({ 
  state, 
  transcript, 
  history, 
  isPaused = false,
  onStopVoice,
  onTogglePauseVoice,
  theme = 'dark',
  onToggleTheme
}) => {
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }));
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })), 1000);
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const isError = state === 'ERROR' || !isOnline;
  const isListening = state === 'LISTENING';

  const textColor = theme === 'dark' ? 'text-cyan-400/80' : 'text-cyan-800/80';
  const iconColor = theme === 'dark' ? 'text-cyan-400' : 'text-cyan-700';

  return (
    <div className={`fixed inset-0 pointer-events-none p-8 font-orbitron uppercase text-xs z-20 transition-colors duration-700 ${textColor}`}>
      
      {/* Top Left: System Stats - Matches Screenshot Labels */}
      <div className="absolute top-10 left-10 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="p-1 border border-current rounded-sm">
            <Settings size={14} className={iconColor} />
          </div>
          <span className="tracking-widest">CORE: STABLE</span>
        </div>
        <div className="flex items-center gap-3">
          <Activity size={18} className={iconColor} />
          <span className="tracking-widest">SYNC: 99.8%</span>
        </div>
      </div>

      {/* Top Right: Time & Battery - Matches Screenshot */}
      <div className="absolute top-10 right-10 text-right flex flex-col gap-2 items-end">
        <div className="text-3xl font-bold tracking-tighter text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
          {time}
        </div>
        <div className="flex items-center justify-end gap-2 mt-1 opacity-60">
          <span>BATTERY: 84%</span>
          <div className="relative w-4 h-6 border border-current rounded-sm flex items-end p-[1px]">
            <div className="w-full h-[84%] bg-current rounded-sm" />
            <div className="absolute -top-1 left-1 w-2 h-1 border-t border-x border-current" />
          </div>
        </div>
      </div>

      {/* Bottom Center: Unified Transcript & Status Display */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-3xl text-center px-4">
        <div className={`backdrop-blur-md border border-cyan-500/20 p-6 rounded-sm min-h-[100px] flex flex-col items-center justify-center pointer-events-auto transition-all duration-500 shadow-[0_0_40px_rgba(0,0,0,0.5)] ${
          isError && !isOnline ? 'bg-red-950/20 border-red-500/40 text-red-400' : 'bg-slate-900/40'
        }`}>
          <span className="font-share-tech tracking-widest text-lg transition-all">
            {isPaused 
              ? '[ AUDIO SUSPENDED ]' 
              : transcript 
                ? transcript.toUpperCase() 
                : (state === 'IDLE' ? 'VOCAL PASSIVE: SAY "JARVIS"' : 'SYSTEM PROCESSING...')}
          </span>
          <div className="mt-2 text-[10px] tracking-[0.4em] opacity-40">
            {state === 'IDLE' ? 'MANUAL SIGNAL' : `MODE: ${state}`}
          </div>
        </div>
      </div>

      {/* Bottom Left: Stacked Identifiers - Matches Screenshot */}
      <div className="absolute bottom-10 left-10 flex flex-col gap-1 opacity-40 font-orbitron text-[10px] tracking-widest">
        <div>SYS_OS: JARVIS_FLASH_OS</div>
        <div className="flex items-center gap-2">
          UPLINK: <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-cyan-400 shadow-[0_0_5px_cyan]' : 'bg-red-500'}`} /> {state}
        </div>
        <div>PERSISTENCE: SYNCHRONIZED</div>
      </div>

      {/* Bottom Right: Message Context */}
      <div className="absolute bottom-10 right-10 flex items-center gap-3 opacity-60">
        <MessageSquare size={18} className={iconColor} />
        <span className="tracking-widest">CONTEXT: {history.length} DATA POINTS</span>
      </div>

      {/* Theme Toggle Button - Floating and Discrete */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-auto">
        <button 
          onClick={onToggleTheme}
          className="text-[10px] tracking-[0.3em] opacity-20 hover:opacity-100 transition-opacity"
        >
          [ MEMORY WIPE ]
        </button>
      </div>

      {/* Scanline FX Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-[100] pointer-events-none opacity-20" />
      <div className="absolute inset-0 bg-[length:100%_2px] bg-[linear-gradient(transparent,rgba(0,255,255,0.05))] z-[101] pointer-events-none" />
    </div>
  );
};

export default HUD;
