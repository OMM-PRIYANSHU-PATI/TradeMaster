const fs = require('fs');

// Fix risk.e2e-spec.ts
let t = fs.readFileSync('apps/api/test/risk.e2e-spec.ts', 'utf8');
t = t.replace("import { PrismaClient, Prisma } from 'database';", "import { PrismaClient, Prisma, Instrument } from 'database';");
t = t.replace("let inst: any;", "let inst: Instrument;");
fs.writeFileSync('apps/api/test/risk.e2e-spec.ts', t);

// Fix risk.controller.ts
let c = fs.readFileSync('apps/api/src/risk/risk.controller.ts', 'utf8');
c = c.replace(/@Body\(\) body: any/g, "@Body() body: Record<string, unknown>");
fs.writeFileSync('apps/api/src/risk/risk.controller.ts', c);

// Fix virtual-trading.runner.ts
let r = fs.readFileSync('apps/api/src/virtual-trading/virtual-trading.runner.ts', 'utf8');
r = r.replace(/catch \(error: any\)/g, "catch (error: unknown)");
r = r.replace(/catch \(e: any\)/g, "catch (e: unknown)");
fs.writeFileSync('apps/api/src/virtual-trading/virtual-trading.runner.ts', r);

// Fix virtual-trading.service.ts
let s = fs.readFileSync('apps/api/src/virtual-trading/virtual-trading.service.ts', 'utf8');
s = s.replace(/<any\[\]>/g, "<{ id: string, userId: string, strategySnapshot: Prisma.JsonValue, instrumentId: string, timeframe: string, paperAccountId: string }[]>");
s = s.replace(/const intent: any = \{/g, "const intent = {");
fs.writeFileSync('apps/api/src/virtual-trading/virtual-trading.service.ts', s);
