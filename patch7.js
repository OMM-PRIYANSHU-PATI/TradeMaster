const fs = require('fs');

let code = fs.readFileSync('apps/api/test/risk.e2e-spec.ts', 'utf8');
code = code.replace("exchange: 'DUMMY'", "exchange: 'DUMMY', tickSize: 0.01");
fs.writeFileSync('apps/api/test/risk.e2e-spec.ts', code);
