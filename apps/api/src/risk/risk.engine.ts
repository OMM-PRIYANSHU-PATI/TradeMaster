import { Injectable } from '@nestjs/common';
import { Prisma, prisma } from 'database';
import { OrderIntent } from '../backtest/canonical/models';

export interface RiskDecision {
  status: 'APPROVED' | 'REJECTED' | 'MODIFIED';
  modifiedIntent?: OrderIntent;
  reason?: string;
}

@Injectable()
export class RiskEngine {
  async evaluateIntent(
    intent: OrderIntent,
    sessionId: string,
    paperAccountId: string,
    instrumentId: string,
    executionPrice: Prisma.Decimal,
  ): Promise<RiskDecision> {
    const session = await prisma.virtualStrategySession.findUnique({
      where: { id: sessionId },
      include: { 
        riskConfiguration: true,
        user: { include: { riskConfigurations: true } },
        paperAccount: true
      }
    });

    if (!session) return { status: 'APPROVED' };
    const config = session.riskConfiguration || (session.user.riskConfigurations && session.user.riskConfigurations[0]);
    if (!config) return { status: 'APPROVED' };

    const position = await prisma.position.findUnique({
      where: { accountId_instrumentId: { accountId: paperAccountId, instrumentId } }
    });

    let approvedQuantity = intent.quantity;
    let modified = false;
    let reason = '';
    const currentQty = position ? position.quantity : new Prisma.Decimal(0);
    const positionValue = currentQty.mul(executionPrice);
    
    // Emergency Stop
    if (config.emergencyStop && intent.side === 'BUY') {
      await this.logRiskEvent(session.userId, sessionId, instrumentId, 'EMERGENCY_STOP', 'REJECTED', intent.quantity, new Prisma.Decimal(0), 'Emergency stop activated');
      return { status: 'REJECTED', reason: 'Emergency stop activated' };
    }

    // 1. Drawdown & Daily Loss limit
    if (intent.side === 'BUY') {
      const accountEquity = session.paperAccount.cashBalance.plus(positionValue);
      const initialCapital = session.startingCapital;
      
      if (config.maxDailyLossPct) {
        const lossPct = initialCapital.minus(accountEquity).div(initialCapital).mul(100);
        if (lossPct.gte(config.maxDailyLossPct)) {
          await this.logRiskEvent(session.userId, sessionId, instrumentId, 'DAILY_LOSS_LIMIT', 'REJECTED', intent.quantity, new Prisma.Decimal(0), 'Max daily loss exceeded');
          return { status: 'REJECTED', reason: 'Max daily loss exceeded' };
        }
      }

      if (config.maxDrawdownPct) {
        const ddPct = initialCapital.minus(accountEquity).div(initialCapital).mul(100);
        if (ddPct.gte(config.maxDrawdownPct)) {
          await this.logRiskEvent(session.userId, sessionId, instrumentId, 'MAX_DRAWDOWN', 'REJECTED', intent.quantity, new Prisma.Decimal(0), 'Max drawdown exceeded');
          return { status: 'REJECTED', reason: 'Max drawdown exceeded' };
        }
      }
    }

    // Max Concurrent Positions
    if (config.maxConcurrentPositions && intent.side === 'BUY' && currentQty.equals(0)) {
       const activePositions = await prisma.position.count({
         where: { accountId: paperAccountId, quantity: { gt: 0 } }
       });
       if (activePositions >= config.maxConcurrentPositions) {
         await this.logRiskEvent(session.userId, sessionId, instrumentId, 'MAX_CONCURRENT_POSITIONS', 'REJECTED', intent.quantity, new Prisma.Decimal(0), 'Max concurrent positions exceeded');
         return { status: 'REJECTED', reason: 'Max concurrent positions exceeded' };
       }
    }

    // 2. Portfolio Exposure limit
    if (config.maxExposure && intent.side === 'BUY') {
      const orderValue = approvedQuantity.mul(executionPrice);
      if (positionValue.plus(orderValue).gt(config.maxExposure)) {
        const allowedValue = config.maxExposure.minus(positionValue);
        if (allowedValue.lte(0)) {
          await this.logRiskEvent(session.userId, sessionId, instrumentId, 'MAX_EXPOSURE', 'REJECTED', intent.quantity, new Prisma.Decimal(0), 'Max portfolio exposure exceeded');
          return { status: 'REJECTED', reason: 'Max portfolio exposure exceeded' };
        } else {
          approvedQuantity = allowedValue.div(executionPrice);
          modified = true;
          reason += 'Exposure limited; ';
        }
      }
    }

    // 3. Max Position Size
    if (config.maxPositionSize && intent.side === 'BUY') {
      if (currentQty.plus(approvedQuantity).gt(config.maxPositionSize)) {
        const allowedQty = config.maxPositionSize.minus(currentQty);
        if (allowedQty.lte(0)) {
          await this.logRiskEvent(session.userId, sessionId, instrumentId, 'MAX_POSITION_SIZE', 'REJECTED', intent.quantity, new Prisma.Decimal(0), 'Max position size exceeded');
          return { status: 'REJECTED', reason: 'Max position size exceeded' };
        } else {
          approvedQuantity = allowedQty;
          modified = true;
          reason += 'Max position size limited; ';
        }
      }
    }

    // 4. Stop Loss, Take Profit & Trailing Stop
    if (currentQty.gt(0) && position) {
      const entryPrice = position.averageEntryPrice;
      const pnlPct = executionPrice.minus(entryPrice).div(entryPrice).mul(100);
      let closeReason = null;
      let eventType = null;

      if (config.stopLossPct && pnlPct.lte(config.stopLossPct.mul(-1))) {
        closeReason = 'STOP_LOSS';
        eventType = 'STOP_LOSS_TRIGGERED';
      } else if (config.takeProfitPct && pnlPct.gte(config.takeProfitPct)) {
        closeReason = 'TAKE_PROFIT';
        eventType = 'TAKE_PROFIT_TRIGGERED';
      } else if (config.trailingStopPct && position.highWatermark) {
        // Trailing stop calculates from the highest price achieved
        const trailDropPct = position.highWatermark.minus(executionPrice).div(position.highWatermark).mul(100);
        if (trailDropPct.gte(config.trailingStopPct)) {
           closeReason = 'TRAILING_STOP';
           eventType = 'TRAILING_STOP_TRIGGERED';
        }
      }
      
      if (closeReason) {
        if (intent.side === 'SELL') {
          if (approvedQuantity.lt(currentQty)) {
             approvedQuantity = currentQty;
             modified = true;
             reason += closeReason + ' triggered, forcing full position close; ';
          }
        } else {
          await this.logRiskEvent(session.userId, sessionId, instrumentId, eventType!, 'MODIFIED', intent.quantity, currentQty, closeReason + ' triggered');
          return {
            status: 'MODIFIED',
            modifiedIntent: {
              ...intent,
              side: 'SELL',
              quantity: currentQty,
              reason: closeReason
            },
            reason: closeReason + ' triggered'
          };
        }
      }
    }

    if (modified) {
      await this.logRiskEvent(session.userId, sessionId, instrumentId, 'RISK_ORDER_MODIFIED', 'MODIFIED', intent.quantity, approvedQuantity, reason);
      return {
        status: 'MODIFIED',
        modifiedIntent: {
          ...intent,
          quantity: approvedQuantity,
          reason: intent.reason + ' | Risk: ' + reason
        },
        reason
      };
    }

    if (intent.side === 'BUY' || intent.side === 'SELL') {
      await this.logRiskEvent(session.userId, sessionId, instrumentId, 'RISK_ORDER_APPROVED', 'APPROVED', intent.quantity, approvedQuantity, 'Passed all checks');
    }
    return { status: 'APPROVED' };
  }

  private async logRiskEvent(userId: string, sessionId: string, instrumentId: string, eventType: string, decision: string, req: Prisma.Decimal, app: Prisma.Decimal, reason: string) {
    try {
      await prisma.riskEvent.create({
        data: {
          userId, sessionId, instrumentId, eventType, decision, requestedQty: req, approvedQty: app, reason
        }
      });
    } catch(e) {
      // Best effort logging
    }
  }
}
