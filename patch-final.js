const fs = require('fs');
let s = fs.readFileSync('apps/web/src/app/(dashboard)/layout.tsx', 'utf8');
if (!s.includes('use client')) {
  s = '"use client";\n' + s;
  fs.writeFileSync('apps/web/src/app/(dashboard)/layout.tsx', s);
}

let p = fs.readFileSync('apps/api/src/parity/parity.service.ts', 'utf8');
p = p.replace(/import \{ Prisma \} from '@prisma\/client';/, '');
fs.writeFileSync('apps/api/src/parity/parity.service.ts', p);

let ss = fs.readFileSync('apps/api/src/social/social.service.ts', 'utf8');
ss = ss.replace(/async getHomeFeed\(\) \{/, 'async getHomeFeed(): Promise<any> {');
fs.writeFileSync('apps/api/src/social/social.service.ts', ss);

let c = fs.readFileSync('apps/api/src/social/social.controller.ts', 'utf8');
c = c.replace(/getFeed\(\) \{/, 'getFeed(): Promise<any> {');
fs.writeFileSync('apps/api/src/social/social.controller.ts', c);
