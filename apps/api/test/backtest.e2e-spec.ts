import { IndicatorEngine } from '../src/backtest/indicators/indicator.engine';
﻿import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import * as cookieParser from 'cookie-parser';
import { prisma, Prisma } from 'database';


  describe('StrategyEngine Unit Tests (Strict Numeric Validation)', () => {
    let engine: import("../src/backtest/strategy.engine").StrategyEngine;

    beforeAll(() => {
      const { StrategyEngine } = require('../src/backtest/strategy.engine');
      engine = new StrategyEngine();
    });

    it('rejects direct Infinity, -Infinity, NaN for BUY_AND_HOLD quantity', () => {
      const invalids = ['Infinity', '-Infinity', 'NaN'];
      for (const val of invalids) {
        expect(() => {
          engine.parseStrategyConfiguration({ type: 'BUY_AND_HOLD', config: { quantity: val } });
        }).toThrow();
      }
    });

    it('rejects direct Infinity, -Infinity, NaN for MOVING_AVERAGE_CROSSOVER periods and quantity', () => {
      const invalidPeriods = [Infinity, -Infinity, NaN];
      
      for (const val of invalidPeriods) {
        expect(() => {
          engine.parseStrategyConfiguration({ type: 'MOVING_AVERAGE_CROSSOVER', config: { fastPeriod: val, slowPeriod: 10, quantity: '10' } });
        }).toThrow();
        
        expect(() => {
          engine.parseStrategyConfiguration({ type: 'MOVING_AVERAGE_CROSSOVER', config: { fastPeriod: 5, slowPeriod: val, quantity: '10' } });
        }).toThrow();
      }

      const invalidQuantities = ['Infinity', '-Infinity', 'NaN'];
      for (const val of invalidQuantities) {
        expect(() => {
          engine.parseStrategyConfiguration({ type: 'MOVING_AVERAGE_CROSSOVER', config: { fastPeriod: 5, slowPeriod: 10, quantity: val } });
        }).toThrow();
      }
    });
  });


  
        describe('Phase 4: Strategy Engine No-Lookahead Behavioral Tests', () => {
    let engine: import("../src/backtest/strategy.engine").StrategyEngine;
    let indicatorEngine: import("../src/backtest/indicators/indicator.engine").IndicatorEngine;
    let backtestEngine: import("../src/backtest/backtest.engine").BacktestEngine;
    
    beforeAll(() => {
      const { StrategyEngine } = require('../src/backtest/strategy.engine');
      const { IndicatorEngine } = require('../src/backtest/indicators/indicator.engine');
      const { BacktestEngine } = require('../src/backtest/backtest.engine');
      const { PnlService } = require('../src/trading/pnl.service');
      const { FeeService } = require('../src/trading/fee.service');
      const { HistoricalDataProvider } = require('../src/backtest/historical-data.provider');

      engine = new StrategyEngine();
      indicatorEngine = new IndicatorEngine();
      const pnlService = new PnlService();
      const feeService = new FeeService();
      const dataProvider = new HistoricalDataProvider();
      backtestEngine = new BacktestEngine(dataProvider, engine, pnlService, feeService);
    });

    const { Prisma } = require('database');
    const makeBar = (close: number, idx: number) => ({
      timestamp: new Date(2023, 0, 1, 0, idx),
      open: new Prisma.Decimal(close),
      high: new Prisma.Decimal(close),
      low: new Prisma.Decimal(close),
      close: new Prisma.Decimal(close),
      volume: new Prisma.Decimal(100)
    });

    const verifyNoLookahead = async (configInput: unknown, basePrices: number[], buyIndex: number) => {
      // 1. Construct dataset A
      const historyA = basePrices.map((p, idx) => makeBar(p, idx));
      const liquidBarIdx = historyA.length;
      historyA.push(makeBar(basePrices[basePrices.length - 1], liquidBarIdx));

      // 2. Construct dataset B: identical through N (buyIndex), differs on N+1 (buyIndex+1)
      const historyB = basePrices.map((p, idx) => makeBar(p, idx));
      const nPlusOneIdx = buyIndex + 1;
      
      // Override N+1 bar in dataset B to have a different open price (999)
      historyB[nPlusOneIdx] = makeBar(999, nPlusOneIdx);
      historyB.push(makeBar(basePrices[basePrices.length - 1], liquidBarIdx));

      const parsedConfig = engine.parseStrategyConfiguration(configInput);

      // 3. Verify Signal Identity using history strictly up to N (buyIndex)
      const signalHistoryA = historyA.slice(0, buyIndex + 1);
      const signalHistoryB = historyB.slice(0, buyIndex + 1);

      const signalA = engine.generateSignal(parsedConfig, signalHistoryA, new Prisma.Decimal(0), indicatorEngine);
      const signalB = engine.generateSignal(parsedConfig, signalHistoryB, new Prisma.Decimal(0), indicatorEngine);

      expect(signalA.type).toBe('BUY');
      expect(signalB.type).toBe('BUY');
      expect(signalA.type).toEqual(signalB.type);
      expect(signalA.quantity.toString()).toEqual(signalB.quantity.toString());

      // 4. Run full deterministic backtests
      const { type, ...restConfig } = parsedConfig as unknown as { type: string, [key: string]: unknown };
      const dbConfig = { type, config: restConfig };
      const resA = await backtestEngine.runBacktest('inst', new Date(), new Date(), new Prisma.Decimal(100000), new Prisma.Decimal(0), dbConfig, historyA);
      const resB = await backtestEngine.runBacktest('inst', new Date(), new Date(), new Prisma.Decimal(100000), new Prisma.Decimal(0), dbConfig, historyB);

      const nPlusOneTime = historyA[nPlusOneIdx].timestamp.getTime();

      // Verify no earlier trade occurred before N+1
      const earlierTradesA = resA.trades.filter(t => t.openedAt.getTime() < nPlusOneTime);
      expect(earlierTradesA.length).toBe(0);

      // Locate the exact trade executed at N+1
      const tradeA = resA.trades.find(t => t.openedAt.getTime() === nPlusOneTime);
      const tradeB = resB.trades.find(t => t.openedAt.getTime() === nPlusOneTime);

      expect(tradeA).toBeDefined();
      expect(tradeB).toBeDefined();

      if (tradeA && tradeB) {
        expect(tradeA.side).toEqual('BUY');
        expect(tradeB.side).toEqual('BUY');
        expect(tradeA.quantity.toString()).toEqual(tradeB.quantity.toString());
        expect(tradeA.openedAt.getTime()).toEqual(tradeB.openedAt.getTime());
        expect(tradeA.openedAt.getTime()).toEqual(nPlusOneTime);

        // Assert execution occurs exactly at N+1 OPEN price
        expect(tradeA.entryPrice.toString()).toEqual(historyA[nPlusOneIdx].open.toString());
        expect(tradeB.entryPrice.toString()).toEqual(historyB[nPlusOneIdx].open.toString());

        // Entry prices MUST differ because N+1 open prices differ
        expect(tradeA.entryPrice.toString()).not.toEqual(tradeB.entryPrice.toString());
      }
    };

    it('MOVING_AVERAGE_CROSSOVER has no lookahead contract', async () => {
      // 10, 10, 10, 20 -> Fast=1, Slow=2 -> Crossover BUY at index 3 (N=3, N+1=4)
      await verifyNoLookahead(
        { type: 'MOVING_AVERAGE_CROSSOVER', config: { fastPeriod: 1, slowPeriod: 2, quantity: '10' } },
        [10, 10, 10, 20, 20],
        3
      );
    });

    it('RSI_THRESHOLD has no lookahead contract', async () => {
      // 100, 100, 100, 50 -> RSI drops below 30 at index 3 (N=3, N+1=4)
      await verifyNoLookahead(
        { type: 'RSI_THRESHOLD', config: { period: 2, oversold: 30, overbought: 70, quantity: '10' } },
        [100, 100, 100, 50, 50],
        3
      );
    });

    it('MACD_CROSSOVER has no lookahead contract', async () => {
      // 10, 10, 10, 10, 10, 9, 15 -> MACD crosses signal at index 6 (N=6, N+1=7)
      await verifyNoLookahead(
        { type: 'MACD_CROSSOVER', config: { fastPeriod: 2, slowPeriod: 4, signalPeriod: 3, quantity: '10' } },
        [10, 10, 10, 10, 10, 9, 15, 15, 15],
        6
      );
    });

    it('BOLLINGER_BAND has no lookahead contract', async () => {
      // 100, 100, 100, 100, 50 -> Close drops below lower band (mult 0.5) at index 4 (N=4, N+1=5)
      await verifyNoLookahead(
        { type: 'BOLLINGER_BAND', config: { period: 2, stdDevMultiplier: 0.5, quantity: '10' } },
        [100, 100, 100, 100, 50, 50],
        4
      );
    });

    it('CUSTOM_RULE_COMBINATION has no lookahead contract', async () => {
      // close > SMA(2): 100, 100, 100, 150 -> close 150 > SMA 125 at index 3 (N=3, N+1=4)
      await verifyNoLookahead(
        { 
          type: 'CUSTOM_RULE_COMBINATION', 
          config: { 
            quantity: '10',
            buyCondition: {
              operator: 'GREATER_THAN',
              left: { type: 'PRICE', field: 'close' },
              right: { type: 'INDICATOR', name: 'SMA', config: { period: 2 } }
            }
          }
        },
        [100, 100, 100, 150, 150],
        3
      );
    });
  });
  describe('Backtesting Lifecycle (e2e)', () => {
  let app: INestApplication;
  let userCookie: string;
  let userBCookie: string;
  let userId: string;
  let userBId: string;
  let aaplId: string;
  let strategyId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    const userRole = await prisma.role.upsert({ where: { name: 'USER' }, update: {}, create: { name: 'USER' } });
    const argon2 = require('argon2');
    
    
    
    // Cleanup first
    await prisma.backtestRun.deleteMany();
    await prisma.strategy.deleteMany();
    await prisma.user.deleteMany({ where: { email: { in: ['usera@trademaster.com', 'userb@trademaster.com'] } } });

    const uAHash = await argon2.hash('Password123!');
    const mainUser = await prisma.user.create({ data: { email: 'usera@trademaster.com', passwordHash: uAHash, roles: { connectOrCreate: { where: { name: 'USER' }, create: { name: 'USER' } } } } });
    userId = mainUser.id;
    
    const uBHash = await argon2.hash('Password123!');
    const userB = await prisma.user.create({ data: { email: 'userb@trademaster.com', passwordHash: uBHash, roles: { connectOrCreate: { where: { name: 'USER' }, create: { name: 'USER' } } } } });
    userBId = userB.id;

    const aaplInst = await prisma.instrument.upsert({
      where: { symbol_exchange: { symbol: 'AAPL', exchange: 'NASDAQ' } },
      update: {},
      create: { symbol: 'AAPL', name: 'Apple Inc.', assetType: 'STOCK', exchange: 'NASDAQ', currency: 'USD', tickSize: 0.01, quantityPrecision: 0, pricePrecision: 2 }
    });
    aaplId = aaplInst.id;

    let res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'usera@trademaster.com', password: 'Password123!' });
    if (res.status !== 200) console.log('LOGIN A FAILED:', res.status, res.body);
    userCookie = (res.headers['set-cookie'] as unknown as string[])?.[0]?.split(';')[0]?.split('=')[1] || '';

    res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'userb@trademaster.com', password: 'Password123!' });
    if (res.status !== 200) console.log('LOGIN B FAILED:', res.status, res.body);
    userBCookie = (res.headers['set-cookie'] as unknown as string[])?.[0]?.split(';')[0]?.split('=')[1] || '';
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('IDOR & Security', () => {
    let stratA: string;
    let runA: string;

    it('creates strategy A', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/strategies').set('Cookie', `sessionId=${userCookie}`).send({
        name: 'Strat A', type: 'BUY_AND_HOLD', configuration: { quantity: '1' }
      });
      if(res.status !== 201) console.log(res.body);
      expect(res.status).toBe(201);
      stratA = res.body.id;
      strategyId = stratA;
    });

    it('creates run A', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/backtests').set('Cookie', `sessionId=${userCookie}`).send({
        strategyId: stratA, instrumentId: aaplId, startDate: '2023-01-01', endDate: '2023-01-02', initialCapital: '1000'
      });
      if(res.status !== 201) console.log(res.body);
      expect(res.status).toBe(201);
      runA = res.body.id;
    });

    it('prevents User B from accessing Strategy A (GET, PATCH, DELETE)', async () => {
      let res = await request(app.getHttpServer()).get(`/api/v1/strategies/${stratA}`).set('Cookie', `sessionId=${userBCookie}`);
      expect(res.status).toBe(403);
      
      res = await request(app.getHttpServer()).patch(`/api/v1/strategies/${stratA}`).set('Cookie', `sessionId=${userBCookie}`).send({ name: 'Hacked' });
      expect(res.status).toBe(403);

      // Unknown field test
      res = await request(app.getHttpServer()).patch(`/api/v1/strategies/${stratA}`).set('Cookie', `sessionId=${userCookie}`).send({ name: 'Updated Name', hackerField: true });
      expect(res.status).toBe(400);
      
      res = await request(app.getHttpServer()).delete(`/api/v1/strategies/${stratA}`).set('Cookie', `sessionId=${userBCookie}`);
      expect(res.status).toBe(403);
    });

    it('prevents User B from running Backtest with Strategy A', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/backtests').set('Cookie', `sessionId=${userBCookie}`).send({
        strategyId: stratA, instrumentId: aaplId, startDate: '2023-01-01', endDate: '2023-01-02', initialCapital: '1000'
      });
      expect(res.status).toBe(403);
    });

    it('prevents User B from accessing Backtest A results', async () => {
      let res = await request(app.getHttpServer()).get(`/api/v1/backtests/${runA}`).set('Cookie', `sessionId=${userBCookie}`);
      expect(res.status).toBe(403);

      res = await request(app.getHttpServer()).get(`/api/v1/backtests/${runA}/trades`).set('Cookie', `sessionId=${userBCookie}`);
      expect(res.status).toBe(403);

      res = await request(app.getHttpServer()).get(`/api/v1/backtests/${runA}/equity`).set('Cookie', `sessionId=${userBCookie}`);
      expect(res.status).toBe(403);

      res = await request(app.getHttpServer()).get(`/api/v1/backtests/${runA}/metrics`).set('Cookie', `sessionId=${userBCookie}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Financial Core Engine Rules & Unit Invocations', () => {
    it('executes multi-entry fee math with proportional accounting', async () => {
      const engine = app.get(require('../src/backtest/backtest.engine').BacktestEngine);
      const { Prisma } = require('database');
      
      const bars = [
        { timestamp: new Date('2022-01-01T00:00:00Z'), open: new Prisma.Decimal(90), high: new Prisma.Decimal(101), low: new Prisma.Decimal(80), close: new Prisma.Decimal(100), volume: new Prisma.Decimal(1000) },
        { timestamp: new Date('2022-01-02T00:00:00Z'), open: new Prisma.Decimal(100), high: new Prisma.Decimal(111), low: new Prisma.Decimal(90), close: new Prisma.Decimal(110), volume: new Prisma.Decimal(1000) },
        { timestamp: new Date('2022-01-03T00:00:00Z'), open: new Prisma.Decimal(200), high: new Prisma.Decimal(201), low: new Prisma.Decimal(199), close: new Prisma.Decimal(200), volume: new Prisma.Decimal(1000) },
        { timestamp: new Date('2022-01-04T00:00:00Z'), open: new Prisma.Decimal(150), high: new Prisma.Decimal(151), low: new Prisma.Decimal(149), close: new Prisma.Decimal(150), volume: new Prisma.Decimal(1000) }
      ];
      
      const strategyEngine = app.get(require('../src/backtest/strategy.engine').StrategyEngine);
      jest.spyOn(strategyEngine, 'parseStrategyConfiguration').mockReturnValue({ type: 'BUY_AND_HOLD', quantity: '100' });
      let callCount = 0;
      const genSpy = jest.spyOn(strategyEngine, 'generateSignal').mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { type: 'BUY', quantity: new Prisma.Decimal(100) };
        if (callCount === 2) return { type: 'BUY', quantity: new Prisma.Decimal(100) };
        if (callCount === 3) return { type: 'SELL', quantity: new Prisma.Decimal(100) };
        return { type: 'HOLD' };
      });
      
      // Bar 0: BUY 100
      // Bar 1 executes BUY 100 @ 100 (Fee = 10, total Entry Fees = 10, Cash = 100k - 10k - 10 = 89990). Signal: BUY 100.
      // Bar 2 executes BUY 100 @ 200 (Fee = 20, total Entry Fees = 30, Cash = 89990 - 20k - 20 = 69970). Signal: SELL 100.
      // Bar 3 executes SELL 100 @ 150 (Gross Value = 15k, Fee = 15).
      // Allocated Entry Fee = 30 * (100 / 200) = 15.
      // Total exit trade fees = 15 + 15 = 30.
      // Avg Entry Price = (100*100 + 100*200) / 200 = 150.
      // Realized PnL = 100 * (150 - 150) = 0.
      // Net PnL = 0 - 30 = -30.
      
      const result = await engine.runBacktest('inst', new Date(), new Date(), new Prisma.Decimal(100000), new Prisma.Decimal(0.001), {}, bars);
      
      expect(result.trades.length).toBe(2);
      expect(result.trades[0].entryFee.toString()).toEqual("15");
      expect(result.trades[0].exitFee.toString()).toEqual("15");
      expect(result.trades[0].fees.toString()).toEqual("30");
      expect(result.trades[0].grossPnl.toString()).toEqual("0");
      expect(result.trades[0].netPnl.toString()).toEqual("-30");
      
      expect(result.trades[1].entryFee.toString()).toEqual("15");
      expect(result.trades[1].exitFee.toString()).toEqual("15");
      expect(result.trades[1].fees.toString()).toEqual("30");
      expect(result.trades[1].grossPnl.toString()).toEqual("0");
      expect(result.trades[1].netPnl.toString()).toEqual("-30");
      
      expect(result.totalFees.toString()).toEqual("60"); // 30 on exit, plus remaining 30 liquidated at end
      
      // Strict Financial Reconciliation assertions
      let expectedNet = new Prisma.Decimal(0);
      let expectedFees = new Prisma.Decimal(0);
      for (const t of result.trades) {
        expectedNet = expectedNet.add(t.netPnl);
        expectedFees = expectedFees.add(t.fees);
      }
      expect(result.netPnl.toNumber()).toBeCloseTo(expectedNet.toNumber(), 4);
      expect(result.totalFees.toNumber()).toBeCloseTo(expectedFees.toNumber(), 4);
      expect(result.finalEquity.toNumber()).toBeCloseTo(new Prisma.Decimal(100000).add(expectedNet).toNumber(), 4);
      
      for (const pt of result.equityCurve) {
        expect(pt.equity.toNumber()).toBeCloseTo(pt.cash.add(pt.positionValue).toNumber(), 4);
      }
      
      genSpy.mockRestore();
      jest.restoreAllMocks();
    });

    it('verifies behavioral no-lookahead and execution constraints', async () => {
      const engine = app.get(require('../src/backtest/backtest.engine').BacktestEngine);
      const strategyEngine = app.get(require('../src/backtest/strategy.engine').StrategyEngine);
      const { Prisma } = require('database');
      
      // Bar N (0) is identical. Bar N+1 (1) is vastly different.
      const barsA = [
        { timestamp: new Date('2023-01-01'), open: new Prisma.Decimal(100), high: new Prisma.Decimal(100), low: new Prisma.Decimal(100), close: new Prisma.Decimal(100), volume: new Prisma.Decimal(1000) },
        { timestamp: new Date('2023-01-02'), open: new Prisma.Decimal(110), high: new Prisma.Decimal(110), low: new Prisma.Decimal(110), close: new Prisma.Decimal(110), volume: new Prisma.Decimal(1000) },
        { timestamp: new Date('2023-01-03'), open: new Prisma.Decimal(120), high: new Prisma.Decimal(120), low: new Prisma.Decimal(120), close: new Prisma.Decimal(120), volume: new Prisma.Decimal(1000) }
      ];
      
      const barsB = [
        { timestamp: new Date('2023-01-01'), open: new Prisma.Decimal(100), high: new Prisma.Decimal(100), low: new Prisma.Decimal(100), close: new Prisma.Decimal(100), volume: new Prisma.Decimal(1000) },
        { timestamp: new Date('2023-01-02'), open: new Prisma.Decimal(999), high: new Prisma.Decimal(999), low: new Prisma.Decimal(999), close: new Prisma.Decimal(999), volume: new Prisma.Decimal(1000) },
        { timestamp: new Date('2023-01-03'), open: new Prisma.Decimal(120), high: new Prisma.Decimal(120), low: new Prisma.Decimal(120), close: new Prisma.Decimal(120), volume: new Prisma.Decimal(1000) }
      ];
      
      // Prove that at Bar N, Signal A === Signal B
      const historyA = [barsA[0]];
      const historyB = [barsB[0]];
      
      const config = { type: 'MOVING_AVERAGE_CROSSOVER', config: { fastPeriod: 1, slowPeriod: 2, quantity: '100' } };
      
      // In MA Crossover, history length 1 < slowPeriod+1 (3). So it will return HOLD.
      // But let's use BUY_AND_HOLD which generates a signal on history length 1.
      const configBH = { type: 'BUY_AND_HOLD', quantity: '100' };
      const dbConfigBH = { type: 'BUY_AND_HOLD', config: { quantity: '100' } };
      
      const signalA = strategyEngine.generateSignal(configBH, historyA, new Prisma.Decimal(0));
      const signalB = strategyEngine.generateSignal(configBH, historyB, new Prisma.Decimal(0));
      
      expect(signalA.type).toEqual(signalB.type);
      expect(signalA.quantity.toString()).toEqual(signalB.quantity.toString());
      
      // Now separately prove execution occurs using Bar N+1 Open
      const resA = await engine.runBacktest('inst', new Date(), new Date(), new Prisma.Decimal(100000), new Prisma.Decimal(0), dbConfigBH, barsA);
      console.log('RESA TRADES:', resA.trades);
      const resB = await engine.runBacktest('inst', new Date(), new Date(), new Prisma.Decimal(100000), new Prisma.Decimal(0), dbConfigBH, barsB);
      
      // Execution price must exactly equal Bar 1's Open
      expect(resA.trades[0].entryPrice.toString()).toEqual('110');
      // Execution price must exactly equal Bar 1's Open
      expect(resA.trades[0].entryPrice.toString()).toEqual('110');
      expect(resB.trades[0].entryPrice.toString()).toEqual('999');
    });

    it('verifies MOVING_AVERAGE_CROSSOVER future-independence', async () => {
      const engine = app.get(require('../src/backtest/backtest.engine').BacktestEngine);
      const strategyEngine = app.get(require('../src/backtest/strategy.engine').StrategyEngine);
      const { Prisma } = require('database');
      
      const barsA = [
        { timestamp: new Date('2023-01-01'), open: new Prisma.Decimal(100), high: new Prisma.Decimal(100), low: new Prisma.Decimal(100), close: new Prisma.Decimal(100), volume: new Prisma.Decimal(1000) },
        { timestamp: new Date('2023-01-02'), open: new Prisma.Decimal(90), high: new Prisma.Decimal(90), low: new Prisma.Decimal(90), close: new Prisma.Decimal(90), volume: new Prisma.Decimal(1000) },
        { timestamp: new Date('2023-01-03'), open: new Prisma.Decimal(120), high: new Prisma.Decimal(120), low: new Prisma.Decimal(120), close: new Prisma.Decimal(120), volume: new Prisma.Decimal(1000) },
        { timestamp: new Date('2023-01-04'), open: new Prisma.Decimal(110), high: new Prisma.Decimal(110), low: new Prisma.Decimal(110), close: new Prisma.Decimal(110), volume: new Prisma.Decimal(1000) }
      ];
      
      const barsB = [
        { timestamp: new Date('2023-01-01'), open: new Prisma.Decimal(100), high: new Prisma.Decimal(100), low: new Prisma.Decimal(100), close: new Prisma.Decimal(100), volume: new Prisma.Decimal(1000) },
        { timestamp: new Date('2023-01-02'), open: new Prisma.Decimal(90), high: new Prisma.Decimal(90), low: new Prisma.Decimal(90), close: new Prisma.Decimal(90), volume: new Prisma.Decimal(1000) },
        { timestamp: new Date('2023-01-03'), open: new Prisma.Decimal(120), high: new Prisma.Decimal(120), low: new Prisma.Decimal(120), close: new Prisma.Decimal(120), volume: new Prisma.Decimal(1000) },
        { timestamp: new Date('2023-01-04'), open: new Prisma.Decimal(999), high: new Prisma.Decimal(999), low: new Prisma.Decimal(999), close: new Prisma.Decimal(999), volume: new Prisma.Decimal(1000) }
      ];
      
      const historyA = barsA.slice(0, 3);
      const historyB = barsB.slice(0, 3);
      
      const maConfig = { type: 'MOVING_AVERAGE_CROSSOVER', fastPeriod: 1, slowPeriod: 2, quantity: '100' };
      const dbMaConfig = { type: 'MOVING_AVERAGE_CROSSOVER', config: { fastPeriod: 1, slowPeriod: 2, quantity: '100' } };
      
      const ie = new IndicatorEngine();
      const signalA = strategyEngine.generateSignal(maConfig, historyA, new Prisma.Decimal(0), ie);
      const signalB = strategyEngine.generateSignal(maConfig, historyB, new Prisma.Decimal(0), ie);
      
      expect(signalA.type).toEqual(signalB.type);
      expect(signalA.quantity?.toString()).toEqual(signalB.quantity?.toString());
      expect(signalA.type).toBe('BUY');
      
      const resA = await engine.runBacktest('inst', new Date(), new Date(), new Prisma.Decimal(100000), new Prisma.Decimal(0), dbMaConfig, barsA);
      const resB = await engine.runBacktest('inst', new Date(), new Date(), new Prisma.Decimal(100000), new Prisma.Decimal(0), dbMaConfig, barsB);
      
      expect(resA.trades[0].entryPrice.toString()).toEqual('110');
      expect(resB.trades[0].entryPrice.toString()).toEqual('999');
    });
  });
  
    it('verifies three-valued DSL logic correctly evaluates null propagation', () => {
      const strategyEngine = app.get(require('../src/backtest/strategy.engine').StrategyEngine);
      
      // evaluateCondition via bounded method
      
      const evalCond = (strategyEngine as unknown as { evaluateCondition: (c: unknown, ie: unknown, h: unknown) => boolean | null }).evaluateCondition.bind(strategyEngine);
      
      const trueCond = { operator: 'EQUAL', left: { type: 'CONSTANT', value: 1 }, right: { type: 'CONSTANT', value: 1 } };
      const falseCond = { operator: 'EQUAL', left: { type: 'CONSTANT', value: 1 }, right: { type: 'CONSTANT', value: 0 } };
      // A condition that evaluates to null because there's no history
      const nullCond = { operator: 'EQUAL', left: { type: 'INDICATOR', name: 'SMA', config: { period: 100 } }, right: { type: 'CONSTANT', value: 1 } };
      
      const ie = new IndicatorEngine();
      const h = [{ timestamp: new Date(), open: new Prisma.Decimal(10), high: new Prisma.Decimal(10), low: new Prisma.Decimal(10), close: new Prisma.Decimal(10), volume: new Prisma.Decimal(100) }];
      
      // AND
      expect(evalCond({ operator: 'AND', conditions: [trueCond, nullCond] }, ie, h)).toBeNull();
      expect(evalCond({ operator: 'AND', conditions: [falseCond, nullCond] }, ie, h)).toBe(false);
      expect(evalCond({ operator: 'AND', conditions: [nullCond, nullCond] }, ie, h)).toBeNull();
      
      // OR
      expect(evalCond({ operator: 'OR', conditions: [trueCond, nullCond] }, ie, h)).toBe(true);
      expect(evalCond({ operator: 'OR', conditions: [falseCond, nullCond] }, ie, h)).toBeNull();
      expect(evalCond({ operator: 'OR', conditions: [nullCond, nullCond] }, ie, h)).toBeNull();
      
      // NOT
      expect(evalCond({ operator: 'NOT', condition: trueCond }, ie, h)).toBe(false);
      expect(evalCond({ operator: 'NOT', condition: falseCond }, ie, h)).toBe(true);
      expect(evalCond({ operator: 'NOT', condition: nullCond }, ie, h)).toBeNull();
    });

  describe('Deterministic MA Strategy Run', () => {
    let run1: { id: string; status: string; metrics: Record<string, unknown> };
    let run2: { id: string; status: string; metrics: Record<string, unknown> };
    
    it('creates complex strategy', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/strategies').set('Cookie', `sessionId=${userCookie}`).send({
        name: 'Deterministic MA', type: 'MOVING_AVERAGE_CROSSOVER', configuration: { fastPeriod: 5, slowPeriod: 10, quantity: '100' }
      });
      strategyId = res.body.id;
    });

    it('runs backtest 1', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/backtests').set('Cookie', `sessionId=${userCookie}`).send({
        strategyId, instrumentId: aaplId, startDate: '2020-01-01', endDate: '2020-04-10', initialCapital: '100000'
      });
      if(res.status !== 201) console.log(res.body);
      run1 = res.body;
      expect(run1.status).toBe('COMPLETED');
    });

    it('runs backtest 2', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/backtests').set('Cookie', `sessionId=${userCookie}`).send({
        strategyId, instrumentId: aaplId, startDate: '2020-01-01', endDate: '2020-04-10', initialCapital: '100000'
      });
      run2 = res.body;
      expect(run2.status).toBe('COMPLETED');
    });

    it('asserts strictly identical state output', async () => {
      expect(run1.metrics.netPnl).toEqual(run2.metrics.netPnl);
      expect(run1.metrics.totalReturn).toEqual(run2.metrics.totalReturn);
      expect(run1.metrics.winRate).toEqual(run2.metrics.winRate);
      expect(run1.metrics.maxDrawdown).toEqual(run2.metrics.maxDrawdown);
      expect(run1.metrics.totalTrades).toEqual(run2.metrics.totalTrades);
      expect(run1.metrics.totalFees).toEqual(run2.metrics.totalFees);

      const t1 = await request(app.getHttpServer()).get(`/api/v1/backtests/${run1.id}/trades`).set('Cookie', `sessionId=${userCookie}`);
      const t2 = await request(app.getHttpServer()).get(`/api/v1/backtests/${run2.id}/trades`).set('Cookie', `sessionId=${userCookie}`);
      expect(t1.body.length).toBe(t2.body.length);
      for(let i=0; i<t1.body.length; i++) {
        expect(t1.body[i].entryPrice).toEqual(t2.body[i].entryPrice);
        expect(t1.body[i].exitPrice).toEqual(t2.body[i].exitPrice);
        expect(t1.body[i].fees).toEqual(t2.body[i].fees);
        expect(t1.body[i].netPnl).toEqual(t2.body[i].netPnl);
        expect(t1.body[i].side).toEqual(t2.body[i].side);
      }
      
      const e1 = await request(app.getHttpServer()).get(`/api/v1/backtests/${run1.id}/equity`).set('Cookie', `sessionId=${userCookie}`);
      const e2 = await request(app.getHttpServer()).get(`/api/v1/backtests/${run2.id}/equity`).set('Cookie', `sessionId=${userCookie}`);
      expect(e1.body.length).toBe(e2.body.length);
      for(let i=0; i<e1.body.length; i++) {
        expect(e1.body[i].equity).toEqual(e2.body[i].equity);
        expect(e1.body[i].cash).toEqual(e2.body[i].cash);
      }
    });
    
        it('validates DSL boundary', async () => {
      let res = await request(app.getHttpServer()).post('/api/v1/strategies').set('Cookie', `sessionId=${userCookie}`).send({
        name: 'Hack', type: 'PRICE_THRESHOLD', configuration: { quantity: '1' }
      });
      expect(res.status).toBe(400);

      // Verify strategy configuration rejection
      const invalidConfigs = [
        { configuration: null },
        { configuration: [] },
        { configuration: "string" },
        { configuration: {} },
        { configuration: { quantity: '-10' } }, // negative
        { configuration: { quantity: '0' } }, // zero
        { configuration: { quantity: 10 } }, // number instead of string
        { configuration: { quantity: '10', hackerField: true } }, // unknown field
        { configuration: { quantity: '' } }, // empty string
        { configuration: { quantity: '   ' } }, // whitespace string
      ];

      for (const invalid of invalidConfigs) {
        res = await request(app.getHttpServer()).post('/api/v1/strategies').set('Cookie', `sessionId=${userCookie}`).send({
          name: 'Hack', type: 'BUY_AND_HOLD', ...invalid
        });
        expect(res.status).toBe(400);
      }

      // MA config failures
      const invalidMaConfigs = [
        { fastPeriod: 0, slowPeriod: 10, quantity: '10' },
        { fastPeriod: 10, slowPeriod: 5, quantity: '10' },
        { fastPeriod: 1.5, slowPeriod: 3, quantity: '10' }, // decimal period
        { fastPeriod: -2, slowPeriod: 3, quantity: '10' }, // negative
        { fastPeriod: 1, slowPeriod: 1, quantity: '10' }, // equal
      ];

      for (const cfg of invalidMaConfigs) {
        res = await request(app.getHttpServer()).post('/api/v1/strategies').set('Cookie', `sessionId=${userCookie}`).send({
          name: 'Hack', type: 'MOVING_AVERAGE_CROSSOVER', configuration: cfg
        });
        expect(res.status).toBe(400);
      }
      
      // Unsupported types
      for (const type of ['PRICE_THRESHOLD', 'NON_EXISTENT_STRATEGY_TYPE']) {
        res = await request(app.getHttpServer()).post('/api/v1/strategies').set('Cookie', `sessionId=${userCookie}`).send({
          name: 'Hack', type, configuration: { quantity: '10' }
        });
        expect(res.status).toBe(400);
      }

      // PATCH bypass validation
      res = await request(app.getHttpServer()).patch(`/api/v1/strategies/${strategyId}`).set('Cookie', `sessionId=${userCookie}`).send({
        configuration: { quantity: '0' }
      });
      expect(res.status).toBe(400);
      
      res = await request(app.getHttpServer()).patch(`/api/v1/strategies/${strategyId}`).set('Cookie', `sessionId=${userCookie}`).send({
        type: 'BUY_AND_HOLD' // but existing config is MOVING_AVERAGE_CROSSOVER format, which fails BUY_AND_HOLD parse
      });
      expect(res.status).toBe(400);

      res = await request(app.getHttpServer()).patch(`/api/v1/strategies/${strategyId}`).set('Cookie', `sessionId=${userCookie}`).send({
        configuration: { quantity: '10', hackerField: true }
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Phase 16 - Deterministic Replay & Strategy Snapshot', () => {
    it('runs identical strategy twice and yields identical results', async () => {
      let res = await request(app.getHttpServer()).post('/api/v1/strategies').set('Cookie', `sessionId=${userCookie}`).send({
        name: 'DetStrat', type: 'BUY_AND_HOLD', configuration: { quantity: '5' }
      });
      const stratId = res.body.id;
      
      const p1 = await request(app.getHttpServer()).post('/api/v1/backtests').set('Cookie', `sessionId=${userCookie}`).send({
        strategyId: stratId, instrumentId: aaplId, startDate: '2023-01-01', endDate: '2023-01-02', initialCapital: '1000'
      });
      const run1 = p1.body;

      const p2 = await request(app.getHttpServer()).post('/api/v1/backtests').set('Cookie', `sessionId=${userCookie}`).send({
        strategyId: stratId, instrumentId: aaplId, startDate: '2023-01-01', endDate: '2023-01-02', initialCapital: '1000'
      });
      const run2 = p2.body;

      delete run1.metrics.id; delete run1.metrics.backtestRunId; delete run2.metrics.id; delete run2.metrics.backtestRunId; expect(run1.metrics).toEqual(run2.metrics);
      const t1 = await request(app.getHttpServer()).get(`/api/v1/backtests/${run1.id}/trades`).set('Cookie', `sessionId=${userCookie}`);
      const t2 = await request(app.getHttpServer()).get(`/api/v1/backtests/${run2.id}/trades`).set('Cookie', `sessionId=${userCookie}`);
      expect(t1.body.length).toEqual(t2.body.length);
    });

    it('strategy snapshot isolates backtest from future strategy changes', async () => {
      let res = await request(app.getHttpServer()).post('/api/v1/strategies').set('Cookie', `sessionId=${userCookie}`).send({
        name: 'SnapStrat', type: 'BUY_AND_HOLD', configuration: { quantity: '5' }
      });
      const stratId = res.body.id;
      
      const p1 = await request(app.getHttpServer()).post('/api/v1/backtests').set('Cookie', `sessionId=${userCookie}`).send({
        strategyId: stratId, instrumentId: aaplId, startDate: '2023-01-01', endDate: '2023-01-02', initialCapital: '1000'
      });
      const run1 = p1.body;

      await request(app.getHttpServer()).patch(`/api/v1/strategies/${stratId}`).set('Cookie', `sessionId=${userCookie}`).send({
        configuration: { quantity: '10' }
      });

      const getP = await request(app.getHttpServer()).get(`/api/v1/backtests/${run1.id}`).set('Cookie', `sessionId=${userCookie}`);
      expect((getP.body.strategySnapshot as { config: { quantity: string } }).config.quantity).toBe('5');
    });
  });
});
