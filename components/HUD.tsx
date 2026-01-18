
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Battery, Cpu, Wifi, MessageSquare, AlertTriangle, Square, Pause, Play, Radio } from 'lucide-react';
import { AssistantState, ChatMessage } from '../types';

interface HUDProps {
  state: AssistantState;
  transcript: string;
  history: ChatMessage[];
  isPaused?: boolean;
  onStopVoice?: () => void;
  onTogglePauseVoice?: () => void;
}

const HUD: React.FC<HUDProps> = ({ 
  state, 
  transcript, 
  history, 
  isPaused = false,
  onStopVoice,
  onTogglePauseVoice
}) => {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isError = state === 'ERROR';
  const isSpeaking = state === 'SPEAKING';
  const isListening = state === 'LISTENING';
  const showVoiceControls = isSpeaking || (isPaused && state === 'SPEAKING');

  return (
    <div className="fixed inset-0 pointer-events-none p-6 font-orbitron text-cyan-400/80 uppercase text-xs z-20">
      {/* Top Left: System Stats */}
      <div className="absolute top-8 left-8 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Cpu size={16} />
          <span>Core: {isError ? 'Compromised' : 'Stable'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity size={16} />
          <span>Sync: {isError ? '0.0%' : '99.8%'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Wifi size={16} />
          <span>Link: {isError ? 'Disconnected' : 'Encrypted'}</span>
        </div>
      </div>

      {/* Top Right: Time & Battery */}
      <div className="absolute top-8 right-8 text-right flex flex-col gap-2">
        <div className="text-xl font-bold tracking-widest">{time}</div>
        <div className="flex items-center justify-end gap-2">
          <span>Battery: 84%</span>
          <Battery size={16} className="rotate-90" />
        </div>
      </div>

      {/* Voice Playback Controls */}
      <AnimatePresence>
        {showVoiceControls && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-1/2 right-12 -translate-y-1/2 flex flex-col gap-4 pointer-events-auto"
          >
            <div className="flex flex-col items-center gap-3">
               <span className="text-[8px] opacity-50 font-bold tracking-widest bg-cyan-500/10 px-2 py-1 rounded">VOCAL_OUT</span>
               <button 
                onClick={onTogglePauseVoice}
                className="w-12 h-12 rounded-full border border-cyan-500/30 bg-cyan-950/40 backdrop-blur-md flex items-center justify-center text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                title={isPaused ? "Resume Output" : "Pause Output"}
              >
                {isPaused ? <Play size={22} fill="currentColor" /> : <Pause size={22} fill="currentColor" />}
              </button>
              <button 
                onClick={onStopVoice}
                className="w-12 h-12 rounded-full border border-red-500/30 bg-red-950/20 backdrop-blur-md flex items-center justify-center text-red-400 hover:bg-red-500/20 hover:border-red-400 transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                title="Stop Output"
              >
                <Square size={22} fill="currentColor" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Center: Transcript Display */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-xl text-center px-4">
        <motion.div
          key={transcript + state}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`backdrop-blur-md border p-4 rounded-lg min-h-[80px] flex flex-col items-center justify-center pointer-events-auto transition-colors duration-500 ${
            isError 
              ? 'bg-red-950/30 border-red-500/50 text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.3)]' 
              : isListening
              ? 'bg-cyan-500/10 border-cyan-400/50 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)] animate-pulse'
              : 'bg-cyan-900/20 border-cyan-500/30 text-cyan-100'
          }`}
        >
          {isError ? (
            <div className="flex items-center gap-2 mb-1 text-red-500 text-[10px] animate-pulse">
              <AlertTriangle size={12} />
              SYSTEM_CRITICAL_FAILURE
            </div>
          ) : isListening ? (
            <div className="flex items-center gap-2 mb-1 text-cyan-400 text-[10px]">
              <Radio size={12} className="animate-ping" />
              VOICE_COMMAND_ACTIVE
            </div>
          ) : null}
          
          <span className="font-share-tech tracking-normal text-sm uppercase">
            {isPaused 
              ? '[ AUDIO PAUSED ]' 
              : transcript 
                ? `HEARD: "${transcript}"` 
                : (state === 'IDLE' ? 'Vocal Passive: Say "JARVIS"' : 'System Awaiting Input...')}
          </span>
        </motion.div>
      </div>

      {/* Bottom Left: Status Indicator */}
      <div className="absolute bottom-8 left-8 flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,255,255,0.5)] ${isError ? 'bg-red-500' : isListening ? 'bg-cyan-400 animate-ping' : 'bg-cyan-500 opacity-50'}`} />
        <span className={`tracking-widest ${isError ? 'text-red-500 animate-pulse' : isListening ? 'text-cyan-400' : ''}`}>
          MODE: {state}{isPaused ? ' // SUSPENDED' : ''}
        </span>
      </div>

      {/* Bottom Right: Message Count */}
      <div className="absolute bottom-8 right-8 flex items-center gap-3">
        <MessageSquare size={16} />
        <span>Context: {history.length} Data Points</span>
      </div>
    </div>
  );
};

export default HUD;
