
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * Exponential backoff retry utility
 * Optimized to handle nested error structures often returned by GenAI SDK
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorCode = error?.status || error?.error?.code;
    const isTransient = errorCode === 429 || errorCode === 500 || error?.message?.includes('fetch');
    
    if (retries > 0 && isTransient) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Strips markdown, emojis, and special characters that cause TTS engine instability.
 * Enhanced: Removes technical symbols that create undesirable audio artifacts.
 */
const sanitizeForTTS = (text: string): string => {
  const cleaned = text
    .replace(/[*_#~`>]/g, '') // Remove common markdown symbols
    .replace(/\[.*?\]\(.*?\)/g, '') // Remove links
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Remove Emojis
    .replace(/[{}|[\]\\]/g, ' ') // Remove brackets and curly braces
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
  
  return cleaned || "Command acknowledged."; 
};

/**
 * Optimized for maximum speed using gemini-3-flash
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
        systemInstruction: "You are JARVIS. Respond instantly and concisely (max 20 words). Be professional and slightly witty. Use British English.",
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 }
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
    // Create new instance to ensure up-to-date credentials
    const ttsAi = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
    const response = await ttsAi.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            // Using 'Kore' as a stable, high-quality masculine profile
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    const audioPart = parts.find(p => p.inlineData && p.inlineData.data);
    
    const base64Audio = audioPart?.inlineData?.data;
    
    if (!base64Audio) {
      throw new Error("Empty audio payload");
    }
    
    return base64Audio;
  }, 2, 1000);
};
