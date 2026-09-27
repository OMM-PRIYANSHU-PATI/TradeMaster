const fs = require('fs');

let code = fs.readFileSync('apps/api/test/risk.e2e-spec.ts', 'utf8');
code = code.replace(
  "      const account = await prisma.paperTradingAccount.create({",
  `      const strat = await prisma.strategy.create({ data: { userId, name: 'dummy', description: '', type: 'BUY_AND_HOLD', configuration: {}, status: 'ACTIVE' } });
      const inst = await prisma.instrument.create({ data: { symbol: 'DUMMY_RISK_' + Date.now(), name: 'DUMMY', type: 'CRYPTO', exchange: 'DUMMY' } });
      const account = await prisma.paperTradingAccount.create({`
);
code = code.replace(/strategyId: 'dummy',/g, 'strategyId: strat.id,');
code = code.replace(/instrumentId: 'dummy_inst',/g, 'instrumentId: inst.id,');
code = code.replace(/instrumentId: 'dummy'/g, 'instrumentId: inst.id');
fs.writeFileSync('apps/api/test/risk.e2e-spec.ts', code);
