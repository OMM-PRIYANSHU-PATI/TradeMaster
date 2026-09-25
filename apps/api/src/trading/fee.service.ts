import { Injectable } from '@nestjs/common';
import { Prisma } from 'database';

@Injectable()
export class FeeService {
  calculateFee(side: string, quantity: Prisma.Decimal, executionPrice: Prisma.Decimal): Prisma.Decimal {
    const grossValue = quantity.mul(executionPrice);
    const fee = grossValue.mul(new Prisma.Decimal('0.001'));
    return fee.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }
}
