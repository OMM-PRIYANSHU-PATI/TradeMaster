import { Controller, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AiCoachDto } from './dto/ai.dto';

@UseGuards(AuthGuard)
@Controller('api/v1/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('strategies/generate')
  @HttpCode(HttpStatus.OK)
  generateStrategy(@CurrentUser() user: { id: string }, @Body() dto: { prompt: string }) {
    return this.aiService.generateStrategy(user.id, dto.prompt);
  }


  @Post('coach')
  @HttpCode(HttpStatus.OK)
  coach(@CurrentUser() user: { id: string }, @Body() dto: AiCoachDto) {
    return this.aiService.coach(user.id, dto);
  }

  @Post('backtests/:id/explain')
  @HttpCode(HttpStatus.OK)
  explainBacktest(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.aiService.explainBacktest(user.id, id);
  }

  @Post('journal/analyze')
  @HttpCode(HttpStatus.OK)
  analyzeJournal(@CurrentUser() user: { id: string }) {
    return this.aiService.analyzeJournal(user.id);
  }

  @Post('strategies/:id/explain')
  @HttpCode(HttpStatus.OK)
  explainStrategy(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.aiService.explainStrategy(user.id, id);
  }

  @Post('trades/:id/review')
  @HttpCode(HttpStatus.OK)
  reviewTrade(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.aiService.reviewTrade(user.id, id);
  }
}
