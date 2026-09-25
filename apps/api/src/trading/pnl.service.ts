import { Injectable } from '@nestjs/common';
import { Prisma } from 'database';

@Injectable()
export class PnlService {
  calculatePnl(
    positionQuantity: Prisma.Decimal,
    averageEntryPrice: Prisma.Decimal,
    currentMarketPrice: Prisma.Decimal
  ) {
    const marketValue = positionQuantity.mul(currentMarketPrice);
    const costBasis = positionQuantity.mul(averageEntryPrice);
    const unrealizedPnl = marketValue.sub(costBasis);

    return {
      marketValue: marketValue.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
      costBasis: costBasis.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
      unrealizedPnl: unrealizedPnl.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
    };
  }

  calculateRealizedPnl(
    soldQuantity: Prisma.Decimal,
    averageEntryPrice: Prisma.Decimal,
    executionPrice: Prisma.Decimal
  ): Prisma.Decimal {
    const pnl = executionPrice.sub(averageEntryPrice).mul(soldQuantity);
    return pnl.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }
  
  calculateNewAverageEntry(
    existingQuantity: Prisma.Decimal,
    existingAverage: Prisma.Decimal,
    newQuantity: Prisma.Decimal,
    executionPrice: Prisma.Decimal
  ): Prisma.Decimal {
    const existingValue = existingQuantity.mul(existingAverage);
    const newValue = newQuantity.mul(executionPrice);
    const totalQuantity = existingQuantity.add(newQuantity);
    if (totalQuantity.isZero()) return new Prisma.Decimal(0);
    return existingValue.add(newValue).div(totalQuantity).toDecimalPlaces(8, Prisma.Decimal.ROUND_HALF_UP);
  }
}
