import { Injectable } from '@nestjs/common';
import { Prisma } from 'database';

type StrategyPayload = Prisma.StrategyGetPayload<{}>;

@Injectable()
export class StrategyContextService {
  buildContext(strategy: StrategyPayload): string {
    return JSON.stringify({
      id: strategy.id,
      name: strategy.name,
      description: strategy.description,
      type: strategy.type,
      configuration: strategy.configuration,
      status: strategy.status,
    });
  }
}
