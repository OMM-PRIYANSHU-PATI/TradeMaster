import { Injectable, InternalServerErrorException, BadGatewayException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

@Injectable()
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. Gemini API calls will fail.');
    }
    this.ai = new GoogleGenAI(apiKey ? { apiKey } : {});
  }

  async generateContent(prompt: string, context: string, systemInstruction?: string): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
      throw new InternalServerErrorException('AI integration is not configured.');
    }
    try {
      const fullPrompt = `=== SYSTEM CONTEXT / AUTHORITATIVE DATA ===\n${context}\n=== END SYSTEM CONTEXT ===\n\n=== USER REQUEST ===\n${prompt}`;
      const response = await this.ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: fullPrompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });
      return response.text || '';
    } catch {
      throw new InternalServerErrorException('Failed to generate AI response.');
    }
  }

  async generateStructuredContent<T>(
    prompt: string,
    context: string,
    zodSchema: z.ZodType<T>,
    genAiSchema: Record<string, unknown>,
    systemInstruction?: string,
  ): Promise<T> {
    if (!process.env.GEMINI_API_KEY) {
      throw new InternalServerErrorException('AI integration is not configured.');
    }

    let responseText = '';
    try {
      const fullPrompt = `=== SYSTEM CONTEXT / AUTHORITATIVE DATA ===\n${context}\n=== END SYSTEM CONTEXT ===\n\n=== USER REQUEST ===\n${prompt}`;
      const response = await this.ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: fullPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: genAiSchema,
        },
      });
      responseText = response.text || '{}';
    } catch {
      throw new BadGatewayException('Failed to communicate with AI model.');
    }

    // Runtime validation with Zod — never trust a TS cast
    let parsed: unknown;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      throw new BadGatewayException('The AI returned malformed or invalid structured data.');
    }

    const result = zodSchema.safeParse(parsed);
    if (!result.success) {
      throw new BadGatewayException('The AI returned malformed or invalid structured data.');
    }
    return result.data;
  }
}
