import { Injectable, BadRequestException } from '@nestjs/common';
import { GeminiService } from './gemini/gemini.service';
import { BacktestService } from '../backtest/backtest.service';
import { JournalService } from '../journal/journal.service';
import { SYSTEM_INSTRUCTIONS, COACH_CONTEXT, buildBacktestContext, buildJournalContext, buildStrategyContext } from './prompts/prompts';
import { AiCoachDto } from './dto/ai.dto';

@Injectable()
export class AiService {
  constructor(
    private geminiService: GeminiService,
    private backtestService: BacktestService,
    private journalService: JournalService
  ) {}

  async coach(userId: string, dto: AiCoachDto) {
    if (!dto.message.trim()) {
      throw new BadRequestException('Message cannot be empty');
    }
    
    return {
      response: await this.geminiService.generateContent(
        dto.message,
        COACH_CONTEXT,
        SYSTEM_INSTRUCTIONS
      )
    };
  }

  async explainBacktest(userId: string, backtestId: string) {
    const backtest = await this.backtestService.getBacktest(userId, backtestId);
    
    const context = buildBacktestContext(backtest);
    const prompt = 'Explain this backtest result. Highlight key strengths, weaknesses, and the overall performance.';

    return {
      response: await this.geminiService.generateContent(
        prompt,
        context,
        SYSTEM_INSTRUCTIONS
      )
    };
  }

  async analyzeJournal(userId: string) {
    // Get recent journal entries
    const journals = await this.journalService.findAll(userId, { limit: '20' }) as any[];
    
    if (!journals || journals.length === 0) {
      throw new BadRequestException('Not enough journal entries to analyze.');
    }

    const context = buildJournalContext(journals);
    const prompt = 'Analyze my recent trading journal entries. Identify recurring behavioral patterns, mistakes, and areas for self-reflection.';

    return {
      response: await this.geminiService.generateContent(
        prompt,
        context,
        SYSTEM_INSTRUCTIONS
      )
    };
  }

  async explainStrategy(userId: string, strategyId: string) {
    const strategy = await this.backtestService.getStrategy(userId, strategyId);
    
    const context = buildStrategyContext(strategy);
    const prompt = 'Explain this strategy configuration. What does it do, what are its potential strengths and limitations, and what should I test?';

    return {
      response: await this.geminiService.generateContent(
        prompt,
        context,
        SYSTEM_INSTRUCTIONS
      )
    };
  }
}
