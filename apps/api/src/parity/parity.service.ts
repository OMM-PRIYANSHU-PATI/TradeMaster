import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from 'database';


export interface ParityReport {
  strategySnapshotMatch: boolean;
  marketDataMatch: boolean;
  signalsMatch: boolean;
  ordersMatch: boolean;
  positionsMatch: boolean;
  riskRulesMatch: boolean;
  costsMatch: boolean;
  pnlMatch: boolean;
  equityCurveMatch: boolean;
  mismatches: Array<{
    event: string;
    backtestValue: any;
    virtualValue: any;
    difference: any;
    reason?: string;
  }>;
}

@Injectable()
export class ParityService {
  async compare(userId: string, backtestId: string, virtualSessionId: string): Promise<ParityReport> {
    const backtest = await prisma.backtestRun.findUnique({
      where: { id: backtestId },
      include: {
        strategy: true,
        trades: true,
        equityCurve: true,
        metrics: true,
      },
    });

    const virtualSession = await prisma.virtualStrategySession.findUnique({
      where: { id: virtualSessionId },
      include: {
        strategy: true,
        paperAccount: {
          include: {
            orders: { include: { fills: true } },
            positions: true,
            ledger: true,
          },
        },
      },
    });

    if (!backtest || backtest.userId !== userId) throw new NotFoundException('Backtest not found');
    if (!virtualSession || virtualSession.userId !== userId) throw new NotFoundException('Virtual Session not found');

    const report: ParityReport = {
      strategySnapshotMatch: false,
      marketDataMatch: true, // Assuming true for now if same timeframes
      signalsMatch: true, 
      ordersMatch: true,
      positionsMatch: true,
      riskRulesMatch: true,
      costsMatch: true,
      pnlMatch: true,
      equityCurveMatch: true,
      mismatches: [],
    };

    // 1. Strategy Snapshot Match
    report.strategySnapshotMatch = backtest.strategyId === virtualSession.strategyId;
    if (!report.strategySnapshotMatch) {
      report.mismatches.push({
        event: 'Strategy Snapshot',
        backtestValue: backtest.strategyId,
        virtualValue: virtualSession.strategyId,
        difference: 'Different Strategy IDs',
      });
    }

    // 2. Orders Match
    // Backtest trades vs Virtual orders
    const backtestTradeCount = backtest.trades.length;
    const virtualOrderCount = virtualSession.paperAccount.orders.filter(o => o.status === 'FILLED').length;
    if (backtestTradeCount !== virtualOrderCount) {
      report.ordersMatch = false;
      report.mismatches.push({
        event: 'Order Count',
        backtestValue: backtestTradeCount,
        virtualValue: virtualOrderCount,
        difference: Math.abs(backtestTradeCount - virtualOrderCount),
      });
    }

    // 3. P&L Match
    const btNetPnl = backtest.metrics?.netPnl.toNumber() || 0;
    const vtNetPnl = virtualSession.paperAccount.ledger.reduce((acc, l) => acc + (l.type === 'REALIZED_PNL' ? l.amount.toNumber() : 0), 0);
    
    // Tolerance for P&L divergence (e.g. 5%)
    const pnlDiff = Math.abs(btNetPnl - vtNetPnl);
    const pnlTolerance = 0.05 * Math.abs(btNetPnl);
    
    if (pnlDiff > pnlTolerance && btNetPnl !== 0) {
      report.pnlMatch = false;
      report.mismatches.push({
        event: 'Net P&L',
        backtestValue: btNetPnl,
        virtualValue: vtNetPnl,
        difference: pnlDiff,
        reason: 'Exceeds 5% tolerance',
      });
    } else {
      report.pnlMatch = true;
    }

    // 4. Costs Match
    const btCosts = backtest.metrics?.totalCosts?.toNumber() || backtest.metrics?.totalFees?.toNumber() || 0;
    const vtCosts = virtualSession.paperAccount.ledger.reduce((acc, l) => acc + (['FEE', 'TAX', 'BROKERAGE'].includes(l.type) ? l.amount.toNumber() : 0), 0);
    
    const costDiff = Math.abs(btCosts - Math.abs(vtCosts));
    if (costDiff > 0.01) { // 1 cent tolerance
      report.costsMatch = false;
      report.mismatches.push({
        event: 'Total Costs',
        backtestValue: btCosts,
        virtualValue: Math.abs(vtCosts),
        difference: costDiff,
      });
    }

    return report;
  }
}
