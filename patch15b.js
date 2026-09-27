const fs = require('fs');
let code = fs.readFileSync('apps/api/src/virtual-trading/virtual-trading.runner.ts', 'utf8');
code = code.replace("if ((error as any).status === 409) {", "if (error instanceof require('@nestjs/common').HttpException && error.getStatus() === 409) {");
fs.writeFileSync('apps/api/src/virtual-trading/virtual-trading.runner.ts', code);
