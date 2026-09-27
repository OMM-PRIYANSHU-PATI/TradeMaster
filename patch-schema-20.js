const fs = require('fs');
let s = fs.readFileSync('packages/database/prisma/schema.prisma', 'utf8');
if (!s.includes('defaultTimeframe')) {
  s = s.replace('    configuration Json\n    status        String   @default("ACTIVE")', '    configuration Json\n    status        String   @default("ACTIVE")\n    assetClass    String?  @db.VarChar(50)\n    defaultTimeframe String? @db.VarChar(50)\n    tags          String[]\n    version       Int      @default(1)\n    parentId      String?');
  s = s.replace('    user         User           @relation(fields: [userId], references: [id], onDelete: Cascade)', '    user         User           @relation(fields: [userId], references: [id], onDelete: Cascade)\n    parent       Strategy?      @relation("StrategyVersions", fields: [parentId], references: [id], onDelete: SetNull)\n    versions     Strategy[]     @relation("StrategyVersions")');
  fs.writeFileSync('packages/database/prisma/schema.prisma', s);
  console.log('Schema updated.');
} else {
  console.log('Already updated.');
}
