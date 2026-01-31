
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
      contents: "डॉ. बी.आर. अंबेडकर का एक छोटा और प्रेरणादायक हिंदी सुविचार लिखें। अंत में '— डॉ. बी.आर. अंबेडकर' लिखें। सुविचार को उद्धरण चिह्नों (quotes) में न रखें, केवल शुद्ध टेक्स्ट दें।",
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
