import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import * as crypto from 'crypto';
// @ts-ignore
import * as argon2 from 'argon2';

async function main() {
  const adminPermission = await prisma.permission.upsert({
    where: { name: 'admin:access' },
    update: {},
    create: { name: 'admin:access' }
  });
  
  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: { name: 'USER' }
  });
  
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', permissions: { connect: { id: adminPermission.id } } }
  });

  const adminHash = await argon2.hash('AdminPassword123!');
  await prisma.user.upsert({
    where: { email: 'admin-e2e@trademaster.com' },
    update: {},
    create: { email: 'admin-e2e@trademaster.com', passwordHash: adminHash, roles: { connect: { id: adminRole.id } } }
  });

  const userHash = await argon2.hash('Password123!');
  await prisma.user.upsert({
    where: { email: 'user@trademaster.com' },
    update: {},
    create: { email: 'user@trademaster.com', passwordHash: userHash, roles: { connect: { id: userRole.id } } }
  });

  const instrumentsData = [
    { symbol: 'AAPL', name: 'Apple Inc.', assetType: 'STOCK', exchange: 'NASDAQ', currency: 'USD', tickSize: 0.01, quantityPrecision: 0, pricePrecision: 2, price: 100.00 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', assetType: 'STOCK', exchange: 'NASDAQ', currency: 'USD', tickSize: 0.01, quantityPrecision: 0, pricePrecision: 2, price: 300.00 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', assetType: 'STOCK', exchange: 'NASDAQ', currency: 'USD', tickSize: 0.01, quantityPrecision: 0, pricePrecision: 2, price: 400.00 },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', assetType: 'ETF', exchange: 'NYSEARCA', currency: 'USD', tickSize: 0.01, quantityPrecision: 0, pricePrecision: 2, price: 450.00 },
    { symbol: 'BTCUSD', name: 'Bitcoin', assetType: 'CRYPTO', exchange: 'CRYPTO', currency: 'USD', tickSize: 0.01, quantityPrecision: 8, pricePrecision: 2, price: 50000.00 },
  ];

  for (const item of instrumentsData) {
    const { price, ...instData } = item;
    const instrument = await prisma.instrument.upsert({
      where: { symbol_exchange: { symbol: instData.symbol, exchange: instData.exchange } },
      update: {},
      create: instData
    });

    await prisma.marketPrice.create({
      data: {
        instrumentId: instrument.id,
        price,
        source: 'PAPER'
      }
    });
  }

  console.log('Seed completed successfully.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
