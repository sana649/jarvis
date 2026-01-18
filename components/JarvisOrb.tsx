
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AssistantState } from '../types';

interface JarvisOrbProps {
  state: AssistantState;
  theme?: 'dark' | 'light';
}

const JarvisOrb: React.FC<JarvisOrbProps> = ({ state, theme = 'dark' }) => {
  const getOrbColor = () => {
    switch (state) {
      case 'LISTENING': return theme === 'dark' ? '#22d3ee' : '#0891b2'; 
      case 'THINKING': return theme === 'dark' ? '#818cf8' : '#4f46e5'; 
      case 'SPEAKING': return theme === 'dark' ? '#f472b6' : '#db2777'; 
      case 'ERROR': return '#ef4444'; 
      default: return theme === 'dark' ? '#06b6d4' : '#0891b2'; 
    }
  };

  const orbColor = getOrbColor();

  return (
    <div className="relative flex items-center justify-center w-80 h-80 pointer-events-none select-none">
      {/* Outer Glow Ring */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          opacity: theme === 'dark' ? [0.1, 0.2, 0.1] : [0.05, 0.1, 0.05],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-72 h-72 rounded-full border border-cyan-500/20"
      />

      {/* Primary Glow */}
      <motion.div
        animate={{
          scale: state === 'LISTENING' ? [1, 1.1, 1] : [1, 1.05, 1],
          opacity: theme === 'dark' ? [0.3, 0.5, 0.3] : [0.1, 0.2, 0.1],
        }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute w-56 h-56 rounded-full blur-[80px]"
        style={{ backgroundColor: orbColor }}
      />

      {/* Main Core Container */}
      <motion.div
        animate={{
          scale: state === 'THINKING' ? [1, 0.95, 1.05, 1] : 1,
        }}
        transition={{ duration: 1, repeat: state === 'THINKING' ? Infinity : 0 }}
        className="relative w-40 h-40 rounded-full flex items-center justify-center overflow-hidden border border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.2)]"
        style={{ backgroundColor: `${orbColor}22` }}
      >
        {/* Solid Center Disk */}
        <motion.div 
          animate={{
            opacity: state === 'SPEAKING' ? [0.8, 1, 0.8] : [0.6, 0.8, 0.6],
            scale: state === 'SPEAKING' ? [0.95, 1.05, 0.95] : 1
          }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="absolute inset-2 rounded-full transition-colors duration-700"
          style={{ backgroundColor: orbColor }}
        />

        {/* Core Crosshair/Grid Overlay - Matches Screenshot */}
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/20" />
          <div className="absolute left-1/2 top-0 w-[1px] h-full bg-white/20" />
          <div className="absolute inset-0 grid grid-cols-4 grid-rows-4">
            {[...Array(16)].map((_, i) => (
              <div key={i} className="border-[0.5px] border-white/5" />
            ))}
          </div>
        </div>
        
        {/* Central Detail Point */}
        <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 z-10" />
      </motion.div>

      {/* HUD Circular Ornamentations */}
      <div className="absolute inset-0 pointer-events-none">
        <svg viewBox="0 0 100 100" className={`w-full h-full opacity-30 transition-colors duration-700 ${theme === 'dark' ? 'text-cyan-500' : 'text-cyan-800'}`}>
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.2" strokeDasharray="1 4" />
          <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="0.5 8" />
        </svg>
      </div>
    </div>
  );
};

export default JarvisOrb;
