
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

export const getHindiPanchangFromAI = async (apiKey?: string): Promise<AIContentResponse> => {
  const now = new Date();
  const todayIST = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Kolkata'}).format(now);
  const dayNameHi = new Intl.DateTimeFormat('hi-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' }).format(now);
  const dayNameEn = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' }).format(now);

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `आप एक विशेषज्ञ ज्योतिषी हैं। आपको आज दिनांक ${todayIST} के लिए सटीक हिंदू पंचांग (Vagad, Rajasthan region) प्रदान करना है।

महत्वपूर्ण मिलान निर्देश:
1. आज का अंग्रेजी वार: ${dayNameEn}
2. आज का हिंदी वार: ${dayNameHi}

Google Search का उपयोग करें और सुनिश्चित करें कि आप जो तिथि (Tithi) बता रहे हैं वह आज ${dayNameEn} (${todayIST}) की ही है। कई बार सर्च रिजल्ट्स कल या आने वाले दिनों का पंचांग दिखाते हैं, कृपया उन्हें ध्यान से फ़िल्टर करें।

केवल निम्न विवरण हिंदी में दें:
- विक्रम संवत और हिंदू मास
- पक्ष और आज की तिथि (जो ${dayNameHi} को है)
- आज का नक्षत्र
- सूर्योदय और सूर्यास्त का समय (डूंगरपुर/बांसवाड़ा क्षेत्र के अनुसार)

आउटपुट केवल इस प्रारूप में दें (कोई अतिरिक्त शब्द नहीं):
तारीख: ${todayIST} (${dayNameHi})
पंचांग: [मास], [पक्ष], [तिथि]
नक्षत्र: [नक्षत्र]
सूर्योदय: [समय] | सूर्यास्त: [समय]

चेतावनी: यदि जानकारी संदिग्ध है या आज के वार (${dayNameHi}) से मेल नहीं खाती, तो "डेटा की पुष्टि की जा रही है..." लिखें।`,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter(chunk => chunk.web)
      ?.map(chunk => ({
        title: chunk.web?.title || "Source",
        uri: chunk.web?.uri || ""
      })) || [];

    const aiText = response.text?.trim().replace(/\*/g, '');

    return {
      text: aiText || "आज का पंचांग उपलब्ध नहीं है।",
      sources: sources.length > 0 ? sources : undefined
    };
  } catch (error) {
    console.warn("Gemini Panchang Error:", error);
    return { text: "पंचांग लोड करने में त्रुटि हुई।" };
  }
};
