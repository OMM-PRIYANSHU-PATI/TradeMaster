const fs = require('fs');
let s = fs.readFileSync('apps/api/src/ai/ai.service.ts', 'utf8');

const generateStrategyMethod = `
  async generateStrategy(userId: string, prompt: string) {
    if (!prompt || !prompt.trim()) {
      throw new BadRequestException('Strategy description cannot be empty');
    }

    return this.geminiService.generateStructuredContent(
      prompt,
      'Convert the following natural language strategy into the TradeMaster DSL.',
      aiStrategyResponseSchema,
      aiStrategyGenAiSchema,
      STRATEGY_GENERATION_INSTRUCTIONS,
    );
  }
`;

s = s.substring(0, s.lastIndexOf('}')) + generateStrategyMethod + '\n}';
fs.writeFileSync('apps/api/src/ai/ai.service.ts', s);
