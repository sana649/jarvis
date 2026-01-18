
import React, { useState, useEffect, useRef } from 'react';
import JarvisOrb from './components/JarvisOrb';
import HUD from './components/HUD';
import ChatLog from './components/ChatLog';
import { AssistantState, ChatMessage } from './types';
import { getGeminiResponse, getGeminiSpeech } from './services/gemini';
import { decodeBase64, decodeAudioData, createAudioContext } from './services/audio';

const App: React.FC = () => {
  const [state, setState] = useState<AssistantState>('IDLE');
  const [transcript, setTranscript] = useState<string>('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isAwake, setIsAwake] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const stateRef = useRef<AssistantState>('IDLE');
  const isAwakeRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeAudioSource = useRef<AudioBufferSourceNode | null>(null);
  // Fix: Use ReturnType<typeof setTimeout> instead of NodeJS.Timeout to avoid namespace errors in browser environment
  const wakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { isAwakeRef.current = isAwake; }, [isAwake]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (activeAudioSource.current) {
        try { activeAudioSource.current.stop(); } catch (e) {}
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (wakeTimeoutRef.current) clearTimeout(wakeTimeoutRef.current);
    };
  }, []);

  const handleStopVoice = () => {
    if (activeAudioSource.current) {
      try { activeAudioSource.current.stop(); } catch (e) {}
      activeAudioSource.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    setIsPaused(false);
    setState('IDLE');
    setTranscript('');
    setIsAwake(false);
  };

  const handleTogglePauseVoice = async () => {
    if (!audioContextRef.current) return;
    if (audioContextRef.current.state === 'running') {
      await audioContextRef.current.suspend();
      setIsPaused(true);
    } else if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
      setIsPaused(false);
    }
  };

  const playResponse = async (text: string) => {
    if (!text || text.trim().length === 0) {
      setState('IDLE');
      setIsAwake(false);
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
        setState('IDLE');
        setIsAwake(false);
      }
    } catch (err: any) {
      console.error('Vocal projection failed:', err);
      setState('ERROR');
      setTranscript('Vocal matrix critical failure.');
      setTimeout(() => {
        setState('IDLE');
        setIsAwake(false);
        setTranscript('');
      }, 5000);
    }
  };

  const processAICommand = async (command: string) => {
    if (!command || command.trim().length < 2) return;
    
    // Clear wake timeout if we are actually processing a command
    if (wakeTimeoutRef.current) {
      clearTimeout(wakeTimeoutRef.current);
      wakeTimeoutRef.current = null;
    }

    // Stop current speaking if a new command comes in
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

    console.log('JARVIS Heard:', text);

    // If not awake, look for wake word
    if (!isAwakeRef.current) {
      if (text.includes('jarvis') || text.includes('hey jarvis')) {
        setIsAwake(true);
        setState('LISTENING');
        
        // Check if there is a command following the wake word in the same transcript
        let command = text.split(/jarvis/i)[1]?.trim() || '';
        
        if (command.length > 2) {
          processAICommand(command);
        } else {
          setTranscript('Yes, user?');
          // Set a timeout to go back to sleep if no follow-up
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
      // If already awake and we're just listening for the command
      if (stateRef.current === 'LISTENING') {
        // Strip wake word if repeated
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

    const startRecognition = () => {
      try {
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
              // Only show interim if we are actually awake or listening
              if (isAwakeRef.current || interimTranscript.toLowerCase().includes('jarvis')) {
                setTranscript(interimTranscript);
              }
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Recognition error:', event.error);
          if (event.error === 'no-speech') return;
          if (event.error === 'not-allowed') {
            setState('ERROR');
            setTranscript('Mic access denied.');
            return;
          }
        };

        recognition.onend = () => {
          // Restart recognition unless it's a critical error
          if (stateRef.current !== 'ERROR') {
            setTimeout(() => {
              try { recognition.start(); } catch (e) {}
            }, 100);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        console.error('Failed to initialize recognition:', e);
      }
    };

    startRecognition();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleManualActivation = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext();
    }
    
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (state === 'IDLE' || state === 'SPEAKING' || state === 'ERROR') {
      if (activeAudioSource.current) {
        try { activeAudioSource.current.stop(); } catch(e) {}
        activeAudioSource.current = null;
      }
      setIsAwake(true);
      setState('LISTENING');
      setTranscript('Listening...');
      
      // Auto-sleep timer for manual activation too
      if (wakeTimeoutRef.current) clearTimeout(wakeTimeoutRef.current);
      wakeTimeoutRef.current = setTimeout(() => {
        if (stateRef.current === 'LISTENING') {
          setState('IDLE');
          setIsAwake(false);
          setTranscript('');
        }
      }, 8000);
    }
  };

  return (
    <div className="relative w-screen h-screen flex flex-col items-center justify-center bg-slate-950 text-cyan-400 overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-cyan-500/20 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-cyan-500/10 rounded-full" />
      </div>

      <JarvisOrb state={state} />
      
      <button 
        onClick={handleManualActivation}
        className="mt-12 z-30 group flex flex-col items-center gap-2 pointer-events-auto"
      >
        <span className="text-[10px] uppercase tracking-[0.3em] font-orbitron text-cyan-500/60 group-hover:text-cyan-400 transition-colors">
          {state === 'ERROR' ? 'Matrix Error' : isAwake ? 'Listening Mode' : 'Manual Signal'}
        </span>
        <div className="w-8 h-1 bg-cyan-500/20 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-300 ${state === 'ERROR' ? 'bg-red-500 w-full' : isAwake ? 'bg-cyan-500 w-full' : 'bg-cyan-500 w-0'}`} />
        </div>
      </button>

      <ChatLog 
        history={history} 
        state={state} 
        onMicClick={handleManualActivation} 
        onSendMessage={processAICommand}
      />
      
      <HUD 
        state={state} 
        transcript={transcript} 
        history={history} 
        isPaused={isPaused}
        onStopVoice={handleStopVoice}
        onTogglePauseVoice={handleTogglePauseVoice}
      />
      
      <div className="absolute bottom-4 left-4 text-[8px] opacity-30 font-orbitron space-y-1">
        <div>SYS_OS: JARVIS_FLASH_OS</div>
        <div>UPLINK: HYPER_SPEED</div>
        <div>MIC_STATUS: ACTIVE</div>
      </div>
    </div>
  );
};

export default App;
