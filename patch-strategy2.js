const fs = require('fs');
let s = fs.readFileSync('packages/database/prisma/schema.prisma', 'utf8');

const regex = /model Strategy \{[\s\S]*?virtualSessions VirtualStrategySession\[\]\r?\n\s*\}/;
const replacement = `model Strategy {
  id               String   @id @default(cuid())
  userId           String
  name             String
  description      String?
  type             String // BUY_AND_HOLD, MOVING_AVERAGE_CROSSOVER, etc.
  configuration    Json
  status           String   @default("ACTIVE")
  assetClass       String?  @db.VarChar(50)
  defaultTimeframe String?  @db.VarChar(50)
  tags             String[]
  version          Int      @default(1)
  parentId         String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user             User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent           Strategy?      @relation("StrategyVersions", fields: [parentId], references: [id], onDelete: SetNull)
  versions         Strategy[]     @relation("StrategyVersions")
  backtests        BacktestRun[]
  JournalEntry     JournalEntry[]
  virtualSessions  VirtualStrategySession[]

  @@index([userId])
}`;

if (s.match(regex)) {
  s = s.replace(regex, replacement);
  fs.writeFileSync('packages/database/prisma/schema.prisma', s);
  console.log('Strategy model updated successfully');
} else {
  console.log('Could not find Strategy model');
}
