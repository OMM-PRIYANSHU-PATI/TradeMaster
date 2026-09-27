const fs = require('fs');
let s = fs.readFileSync('apps/api/src/backtest/backtest.service.ts', 'utf8');

const compareMethod = `
  async compareStrategies(userId: string, strategyIds: string[]) {
    const strategies = await prisma.strategy.findMany({
      where: {
        id: { in: strategyIds },
        userId
      },
      include: {
        backtests: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            metrics: true
          }
        }
      }
    });

    return strategies.map(strategy => {
      const latestBacktest = strategy.backtests[0] || null;
      return {
        strategy: {
          id: strategy.id,
          name: strategy.name,
          version: strategy.version,
          assetClass: strategy.assetClass,
          defaultTimeframe: strategy.defaultTimeframe
        },
        metrics: latestBacktest?.metrics || null
      };
    });
  }
`;

s = s.replace(/}$/, compareMethod + '\n}');
fs.writeFileSync('apps/api/src/backtest/backtest.service.ts', s);
