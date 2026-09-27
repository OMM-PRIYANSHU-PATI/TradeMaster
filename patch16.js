const fs = require('fs');
let code = fs.readFileSync('apps/api/src/virtual-trading/virtual-trading.runner.ts', 'utf8');
code = code.replace("import { Injectable, Logger } from '@nestjs/common';", "import { Injectable, Logger, HttpException } from '@nestjs/common';");
code = code.replace("error instanceof require('@nestjs/common').HttpException", "error instanceof HttpException");
fs.writeFileSync('apps/api/src/virtual-trading/virtual-trading.runner.ts', code);
