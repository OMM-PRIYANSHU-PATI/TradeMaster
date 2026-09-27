import { z } from 'zod';
import { Prisma } from 'database';

export const ZodHistoricalBar = z.object({
  timestamp: z.union([z.date(), z.string()]).transform(v => new Date(v)),
  open: z.union([z.number(), z.string()]).transform(v => new Prisma.Decimal(v)),
  high: z.union([z.number(), z.string()]).transform(v => new Prisma.Decimal(v)),
  low: z.union([z.number(), z.string()]).transform(v => new Prisma.Decimal(v)),
  close: z.union([z.number(), z.string()]).transform(v => new Prisma.Decimal(v)),
  volume: z.union([z.number(), z.string()]).transform(v => new Prisma.Decimal(v)),
});

export const ZodHistoryBuffer = z.array(ZodHistoricalBar).default([]);

export const ZodStrategySnapshot = z.object({
  type: z.string(),
  config: z.unknown(),
}).passthrough();
