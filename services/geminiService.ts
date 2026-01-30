
import { GoogleGenAI } from "@google/genai";
import { FALLBACK_QUOTES } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

const getTodayDateString = () => new Date().toISOString().split('T')[0];

export const getDailyQuote = async (): Promise<string> => {
  const today = getTodayDateString();
  const cached = localStorage.getItem('samaj_daily_quote_v2');
  
  if (cached) {
    const { date, text } = JSON.parse(cached);
    if (date === today) return text;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "लिखें: डॉ. बी.आर. अंबेडकर का एक छोटा और प्रेरणादायक हिंदी सुविचार जो एकता और शिक्षा पर आधारित हो। केवल सुविचार ही लिखें, कोई विशेष चिन्ह (जैसे **) न लगाएं।",
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    
    const quoteText = response.text?.trim().replace(/\*\*/g, '') || 
                     FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
    
    localStorage.setItem('samaj_daily_quote_v2', JSON.stringify({ date: today, text: quoteText }));
    return quoteText;
  } catch (error: any) {
    console.warn("Gemini Quote Error (Falling back):", error?.message);
    // Return fallback but don't cache it so we can try again next refresh if quota returns
    return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
  }
};

export const getHindiPanchang = async (): Promise<string> => {
  const todayDate = getTodayDateString();
  const cached = localStorage.getItem('samaj_panchang_v2');
  
  if (cached) {
    const { date, text } = JSON.parse(cached);
    if (date === todayDate) return text;
  }

  const todayDisplay = new Date().toLocaleDateString('hi-IN', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `आज ${todayDisplay} के लिए संक्षिप्त हिंदी पंचांग बताएं। आउटपुट केवल इस फॉर्मेट में दें, कोई स्टार या बोल्ड चिन्ह न लगाएं:
तारीख- [आज की तारीख]
तिथि- [हिंदी तिथि]
वार- [दिन]
सूर्योदय- [समय]`,
    });
    
    const panchangText = response.text?.trim().replace(/\*\*/g, '') || "जानकारी उपलब्ध नहीं है।";
    
    if (panchangText !== "जानकारी उपलब्ध नहीं है।") {
      localStorage.setItem('samaj_panchang_v2', JSON.stringify({ date: todayDate, text: panchangText }));
    }
    return panchangText;
  } catch (error: any) {
    console.warn("Gemini Panchang Error:", error?.message);
    return "आज का पंचांग उपलब्ध नहीं है।";
  }
};

export const cleanDataWithAI = async (rawText: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `नीचे दिए गए यादव समाज के नामों और गाँवों की सूची को शुद्ध करें, वर्तनी (spelling) ठीक करें और मानक हिंदी रूप दें:\n${rawText}`,
    });
    return response.text?.trim() || rawText;
  } catch (error) {
    return rawText;
  }
};
