const fs = require('fs');
let code = fs.readFileSync('apps/api/src/virtual-trading/virtual-trading.runner.ts', 'utf8');
code = code.replace("if (error.status === 409) {", "if ((error as any).status === 409) {");
code = code.replace("error.message", "(error as Error).message");
code = code.replace("e.message", "(e as Error).message");
fs.writeFileSync('apps/api/src/virtual-trading/virtual-trading.runner.ts', code);
