
import { GoogleGenAI } from "@google/genai";

export const getFinancialAdvice = async (income: number, loanAmount: number, term: number) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Act as a helpful financial advisor at NOLT Finance. 
    A user earning $${income}/month wants a loan of $${loanAmount} for ${term} months. 
    Analyze the debt-to-income ratio and provide 3 short, encouraging tips for their financial health. 
    Keep it concise and professional.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Our AI advisor is currently unavailable, but our team is reviewing your application for the best possible terms.";
  }
};
