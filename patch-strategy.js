const fs = require('fs');
let s = fs.readFileSync('packages/database/prisma/schema.prisma', 'utf8');

const regex1 = /status        String   @default\("ACTIVE"\)\r?\n    createdAt     DateTime @default\(now\(\)\)/;
const replacement1 = `status        String   @default("ACTIVE")
    assetClass       String?  @db.VarChar(50)
    defaultTimeframe String?  @db.VarChar(50)
    tags             String[]
    version          Int      @default(1)
    parentId         String?
    createdAt     DateTime @default(now())`;

const regex2 = /user         User           @relation\(fields: \[userId\], references: \[id\], onDelete: Cascade\)\r?\n    backtests    BacktestRun\[\]/;
const replacement2 = `user         User           @relation(fields: [userId], references: [id], onDelete: Cascade)
    parent           Strategy?      @relation("StrategyVersions", fields: [parentId], references: [id], onDelete: SetNull)
    versions         Strategy[]     @relation("StrategyVersions")
    backtests    BacktestRun[]`;

if (s.match(regex1) && s.match(regex2)) {
  s = s.replace(regex1, replacement1);
  s = s.replace(regex2, replacement2);
  fs.writeFileSync('packages/database/prisma/schema.prisma', s);
  console.log('Strategy model updated successfully');
} else {
  console.log('Could not find patterns to match');
}
