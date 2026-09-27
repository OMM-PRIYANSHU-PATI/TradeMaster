import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { GeminiService } from './gemini/gemini.service';
import { BacktestService } from '../backtest/backtest.service';
import { JournalService } from '../journal/journal.service';
import { BacktestContextService } from './context/backtest-context.service';
import { JournalContextService } from './context/journal-context.service';
import { StrategyContextService } from './context/strategy-context.service';
import { TradeReviewContextService } from './context/trade-review-context.service';
import { SYSTEM_INSTRUCTIONS } from './prompts/prompts';
import { AiCoachDto } from './dto/ai.dto';
import {
  aiInsightResponseSchema,
  aiInsightGenAiSchema,
  aiTradeReviewResponseSchema,
  aiTradeReviewGenAiSchema,
  AiInsightResponse,
  AiTradeReviewResponse,
} from './schemas/ai-response.schema';
import { prisma } from 'database';

@Injectable()
export class AiService {
  constructor(
    private geminiService: GeminiService,
    private backtestService: BacktestService,
    private journalService: JournalService,
    private backtestContext: BacktestContextService,
    private journalContext: JournalContextService,
    private strategyContext: StrategyContextService,
    private tradeReviewContext: TradeReviewContextService,
  ) {}

  async coach(userId: string, dto: AiCoachDto): Promise<AiInsightResponse> {
    if (!dto.message.trim()) {
      throw new BadRequestException('Message cannot be empty');
    }

    // Personalized context: user's paper accounts + positions
    const accounts = await prisma.paperTradingAccount.findMany({
      where: { userId },
      include: {
        positions: { include: { instrument: true } },
      },
    });

    const portfolioContext = JSON.stringify(
      accounts.map((acc) => ({
        name: acc.accountName,
        cash: acc.cashBalance.toNumber(),
        positions: acc.positions.map((p) => ({
          symbol: p.instrument.symbol,
          quantity: p.quantity.toNumber(),
          avgEntry: p.averageEntryPrice.toNumber(),
        })),
      })),
    );

    return this.geminiService.generateStructuredContent<AiInsightResponse>(
      dto.message,
      `User Portfolio Context: ${portfolioContext}`,
      aiInsightResponseSchema,
      aiInsightGenAiSchema,
      SYSTEM_INSTRUCTIONS,
    );
  }

  async explainBacktest(userId: string, backtestId: string): Promise<AiInsightResponse> {
    const backtest = await this.backtestService.getBacktest(userId, backtestId);
    const context = this.backtestContext.buildContext(backtest);

    return this.geminiService.generateStructuredContent<AiInsightResponse>(
      'Explain this backtest result. Highlight key strengths, weaknesses, and the overall performance based strictly on the authoritative deterministic values provided in the context. Do not recalculate or contradict them.',
      context,
      aiInsightResponseSchema,
      aiInsightGenAiSchema,
      SYSTEM_INSTRUCTIONS,
    );
  }

  async analyzeJournal(userId: string): Promise<AiInsightResponse> {
    const journals = await this.journalService.findAll(userId, { limit: '20' });
    if (!journals || journals.length === 0) {
      throw new BadRequestException('Not enough journal entries to analyze.');
    }

    const context = this.journalContext.buildContext(journals);

    return this.geminiService.generateStructuredContent<AiInsightResponse>(
      'Analyze my recent trading journal entries. Identify recurring behavioral patterns, mistakes, and areas for self-reflection without making medical diagnoses. Distinguish OBSERVED facts from POSSIBLE PATTERNS.',
      context,
      aiInsightResponseSchema,
      aiInsightGenAiSchema,
      SYSTEM_INSTRUCTIONS,
    );
  }

  async explainStrategy(userId: string, strategyId: string): Promise<AiInsightResponse> {
    const strategy = await this.backtestService.getStrategy(userId, strategyId);
    const context = this.strategyContext.buildContext(strategy);

    return this.geminiService.generateStructuredContent<AiInsightResponse>(
      'Explain this strategy configuration. What does it do, what are its potential strengths and limitations, and what should I test?',
      context,
      aiInsightResponseSchema,
      aiInsightGenAiSchema,
      SYSTEM_INSTRUCTIONS,
    );
  }

  async reviewTrade(userId: string, tradeId: string): Promise<AiTradeReviewResponse> {
    const order = await prisma.order.findUnique({
      where: { id: tradeId },
      include: {
        account: true,
        instrument: true,
        fills: true,
        JournalEntry: true,
      },
    });

    if (!order || order.account.userId !== userId) {
      throw new NotFoundException('Trade not found');
    }

    const context = this.tradeReviewContext.buildContext(order);

    return this.geminiService.generateStructuredContent<AiTradeReviewResponse>(
      'Provide a structured AI review of this trade execution. Base your observations exclusively on the authoritative financial data (entry, exit, quantity, fees, P&L) and the attached journal entries. Do not fabricate missing parameters or generate autonomous trading recommendations.',
      context,
      aiTradeReviewResponseSchema,
      aiTradeReviewGenAiSchema,
      SYSTEM_INSTRUCTIONS,
    );
  }
}
