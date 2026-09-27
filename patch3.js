const fs = require('fs');

let adapter = fs.readFileSync('apps/api/src/backtest/canonical/paper-execution.adapter.ts', 'utf8');
adapter = adapter.replace("if (intent.side !== 'BUY' && intent.side !== 'SELL') return; // HOLD\n    if (intent.quantity.lte(0)) throw new BadRequestException('Invalid quantity');", "");
adapter = adapter.replace("if (finalIntent.quantity.lte(0)) return;", "if (finalIntent.side !== 'BUY' && finalIntent.side !== 'SELL') return;\n    if (finalIntent.quantity.lte(0)) return;");
fs.writeFileSync('apps/api/src/backtest/canonical/paper-execution.adapter.ts', adapter);

let svc = fs.readFileSync('apps/api/src/virtual-trading/virtual-trading.service.ts', 'utf8');
const oldBlock = `      let tradeExecuted = false;
      if (signal.type === 'BUY' || signal.type === 'SELL') {
        const intent = {
          side: signal.type,
          quantity: signal.quantity!,
          reason: 'VIRTUAL_STRATEGY',
          strategyVersion: 1,
          timestamp: currentTimestamp
        };
        await this.paperExecutionAdapter.executeIntent(
          intent,
          session.id,
          session.paperAccountId,
          session.instrumentId,
          currentPrice
        );
        tradeExecuted = true;
      }`;

const newBlock = `      let tradeExecuted = false;
      const intent: any = {
        side: signal.type,
        quantity: signal.quantity || new Prisma.Decimal(0),
        reason: 'VIRTUAL_STRATEGY',
        strategyVersion: 1,
        timestamp: currentTimestamp
      };
      await this.paperExecutionAdapter.executeIntent(
        intent,
        session.id,
        session.paperAccountId,
        session.instrumentId,
        currentPrice
      );
      if (signal.type === 'BUY' || signal.type === 'SELL') tradeExecuted = true;`;

svc = svc.replace(oldBlock, newBlock);
fs.writeFileSync('apps/api/src/virtual-trading/virtual-trading.service.ts', svc);
