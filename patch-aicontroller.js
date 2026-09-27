const fs = require('fs');
let s = fs.readFileSync('apps/api/src/ai/ai.controller.ts', 'utf8');
const method = `
  @Post('strategies/generate')
  @HttpCode(HttpStatus.OK)
  generateStrategy(@CurrentUser() user: { id: string }, @Body() dto: { prompt: string }) {
    return this.aiService.generateStrategy(user.id, dto.prompt);
  }
`;
s = s.replace('constructor(private readonly aiService: AiService) {}', 'constructor(private readonly aiService: AiService) {}\n' + method);
fs.writeFileSync('apps/api/src/ai/ai.controller.ts', s);
