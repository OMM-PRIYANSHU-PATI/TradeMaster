const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'packages/database/prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const patch = fs.readFileSync(path.join(__dirname, 'patch.prisma'), 'utf8');

if (!schema.includes('model FinancialCostProfile')) {
  schema += '\n' + patch;
}

// Update BacktestRun
if (!schema.includes('costProfileId')) {
  schema = schema.replace(
    '  trades                BacktestTrade[]',
    '  costProfileId String?\n  costProfile   FinancialCostProfile? @relation(fields: [costProfileId], references: [id], onDelete: SetNull)\n  trades                BacktestTrade[]'
  );
  
  // Update PaperTradingAccount
  schema = schema.replace(
    '  ledger         PaperTradingLedger[]',
    '  costProfileId String?\n  costProfile   FinancialCostProfile? @relation(fields: [costProfileId], references: [id], onDelete: SetNull)\n  ledger         PaperTradingLedger[]'
  );
  
  // Update User
  schema = schema.replace(
    '  paperAccounts           PaperTradingAccount[]',
    '  paperAccounts           PaperTradingAccount[]\n  financialCostProfiles   FinancialCostProfile[]'
  );
}

// Add cost breakdown to BacktestTrade
if (!schema.includes('brokerage       Decimal  @default(0)')) {
  schema = schema.replace(
    /fees\s+Decimal\s+@db\.Decimal\(18,\s*8\)/g,
    'fees          Decimal  @db.Decimal(18, 8)\n    brokerage     Decimal  @default(0) @db.Decimal(18, 8)\n    exchangeFees  Decimal  @default(0) @db.Decimal(18, 8)\n    taxes         Decimal  @default(0) @db.Decimal(18, 8)\n    slippage      Decimal  @default(0) @db.Decimal(18, 8)\n    otherCosts    Decimal  @default(0) @db.Decimal(18, 8)'
  );
}

// Add cost breakdown to OrderFill
if (!schema.includes('brokerage     Decimal  @default(0) @db.Decimal(18, 2)')) {
  schema = schema.replace(
    /fee\s+Decimal\s+@db\.Decimal\(18,\s*2\)/g,
    'fee        Decimal  @db.Decimal(18, 2)\n    brokerage  Decimal  @default(0) @db.Decimal(18, 2)\n    exchangeFees Decimal @default(0) @db.Decimal(18, 2)\n    taxes      Decimal  @default(0) @db.Decimal(18, 2)\n    slippage   Decimal  @default(0) @db.Decimal(18, 2)\n    otherCosts Decimal  @default(0) @db.Decimal(18, 2)'
  );
}

// Write back
fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Schema patched successfully.');
