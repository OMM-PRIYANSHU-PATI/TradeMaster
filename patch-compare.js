const fs = require('fs');
let s = fs.readFileSync('apps/api/src/backtest/backtest.controller.ts', 'utf8');

const compareEndpoint = `
  @Get('compare')
  async compareStrategies(@CurrentUser() user: { id: string }, @Query('ids') ids: string) {
    if (!ids) return [];
    const strategyIds = ids.split(',');
    return this.backtestService.compareStrategies(user.id, strategyIds);
  }
`;

s = s.replace(/class StrategyController \{[\s\S]*?constructor[^\}]+\} *\r?\n/, 'class StrategyController {\n  constructor(private readonly backtestService: BacktestService) {}\n' + compareEndpoint);
s = s.replace('import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ValidationPipe, UsePipes, HttpCode }', 'import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ValidationPipe, UsePipes, HttpCode }');
fs.writeFileSync('apps/api/src/backtest/backtest.controller.ts', s);
