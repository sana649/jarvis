
import React, { useState, useEffect, useRef } from 'react';
import JarvisOrb from './components/JarvisOrb';
import HUD from './components/HUD';
import ChatLog from './components/ChatLog';
import { AssistantState, ChatMessage } from './types';
import { getGeminiResponse, getGeminiSpeech } from './services/gemini';
import { decodeBase64, decodeAudioData, createAudioContext, playBeep } from './services/audio';

const STORAGE_KEY = 'jarvis_history_v4';
const THEME_KEY = 'jarvis_theme';

const App: React.FC = () => {
  const [state, setState] = useState<AssistantState>('IDLE');
  const [transcript, setTranscript] = useState<string>('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isAwake, setIsAwake] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  const stateRef = useRef<AssistantState>('IDLE');
  const isAwakeRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeAudioSource = useRef<AudioBufferSourceNode | null>(null);
  const wakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isManuallyStoppingRef = useRef<boolean>(false);
  const hasDetectedSpeechThisTurn = useRef<boolean>(false);

  // Persistence: Load history and theme on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to recover terminal history.");
      }
    }

    const savedTheme = localStorage.getItem(THEME_KEY) as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
    }

    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Apply theme class to body
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Persistence: Save history whenever it changes
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }
  }, [history]);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { isAwakeRef.current = isAwake; }, [isAwake]);

  useEffect(() => {
    return () => {
      isManuallyStoppingRef.current = true;
      if (activeAudioSource.current) {
        try { activeAudioSource.current.stop(); } catch (e) {}
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (wakeTimeoutRef.current) clearTimeout(wakeTimeoutRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleStopVoice = () => {
    if (activeAudioSource.current) {
      try { activeAudioSource.current.stop(); } catch (e) {}
      activeAudioSource.current = null;
    }
    window.speechSynthesis.cancel();
    
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    setIsPaused(false);
    setState('IDLE');
    setTranscript('');
    setIsAwake(false);
  };

  const handleTogglePauseVoice = async () => {
    if (window.speechSynthesis.speaking) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
      return;
    }

    if (!audioContextRef.current) return;
    if (audioContextRef.current.state === 'running') {
      await audioContextRef.current.suspend();
      setIsPaused(true);
    } else if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
      setIsPaused(false);
    }
  };

  const speakWithFallback = (text: string) => {
    console.log("Switching to Browser Neural Vocalization (Fallback)...");
    setState('SPEAKING');
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes('en-GB') && v.name.toLowerCase().includes('male')) 
                         || voices.find(v => v.lang.includes('en-GB'))
                         || voices[0];
    
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 1.0;
    utterance.pitch = 0.9;
    
    utterance.onend = () => {
      setState('IDLE');
      setTranscript('');
      setIsAwake(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.error("Local vocalization error:", e);
      setState('IDLE');
      setIsAwake(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const playResponse = async (text: string) => {
    if (!text || text.trim().length === 0) {
      setState('IDLE');
      setIsAwake(false);
      return;
    }

    if (!navigator.onLine) {
      speakWithFallback(text);
      return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = createAudioContext();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      setIsPaused(false);
      
      const audioData = await getGeminiSpeech(text);
      
      if (audioData) {
        if (activeAudioSource.current) {
          try { activeAudioSource.current.stop(); } catch(e) {}
        }

        setState('SPEAKING');
        const buffer = await decodeAudioData(decodeBase64(audioData), audioContextRef.current);
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        
        source.onended = () => {
          if (activeAudioSource.current === source) {
            setState('IDLE');
            setTranscript('');
            setIsAwake(false);
            activeAudioSource.current = null;
            setIsPaused(false);
          }
        };

        source.start();
        activeAudioSource.current = source;
      } else {
        speakWithFallback(text);
      }
    } catch (err: any) {
      const isQuotaError = err?.status === 429 || err?.error?.code === 429;
      if (isQuotaError) {
        console.warn('Gemini TTS Quota Exhausted. Using Browser Fallback.');
        speakWithFallback(text);
      } else {
        console.error('Vocal projection failed:', err);
        speakWithFallback(text);
      }
    }
  };

  const processAICommand = async (command: string) => {
    if (!command || command.trim().length < 2) return;
    
    if (!navigator.onLine) {
      const offlineMsg: ChatMessage = { role: 'assistant', content: "I am sorry, user. Neural link requires an active uplink to process complex commands. Connection lost.", timestamp: Date.now() };
      setHistory(prev => [...prev, { role: 'user', content: command, timestamp: Date.now() }, offlineMsg]);
      speakWithFallback(offlineMsg.content);
      return;
    }

    if (wakeTimeoutRef.current) {
      clearTimeout(wakeTimeoutRef.current);
      wakeTimeoutRef.current = null;
    }

    if (activeAudioSource.current) {
      try { activeAudioSource.current.stop(); } catch(e) {}
      activeAudioSource.current = null;
    }

    setState('THINKING');
    setTranscript(`Processing: "${command}"`);
    
    const newUserMsg: ChatMessage = { role: 'user', content: command, timestamp: Date.now() };
    setHistory(prev => [...prev, newUserMsg]);

    try {
      const response = await getGeminiResponse(command, history);
      const assistantMsg: ChatMessage = { 
        role: 'assistant', 
        content: response.text, 
        timestamp: Date.now(),
        sources: response.sources
      };
      setHistory(prev => [...prev, assistantMsg]);
      await playResponse(response.text);
    } catch (err: any) {
      console.error('Logic core error:', err);
      setState('ERROR');
      setTranscript('Uplink Interrupted.');
      setTimeout(() => {
        setState('IDLE');
        setIsAwake(false);
      }, 4000);
    }
  };

  const handleFinalTranscript = (final: string) => {
    const text = final.toLowerCase().trim();
    if (!text) return;

    if (audioContextRef.current) {
      playBeep(audioContextRef.current, 'end');
    }
    hasDetectedSpeechThisTurn.current = false;

    if (!isAwakeRef.current) {
      if (text.includes('jarvis') || text.includes('hey jarvis')) {
        setIsAwake(true);
        setState('LISTENING');
        
        let command = text.split(/jarvis/i)[1]?.trim() || '';
        
        if (command.length > 2) {
          processAICommand(command);
        } else {
          setTranscript('Yes, user?');
          if (wakeTimeoutRef.current) clearTimeout(wakeTimeoutRef.current);
          wakeTimeoutRef.current = setTimeout(() => {
            if (stateRef.current === 'LISTENING') {
              setState('IDLE');
              setIsAwake(false);
              setTranscript('');
            }
          }, 6000);
        }
      }
    } else {
      if (stateRef.current === 'LISTENING') {
        const cleanCommand = text.replace(/^(hey\s+)?jarvis[,?\s]*/i, '').trim();
        if (cleanCommand.length > 1) {
          processAICommand(cleanCommand);
        }
      }
    }
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setState('ERROR');
      setTranscript('Unsupported Browser.');
      return;
    }

    const initRecognition = () => {
      if (isManuallyStoppingRef.current) return;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            handleFinalTranscript(result[0].transcript);
          } else {
            interimTranscript += result[0].transcript;
            if (isAwakeRef.current || interimTranscript.toLowerCase().includes('jarvis')) {
              setTranscript(interimTranscript);
              
              if (isAwakeRef.current && !hasDetectedSpeechThisTurn.current && interimTranscript.trim().length > 0) {
                hasDetectedSpeechThisTurn.current = true;
                if (audioContextRef.current) {
                  playBeep(audioContextRef.current, 'detect');
                }
              }
            }
          }
        }
      };

      recognition.onerror = (event: any) => {
        const error = event.error;
        if (error === 'no-speech' || error === 'audio-capture' || error === 'aborted') {
          return;
        }
        if (error === 'not-allowed') {
          setState('ERROR');
          setTranscript('Mic access denied.');
        }
      };

      recognition.onend = () => {
        if (stateRef.current !== 'ERROR' && !isManuallyStoppingRef.current) {
          setTimeout(initRecognition, 250);
        }
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (e) {}
    };

    initRecognition();

    return () => {
      isManuallyStoppingRef.current = true;
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  const handleMicToggle = () => {
    if (state === 'LISTENING') {
      setState('IDLE');
      setIsAwake(false);
      setTranscript('');
      if (wakeTimeoutRef.current) clearTimeout(wakeTimeoutRef.current);
      if (audioContextRef.current) {
        playBeep(audioContextRef.current, 'end');
      }
    } else {
      if (!audioContextRef.current) {
        audioContextRef.current = createAudioContext();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      playBeep(audioContextRef.current, 'start');

      if (activeAudioSource.current) {
        try { activeAudioSource.current.stop(); } catch(e) {}
        activeAudioSource.current = null;
      }
      window.speechSynthesis.cancel();
      
      setIsAwake(true);
      setState('LISTENING');
      setTranscript('');
      hasDetectedSpeechThisTurn.current = false;
      
      if (wakeTimeoutRef.current) clearTimeout(wakeTimeoutRef.current);
      wakeTimeoutRef.current = setTimeout(() => {
        if (stateRef.current === 'LISTENING') {
          setState('IDLE');
          setIsAwake(false);
          setTranscript('');
        }
      }, 15000);
    }
  };

  const clearHistory = () => {
    if (confirm("Initiate memory wipe? This will erase all stored data points.")) {
      setHistory([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className={`relative w-screen h-screen flex flex-col items-center justify-center transition-colors duration-700 ${theme === 'dark' ? 'bg-slate-950 text-cyan-400' : 'bg-slate-50 text-cyan-700'} overflow-hidden`}>
      <div className={`absolute inset-0 z-0 opacity-20 pointer-events-none transition-colors duration-700 ${theme === 'dark' ? 'text-cyan-500' : 'text-cyan-600'}`}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-current opacity-20 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-current opacity-10 rounded-full" />
      </div>

      <JarvisOrb state={state} theme={theme} />
      
      <div className="flex flex-col items-center gap-4 mt-12 z-30">
        <button 
          onClick={handleMicToggle}
          className="group flex flex-col items-center gap-2 pointer-events-auto"
        >
          <span className={`text-[10px] uppercase tracking-[0.3em] font-orbitron transition-colors ${theme === 'dark' ? 'text-cyan-500/60 group-hover:text-cyan-400' : 'text-cyan-700/60 group-hover:text-cyan-600'}`}>
            {state === 'ERROR' ? 'Matrix Error' : isAwake ? 'Active Uplink' : 'Manual Signal'}
          </span>
          <div className={`w-8 h-1 rounded-full overflow-hidden transition-colors ${theme === 'dark' ? 'bg-cyan-500/20' : 'bg-cyan-700/10'}`}>
            <div className={`h-full transition-all duration-300 ${state === 'ERROR' ? 'bg-red-500 w-full' : isAwake ? (theme === 'dark' ? 'bg-cyan-500 w-full' : 'bg-cyan-600 w-full') : 'bg-cyan-500 w-0'}`} />
          </div>
        </button>

        {history.length > 0 && (
          <button 
            onClick={clearHistory}
            className={`text-[8px] font-orbitron uppercase tracking-widest transition-colors ${theme === 'dark' ? 'text-red-500/40 hover:text-red-400' : 'text-red-600/40 hover:text-red-500'} pointer-events-auto`}
          >
            [ Memory Wipe ]
          </button>
        )}
      </div>

      <ChatLog 
        history={history} 
        state={state} 
        transcript={transcript}
        onMicClick={handleMicToggle} 
        onSendMessage={processAICommand}
        theme={theme}
      />
      
      <HUD 
        state={state} 
        transcript={transcript} 
        history={history} 
        isPaused={isPaused}
        onStopVoice={handleStopVoice}
        onTogglePauseVoice={handleTogglePauseVoice}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      
      <div className="absolute bottom-4 left-4 text-[8px] opacity-30 font-orbitron space-y-1">
        <div>SYS_OS: JARVIS_FLASH_OS</div>
        <div>UPLINK: {isOnline ? 'HYPER_SPEED' : 'LINK_LOST'}</div>
        <div>PERSISTENCE: {history.length > 0 ? 'SYNCHRONIZED' : 'STANDBY'}</div>
      </div>
    </div>
  );
};

export default App;
