import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. Gemini API calls will fail.');
    }
    // Only initialize if we have a key, or initialize and let it fail later
    // @google/genai reads GEMINI_API_KEY from process.env if omitted, but explicitly passing it ensures clarity.
    this.ai = new GoogleGenAI(apiKey ? { apiKey } : {});
  }

  async generateContent(prompt: string, context: string, systemInstruction?: string): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
      throw new InternalServerErrorException('AI integration is not configured.');
    }

    try {
      const fullPrompt = `=== SYSTEM CONTEXT / AUTHORITATIVE DATA ===\n${context}\n=== END SYSTEM CONTEXT ===\n\n=== USER REQUEST ===\n${prompt}`;
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: fullPrompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });

      return response.text || '';
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw new InternalServerErrorException('Failed to generate AI response.');
    }
  }
}
