
import { FALLBACK_QUOTES } from "../constants";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const API_KEY = process.env.API_KEY || "";
const MODEL = "llama-3.3-70b-versatile";

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const callGroq = async (prompt: string) => {
  if (!API_KEY) throw new Error("API Key missing");
  
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error?.message || "Groq API Error");
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
};

export const getDailyQuote = async (): Promise<string> => {
  const today = getTodayDateString();
  const cached = localStorage.getItem('samaj_daily_quote_groq');
  
  if (cached) {
    const { date, text } = JSON.parse(cached);
    if (date === today) return text;
  }

  try {
    const text = await callGroq("लिखें: डॉ. बी.आर. अंबेडकर का एक छोटा और प्रेरणादायक हिंदी सुविचार जो एकता और शिक्षा पर आधारित हो। केवल सुविचार ही लिखें, कोई विशेष चिन्ह (जैसे **) न लगाएं।");
    const cleanedText = text.trim().replace(/\*/g, '');
    
    localStorage.setItem('samaj_daily_quote_groq', JSON.stringify({ date: today, text: cleanedText }));
    return cleanedText;
  } catch (error) {
    console.warn("Groq Quote Error:", error);
    return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
  }
};

export const getHindiPanchang = async (): Promise<string> => {
  const todayDate = getTodayDateString();
  const cached = localStorage.getItem('samaj_panchang_groq');
  
  if (cached) {
    const { date, text } = JSON.parse(cached);
    if (date === todayDate) return text;
  }

  const todayDisplay = new Date().toLocaleDateString('hi-IN', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  try {
    const text = await callGroq(`आज ${todayDisplay} के लिए संक्षिप्त हिंदी पंचांग बताएं। आउटपुट केवल इस फॉर्मेट में दें, कोई स्टार या बोल्ड चिन्ह न लगाएं:
तारीख- [आज की तारीख]
तिथि- [हिंदी तिथि]
वार- [दिन]
सूर्योदय- [समय]`);

    const cleanedText = text.trim().replace(/\*/g, '');
    localStorage.setItem('samaj_panchang_groq', JSON.stringify({ date: todayDate, text: cleanedText }));
    return cleanedText;
  } catch (error) {
    console.warn("Groq Panchang Error:", error);
    return "आज का पंचांग उपलब्ध नहीं है।";
  }
};

export const cleanDataWithAI = async (rawText: string): Promise<string> => {
  try {
    const text = await callGroq(`नीचे दिए गए यादव समाज के नामों और गाँवों की सूची को शुद्ध करें, वर्तनी (spelling) ठीक करें और मानक हिंदी रूप दें:\n${rawText}`);
    return text.trim();
  } catch (error) {
    return rawText;
  }
};
