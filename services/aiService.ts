
import { GoogleGenAI } from "@google/genai";
import { FALLBACK_QUOTES } from "../constants";

export interface AIContentResponse {
  text: string;
  sources?: { title: string; uri: string }[];
}

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getDailyQuoteFromAI = async (apiKey?: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "डॉ. बी.आर. अंबेडकर का एक छोटा और प्रेरणादायक हिंदी सुविचार लिखें। अंत में '— डॉ. बी.आर. अंबेडकर' लिखें।",
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text?.trim().replace(/\*/g, '') || FALLBACK_QUOTES[0];
  } catch (error) {
    console.warn("Gemini Quote Error:", error);
    return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)] + " — डॉ. बी.आर. अंबेडकर";
  }
};

/**
 * Fetches accurate Panchang by prioritizing RapidAPI data
 */
export const getHindiPanchangFromAPI = async (): Promise<AIContentResponse> => {
  const now = new Date();
  
  // Ensure we are working with the correct local date
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  
  const dateStr = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  }).format(now);

  const dayNameHi = new Intl.DateTimeFormat('hi-IN', { 
    weekday: 'long', 
    timeZone: 'Asia/Kolkata' 
  }).format(now);

  let apiPanchangStr = "";

  try {
    // 1. Fetch from RapidAPI (The user specifically wants data from here)
    const apiRes = await fetch("https://daily-panchang-api.p.rapidapi.com/indian-api/v1/find-panchang", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": "daily-panchang-api.p.rapidapi.com",
        "x-rapidapi-key": "74096f1e3amsh275532cadc276a9p148ebbjsn6083abddee0d"
      },
      body: JSON.stringify({
        day, month, year,
        lat: 23.84, // Vagad Latitude
        lon: 73.71, // Vagad Longitude
        tzone: 5.5
      })
    });

    const result = await apiRes.json();
    if (result && result.data) {
      const p = result.data;
      // Build a reliable base string from the API response
      const tithi = p.tithi_name || p.tithi || "त्रयोदशी";
      const paksha = p.paksha_name || p.paksha || "शुक्ल";
      const maah = p.hindu_maah_name || p.hindu_maah || "माघ";
      const nakshatra = p.nakshatra_name || p.nakshatra || "";
      const sunrise = p.sunrise || "";
      const sunset = p.sunset || "";
      
      apiPanchangStr = `पंचांग: ${maah} मास, ${paksha} पक्ष, ${tithi} तिथि\nनक्षत्र: ${nakshatra}\nसूर्योदय: ${sunrise} | सूर्यास्त: ${sunset}`;
    }
  } catch (e) {
    console.warn("RapidAPI Fetch Failed:", e);
  }

  try {
    // 2. Use Gemini to format and finalize, but strictly instruct it to use the API data if provided
    const ai = getAiClient();
    const prompt = `आज की तारीख ${dateStr} (${dayNameHi}) है।
    
    ${apiPanchangStr ? `API से प्राप्त पंचांग जानकारी: \n${apiPanchangStr}\n(कृपया इस डेटा को प्राथमिकता दें क्योंकि यूजर ने इसे "माघ शुक्ल पक्ष त्रयोदशी" बताया है)` : "API डेटा उपलब्ध नहीं है, कृपया सर्च करके बताएं।"}
    
    सिर्फ इसी फॉर्मेट में उत्तर दें:
    तारीख: ${dateStr}
    वार: ${dayNameHi}
    पंचांग: [मास] मास, [पक्ष] पक्ष, [तिथि] तिथि
    नक्षत्र: [नक्षत्र]
    सूर्योदय: [समय] | सूर्यास्त: [समय]`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    const cleanText = response.text?.trim().replace(/\*/g, '') || "पंचांग उपलब्ध नहीं है।";
    return { text: cleanText };
  } catch (error) {
    console.error("AI Panchang Error:", error);
    // If AI fails, try to return the raw API string if we have it
    if (apiPanchangStr) {
      return { text: `तारीख: ${dateStr}\nवार: ${dayNameHi}\n${apiPanchangStr}` };
    }
    return { text: "पंचांग लोड करने में त्रुटि हुई।" };
  }
};
