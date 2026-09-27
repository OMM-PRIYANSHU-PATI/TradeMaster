import { Injectable } from '@nestjs/common';
import { Prisma } from 'database';

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    account: true;
    instrument: true;
    fills: true;
    JournalEntry: true;
  };
}>;

@Injectable()
export class TradeReviewContextService {
  buildContext(order: OrderWithRelations): string {
    const totalFees = order.fills.reduce(
      (sum, f) => sum + f.fee.toNumber(),
      0,
    );
    const grossValue = order.filledQuantity.toNumber() * order.averageFillPrice.toNumber();

    return JSON.stringify({
      instrument: order.instrument.symbol,
      side: order.side,
      status: order.status,
      quantity: order.filledQuantity.toNumber(),
      entryPrice: order.averageFillPrice.toNumber(),
      // exitPrice is not on a single BUY order — it would be on the
      // matching SELL order. Marking unavailable per Phase 2 architecture.
      exitPrice: 'UNAVAILABLE — requires matching SELL order lookup',
      grossValue,
      fees: totalFees,
      // grossPnl / netPnl: Phase 2 stores realizedPnl on Position, not on Order.
      // These values must come from Position.realizedPnl after a round-trip.
      // For a single-leg order (BUY only) these are not yet available.
      grossPnl: 'UNAVAILABLE — requires closed position',
      netPnl: 'UNAVAILABLE — requires closed position',
      journalEntries: order.JournalEntry.map((j) => ({
        notes: j.notes,
        mistakes: j.mistakes,
        entryReason: j.entryReason,
        exitReason: j.exitReason,
        emotion: j.emotion,
      })),
    });
  }

  buildRoundTripContext(
    buyOrder: OrderWithRelations,
    sellOrder: OrderWithRelations,
    realizedPnl: number,
  ): string {
    const buyFees = buyOrder.fills.reduce((s, f) => s + f.fee.toNumber(), 0);
    const sellFees = sellOrder.fills.reduce((s, f) => s + f.fee.toNumber(), 0);
    const totalFees = buyFees + sellFees;
    const entryPrice = buyOrder.averageFillPrice.toNumber();
    const exitPrice = sellOrder.averageFillPrice.toNumber();
    const quantity = buyOrder.filledQuantity.toNumber();
    const grossPnl = (exitPrice - entryPrice) * quantity;
    const netPnl = grossPnl - totalFees;

    return JSON.stringify({
      instrument: buyOrder.instrument.symbol,
      side: 'ROUND_TRIP',
      status: 'CLOSED',
      quantity,
      entryPrice,
      exitPrice,
      grossPnl,
      netPnl,
      fees: totalFees,
      realizedPnl,
      journalEntries: [
        ...buyOrder.JournalEntry.map((j) => ({ notes: j.notes, emotion: j.emotion })),
        ...sellOrder.JournalEntry.map((j) => ({ notes: j.notes, emotion: j.emotion })),
      ],
    });
  }
}
