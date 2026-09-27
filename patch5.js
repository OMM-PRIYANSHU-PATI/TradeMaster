const fs = require('fs');

let code = fs.readFileSync('apps/api/test/risk.e2e-spec.ts', 'utf8');
code = code.replace("type: 'CRYPTO'", "assetClass: 'CRYPTO'");
code = code.replace(
  "let paperAccountId: string;\n    let sessionId: string;",
  "let paperAccountId: string;\n    let sessionId: string;\n    let inst: any;"
);
code = code.replace(
  "const inst = await prisma.instrument.create",
  "inst = await prisma.instrument.create"
);
fs.writeFileSync('apps/api/test/risk.e2e-spec.ts', code);
