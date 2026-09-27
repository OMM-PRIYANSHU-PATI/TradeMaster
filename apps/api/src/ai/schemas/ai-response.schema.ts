import { z } from 'zod';
import { Type } from '@google/genai';

// ─── Zod schemas for RUNTIME validation of Gemini output ───

export const aiInsightResponseSchema = z.object({
  summary: z.string(),
  observations: z.array(z.string()),
  explanations: z.array(z.string()),
  risks: z.array(z.string()),
  learningPoints: z.array(z.string()),
  suggestedActions: z.array(z.string()),
  confidence: z.enum(['low', 'medium', 'high']),
  dataLimitations: z.array(z.string()),
});

export type AiInsightResponse = z.infer<typeof aiInsightResponseSchema>;

export const aiTradeReviewResponseSchema = z.object({
  summary: z.string(),
  setup: z.string(),
  execution: z.string(),
  riskObservations: z.array(z.string()),
  ruleAdherence: z.string(),
  possibleMistakes: z.array(z.string()),
  whatWentWell: z.array(z.string()),
  whatToReview: z.array(z.string()),
  learningPoints: z.array(z.string()),
});

export type AiTradeReviewResponse = z.infer<typeof aiTradeReviewResponseSchema>;

// ─── Google GenAI responseSchema objects ───

export const aiInsightGenAiSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    observations: { type: Type.ARRAY, items: { type: Type.STRING } },
    explanations: { type: Type.ARRAY, items: { type: Type.STRING } },
    risks: { type: Type.ARRAY, items: { type: Type.STRING } },
    learningPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
    suggestedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
    confidence: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
    dataLimitations: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    'summary', 'observations', 'explanations', 'risks',
    'learningPoints', 'suggestedActions', 'confidence', 'dataLimitations',
  ],
};

export const aiTradeReviewGenAiSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    setup: { type: Type.STRING },
    execution: { type: Type.STRING },
    riskObservations: { type: Type.ARRAY, items: { type: Type.STRING } },
    ruleAdherence: { type: Type.STRING },
    possibleMistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
    whatWentWell: { type: Type.ARRAY, items: { type: Type.STRING } },
    whatToReview: { type: Type.ARRAY, items: { type: Type.STRING } },
    learningPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    'summary', 'setup', 'execution', 'riskObservations', 'ruleAdherence',
    'possibleMistakes', 'whatWentWell', 'whatToReview', 'learningPoints',
  ],
};
