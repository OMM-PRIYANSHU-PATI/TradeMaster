import { Injectable, NotImplementedException } from '@nestjs/common';
import { ExecutionAdapter, ExecutionContext, ExecutionResult } from './execution.adapter';
import { CompiledStrategy } from './models';
import { HistoricalBar } from '../interfaces';

@Injectable()
export class PaperExecutionAdapter implements ExecutionAdapter {
  async execute(
    compiledStrategy: CompiledStrategy,
    bars: HistoricalBar[],
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    // Scaffold for future Phase 17 virtual/paper strategy runner.
    // Will run real-time streams instead of historical backfill.
    throw new NotImplementedException('Paper virtual strategy runner not yet implemented in Phase 16');
  }
}

