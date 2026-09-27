const fs = require('fs');
let schema = fs.readFileSync('packages/database/prisma/schema.prisma', 'utf8');

if (!schema.includes('model RiskEvent')) {
  schema += `
model RiskEvent {
  id             String   @id @default(cuid())
  userId         String
  sessionId      String?
  instrumentId   String
  eventType      String
  decision       String
  requestedQty   Decimal  @db.Decimal(18, 8)
  approvedQty    Decimal  @db.Decimal(18, 8)
  reason         String?
  createdAt      DateTime @default(now())

  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
`;
  // Add relation to User
  schema = schema.replace('riskConfigurations RiskConfiguration[]', 'riskConfigurations RiskConfiguration[]\n  riskEvents RiskEvent[]');
  fs.writeFileSync('packages/database/prisma/schema.prisma', schema);
}
