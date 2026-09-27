const fs = require('fs');

let code = fs.readFileSync('apps/api/test/risk.e2e-spec.ts', 'utf8');
code = code.replace("assetClass: 'CRYPTO'", "assetType: 'CRYPTO'");
fs.writeFileSync('apps/api/test/risk.e2e-spec.ts', code);
