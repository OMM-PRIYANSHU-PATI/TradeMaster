const fs = require('fs');
let code = fs.readFileSync('apps/api/test/risk.e2e-spec.ts', 'utf8');

const newTests = `
    it('should trigger trailing stop', async () => {
      await prisma.riskConfiguration.update({ where: { sessionId }, data: { trailingStopPct: 5 } });
      await prisma.position.update({
        where: { accountId_instrumentId: { accountId: paperAccountId, instrumentId: inst.id } },
        data: { averageEntryPrice: 100, highWatermark: 120, quantity: 10 }
      });
      const intent = { side: 'BUY' as const, quantity: new Prisma.Decimal(10), reason: 'test', strategyVersion: 1, timestamp: new Date() };
      const res = await riskEngine.evaluateIntent(intent, sessionId, paperAccountId, inst.id, new Prisma.Decimal(110));
      expect(res.status).toBe('MODIFIED');
      expect(res.modifiedIntent?.reason).toBe('TRAILING_STOP');
    });

    it('should trigger emergency stop', async () => {
      await prisma.riskConfiguration.update({ where: { sessionId }, data: { emergencyStop: true } });
      const intent = { side: 'BUY' as const, quantity: new Prisma.Decimal(10), reason: 'test', strategyVersion: 1, timestamp: new Date() };
      const res = await riskEngine.evaluateIntent(intent, sessionId, paperAccountId, inst.id, new Prisma.Decimal(100));
      expect(res.status).toBe('REJECTED');
      expect(res.reason).toBe('Emergency stop activated');
      await prisma.riskConfiguration.update({ where: { sessionId }, data: { emergencyStop: false } });
    });

    it('should reject max concurrent positions', async () => {
      await prisma.riskConfiguration.update({ where: { sessionId }, data: { maxConcurrentPositions: 1 } });
      const intent = { side: 'BUY' as const, quantity: new Prisma.Decimal(10), reason: 'test', strategyVersion: 1, timestamp: new Date() };
      const res = await riskEngine.evaluateIntent(intent, sessionId, paperAccountId, inst.id, new Prisma.Decimal(100));
      expect(res.status).toBe('REJECTED');
      expect(res.reason).toBe('Max concurrent positions exceeded');
    });
`;

if (!code.includes('should trigger trailing stop')) {
  code = code.replace(/}\);\s+describe\('Risk Events',/, newTests + '\n    });\n    describe(\'Risk Events\',');
  if (!code.includes('should trigger trailing stop')) {
     code = code.replace("describe('RiskEngine logic', () => {", "describe('RiskEngine logic', () => {\n" + newTests);
  }
  fs.writeFileSync('apps/api/test/risk.e2e-spec.ts', code);
}
