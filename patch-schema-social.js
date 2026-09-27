const fs = require('fs');
let s = fs.readFileSync('packages/database/prisma/schema.prisma', 'utf8');

const socialPostModel = `
model SocialPost {
  id               String   @id @default(cuid())
  userId           String
  content          String?
  type             String   // TEXT, STRATEGY, BACKTEST, VIRTUAL
  strategyId       String?
  backtestId       String?
  virtualSessionId String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  strategy         Strategy? @relation(fields: [strategyId], references: [id], onDelete: SetNull)
  backtest         BacktestRun? @relation(fields: [backtestId], references: [id], onDelete: SetNull)
  virtualSession   VirtualStrategySession? @relation(fields: [virtualSessionId], references: [id], onDelete: SetNull)
  
  @@index([userId])
}
`;

if(!s.includes('model SocialPost')) {
  s += '\n' + socialPostModel;
  s = s.replace(/riskEvents RiskEvent\[\]\r?\n/, 'riskEvents RiskEvent[]\n    socialPosts SocialPost[]\n');
  s = s.replace(/virtualSessions  VirtualStrategySession\[\]\r?\n/, 'virtualSessions  VirtualStrategySession[]\n  socialPosts      SocialPost[]\n');
  s = s.replace(/metrics               BacktestMetric\?\r?\n/, 'metrics               BacktestMetric?\n  socialPosts           SocialPost[]\n');
  s = s.replace(/metrics           VirtualSessionMetric\?\r?\n/, 'metrics           VirtualSessionMetric?\n  socialPosts       SocialPost[]\n');
  
  s = s.replace(/tags             String\[\]\r?\n/, 'tags             String[]\n  isPublic         Boolean  @default(false)\n');
  fs.writeFileSync('packages/database/prisma/schema.prisma', s);
  console.log('Added SocialPost model');
}
