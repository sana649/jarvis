
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * Exponential backoff retry utility
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 500): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isTransient = error?.status === 500 || error?.status === 429 || error?.message?.includes('fetch');
    if (retries > 0 && isTransient) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Strips markdown, emojis, and special characters that cause TTS engine instability
 */
const sanitizeForTTS = (text: string): string => {
  const cleaned = text
    .replace(/[*_#~`>]/g, '') // Remove markdown symbols
    .replace(/\[.*?\]\(.*?\)/g, '') // Remove links
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Remove Emojis
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
  
  return cleaned || "Acknowledged."; // Fallback to avoid empty TTS requests
};

/**
 * Optimized for maximum speed using gemini-3-flash and 0 thinking budget
 */
export const getGeminiResponse = async (prompt: string, history: any[] = []) => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history.slice(-4).map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] })),
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: "You are JARVIS. Respond instantly and concisely (max 15 words). Be professional and slightly witty. Use British English.",
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 } // Disabling thinking for speed
      },
    });

    const text = response.text || "Neural link unstable. Please repeat.";
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => chunk.web?.uri)
      .filter(Boolean) || [];

    return { text, sources };
  });
};

/**
 * Generates audio using gemini-2.5-flash-preview-tts
 */
export const getGeminiSpeech = async (text: string) => {
  const cleanText = sanitizeForTTS(text);
  
  return withRetry(async () => {
    // Fresh instance for clean TTS session
    const ttsAi = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
    const response = await ttsAi.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'zephyr' },
          },
        },
      },
    });

    // Iterate through parts to find the audio data (inlineData)
    const parts = response.candidates?.[0]?.content?.parts || [];
    const audioPart = parts.find(p => p.inlineData && p.inlineData.data);
    
    const base64Audio = audioPart?.inlineData?.data;
    
    if (!base64Audio) {
      console.warn("TTS Response received but no audio part found in candidates.");
      throw new Error("Audio generation empty");
    }
    
    return base64Audio;
  }, 2, 300);
};
