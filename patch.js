const fs = require('fs');
let d = fs.readFileSync('apps/api/src/virtual-trading/virtual-trading.service.ts', 'utf8');
d = "import { ZodHistoryBuffer, ZodStrategySnapshot } from './virtual-trading.schemas';\n" + d;

d = d.replace(
  "const compiled = this.strategyCompiler.compile(session.strategySnapshot as unknown as { type: string; config: unknown; }, 'VIRTUAL', session.timeframe, 'VIRTUAL');",
  "const parsedSnapshot = ZodStrategySnapshot.parse(session.strategySnapshot);\n      const compiled = this.strategyCompiler.compile(parsedSnapshot as { type: string; config: unknown; }, 'VIRTUAL', session.timeframe, 'VIRTUAL');"
);

const historyFind = "let historyBuffer: HistoricalBar[] = (session.historyBuffer as unknown as HistoricalBar[]) || [];\n      // parse dates and decimals\n      historyBuffer = historyBuffer.map(b => ({\n        timestamp: new Date(b.timestamp),\n        open: new Prisma.Decimal(b.open),\n        high: new Prisma.Decimal(b.high),\n        low: new Prisma.Decimal(b.low),\n        close: new Prisma.Decimal(b.close),\n        volume: new Prisma.Decimal(b.volume)\n      }));";

d = d.replace(historyFind, "const historyBuffer = ZodHistoryBuffer.parse(session.historyBuffer || []);");

fs.writeFileSync('apps/api/src/virtual-trading/virtual-trading.service.ts', d);
