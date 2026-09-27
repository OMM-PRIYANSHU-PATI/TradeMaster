const fs = require('fs');

// Fix risk.controller.ts
let c = fs.readFileSync('apps/api/src/risk/risk.controller.ts', 'utf8');
c = c.replace("import { JwtAuthGuard } from '../auth/jwt-auth.guard';", "import { AuthGuard } from '../common/guards/auth.guard';\nimport { CurrentUser } from '../common/decorators/current-user.decorator';\nimport { prisma } from 'database';");
c = c.replace(/JwtAuthGuard/g, 'AuthGuard');
c = c.replace(/@Request\(\) req/g, '@CurrentUser() user: { id: string }');
c = c.replace(/req\.user\.userId/g, 'user.id');
c = c.replace(/constructor\(private prisma: PrismaClient\) \{\}/g, '');
c = c.replace(/this\.prisma\./g, 'prisma.');
c = c.replace(/import \{ PrismaClient, Prisma \} from 'database';/g, "import { Prisma } from 'database';");
fs.writeFileSync('apps/api/src/risk/risk.controller.ts', c);

// Fix risk.engine.ts
let e = fs.readFileSync('apps/api/src/risk/risk.engine.ts', 'utf8');
e = e.replace(/import \{ Prisma, PrismaClient \} from 'database';/g, "import { Prisma, prisma } from 'database';");
e = e.replace(/constructor\(private prisma: PrismaClient\) \{\}/g, '');
e = e.replace(/this\.prisma\./g, 'prisma.');
fs.writeFileSync('apps/api/src/risk/risk.engine.ts', e);

// Fix risk.module.ts
let m = fs.readFileSync('apps/api/src/risk/risk.module.ts', 'utf8');
m = m.replace(/PrismaClient, /g, '');
fs.writeFileSync('apps/api/src/risk/risk.module.ts', m);
