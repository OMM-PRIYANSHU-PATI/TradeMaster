const fs = require('fs');
let s = fs.readFileSync('apps/api/src/ai/ai.service.ts', 'utf8');
s = s.replace(/import \{ SYSTEM_INSTRUCTIONS \} from '\.\/prompts\/prompts';/, "import { SYSTEM_INSTRUCTIONS, STRATEGY_GENERATION_INSTRUCTIONS } from './prompts/prompts';\nimport { aiStrategyResponseSchema, aiStrategyGenAiSchema, AiStrategyResponse } from './schemas/ai-strategy.schema';");

const generateStrategyMethod = `
  async generateStrategy(userId: string, prompt: string): Promise<AiStrategyResponse> {
    if (!prompt || !prompt.trim()) {
      throw new BadRequestException('Strategy description cannot be empty');
    }

    return this.geminiService.generateStructuredContent<AiStrategyResponse>(
      prompt,
      'Convert the following natural language strategy into the TradeMaster DSL.',
      aiStrategyResponseSchema,
      aiStrategyGenAiSchema,
      STRATEGY_GENERATION_INSTRUCTIONS,
    );
  }
`;

s = s.replace(/}$/, generateStrategyMethod + '\n}');
fs.writeFileSync('apps/api/src/ai/ai.service.ts', s);
console.log('Added generateStrategy to AiService');
