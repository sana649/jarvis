
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AssistantState } from '../types';

interface JarvisOrbProps {
  state: AssistantState;
}

const JarvisOrb: React.FC<JarvisOrbProps> = ({ state }) => {
  const getOrbColor = () => {
    switch (state) {
      case 'LISTENING': return '#22d3ee'; // Cyan
      case 'THINKING': return '#818cf8'; // Indigo
      case 'SPEAKING': return '#f472b6'; // Pink
      case 'ERROR': return '#ef4444'; // Red
      default: return '#06b6d4'; // Default Cyan
    }
  };

  const orbColor = getOrbColor();

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Outer Rotating Rings */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute w-full h-full border-2 border-cyan-500/20 rounded-full border-dashed"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute w-[80%] h-[80%] border border-cyan-400/30 rounded-full border-double"
      />

      {/* Glow Effect */}
      <motion.div
        animate={{
          scale: state === 'LISTENING' ? [1, 1.2, 1] : [1, 1.1, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute w-40 h-40 rounded-full blur-3xl"
        style={{ backgroundColor: orbColor }}
      />

      {/* Inner Core */}
      <motion.div
        animate={{
          scale: state === 'THINKING' ? [1, 0.9, 1.1, 1] : 1,
          boxShadow: `0 0 30px ${orbColor}88`,
        }}
        transition={{ duration: 1, repeat: state === 'THINKING' ? Infinity : 0 }}
        className="relative w-32 h-32 rounded-full flex items-center justify-center overflow-hidden border-2"
        style={{ borderColor: orbColor }}
      >
        {/* Core Detail Grid */}
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-20">
          {[...Array(16)].map((_, i) => (
            <div key={i} className="border-[0.5px] border-cyan-400" />
          ))}
        </div>

        {/* Pulsing Center */}
        <motion.div
          animate={{
            scale: state === 'SPEAKING' ? [1, 1.4, 1] : [1, 1.05, 1],
            opacity: state === 'IDLE' ? 0.5 : 1
          }}
          transition={{ duration: state === 'SPEAKING' ? 0.3 : 2, repeat: Infinity }}
          className="w-12 h-12 rounded-full shadow-inner"
          style={{ backgroundColor: orbColor }}
        />
      </motion.div>

      {/* Decorative HUD Elements */}
      <AnimatePresence>
        {state !== 'IDLE' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -inset-8 pointer-events-none"
          >
            <svg viewBox="0 0 100 100" className="w-full h-full text-cyan-500/40">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="5 5" />
              <path d="M 50 2 L 50 10 M 98 50 L 90 50 M 50 98 L 50 90 M 2 50 L 10 50" stroke="currentColor" strokeWidth="1" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JarvisOrb;
