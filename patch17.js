const fs = require('fs');
let code = fs.readFileSync('apps/api/src/virtual-trading/virtual-trading.runner.ts', 'utf8');
code = code.replace("import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';", "import { Injectable, OnModuleInit, OnModuleDestroy, Logger, HttpException } from '@nestjs/common';");
fs.writeFileSync('apps/api/src/virtual-trading/virtual-trading.runner.ts', code);
