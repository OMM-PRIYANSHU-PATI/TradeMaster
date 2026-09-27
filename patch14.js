const fs = require('fs');
let code = fs.readFileSync('apps/api/src/risk/risk.engine.ts', 'utf8');
code = code.replace("if (intent.side !== 'HOLD') {", "if (intent.side === 'BUY' || intent.side === 'SELL') {");
fs.writeFileSync('apps/api/src/risk/risk.engine.ts', code);
