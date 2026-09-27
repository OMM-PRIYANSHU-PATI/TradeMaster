const fs = require('fs');

let v = fs.readFileSync('apps/api/test/virtual-trading.e2e-spec.ts', 'utf8');
v = v.replace(/as any/g, "as string[]");
fs.writeFileSync('apps/api/test/virtual-trading.e2e-spec.ts', v);

let b = fs.readFileSync('apps/api/test/backtest.e2e-spec.ts', 'utf8');
b = b.replace(/as any/g, "as { config: { quantity: string } }");
b = b.replace(/as Record<string, any>/g, "as { config: { quantity: string } }");
fs.writeFileSync('apps/api/test/backtest.e2e-spec.ts', b);

let m = fs.readFileSync('apps/api/test/market.e2e-spec.ts', 'utf8');
m = m.replace(/: any;/g, ": { id: string };");
fs.writeFileSync('apps/api/test/market.e2e-spec.ts', m);
