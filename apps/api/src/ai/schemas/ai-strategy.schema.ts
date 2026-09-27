import { z } from 'zod';
import { Type } from '@google/genai';

export const aiStrategyResponseSchema = z.object({
  name: z.string(),
  description: z.string(),
  assetClass: z.string().optional(),
  defaultTimeframe: z.string().optional(),
  tags: z.array(z.string()).optional(),
  type: z.string(),
  configuration: z.record(z.string(), z.unknown()),
  explanation: z.string().optional()
});

export type AiStrategyResponse = z.infer<typeof aiStrategyResponseSchema>;

export const aiStrategyGenAiSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "A professional name for the strategy" },
    description: { type: Type.STRING, description: "Detailed description of how the strategy works" },
    assetClass: { type: Type.STRING, description: "e.g., CRYPTO, FOREX, STOCKS" },
    defaultTimeframe: { type: Type.STRING, description: "e.g., 1m, 5m, 1h, 1D" },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    type: { type: Type.STRING, description: "Must be CUSTOM_RULE_COMBINATION or other supported exact enum values" },
    configuration: { 
      type: Type.OBJECT,
      description: "The structured configuration DSL. Must strictly follow the provided DSL."
    },
    explanation: {
      type: Type.STRING,
      description: "Explanation of why this strategy was generated and how it meets the user's prompt"
    }
  },
  required: ['name', 'description', 'type', 'configuration', 'explanation']
};
