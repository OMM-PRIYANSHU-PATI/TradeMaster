import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from 'database';
import { HistoricalBar } from './interfaces';

@Injectable()
export class HistoricalDataProvider {
  getBars(instrumentId: string, startDate: Date, endDate: Date): HistoricalBar[] {
    const bars: HistoricalBar[] = [];
    let currentDate = new Date(startDate);
    
    // Explicit test fixture data bounding ~100 bars
    for (let i = 0; i < 100; i++) {
      if (currentDate > endDate) break;
      
      const base = 100;
      const variation = Math.sin(i * 0.1) * 20; 
      const price = new Prisma.Decimal((base + variation).toFixed(2));
      
      bars.push({
        timestamp: new Date(currentDate),
        open: price,
        high: price.add(1),
        low: price.sub(1),
        close: price,
        volume: new Prisma.Decimal(1000)
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    bars.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    let lastTime = 0;
    for (const b of bars) {
      if (b.timestamp.getTime() <= lastTime) throw new BadRequestException('Historical data must be strictly chronological');
      if (b.open.lte(0) || b.high.lte(0) || b.low.lte(0) || b.close.lte(0)) throw new BadRequestException('Invalid negative price in historical data');
      if (b.high.lt(b.open) || b.high.lt(b.close)) throw new BadRequestException('High price must be >= open and close');
      if (b.low.gt(b.open) || b.low.gt(b.close)) throw new BadRequestException('Low price must be <= open and close');
      if (b.volume.lt(0)) throw new BadRequestException('Volume cannot be negative');
      lastTime = b.timestamp.getTime();
    }

    return bars;
  }
}
