import React from 'react';
import { CheckCircle, XCircle, ArrowRight, AlertTriangle } from 'lucide-react';

export default function ParityReportPage({ params }: { params: { backtestId: string, virtualId: string } }) {
  const dummyReport = {
    backtestId: params.backtestId,
    virtualId: params.virtualId,
    status: 'MISMATCH_FOUND',
    timestamp: new Date().toISOString(),
    checks: [
      { id: 'strategy_snapshot', name: 'Strategy Snapshot', status: 'MATCH', details: null },
      { id: 'market_data', name: 'Market Data', status: 'MATCH', details: null },
      { id: 'signals', name: 'Signals', status: 'MATCH', details: null },
      { id: 'orders', name: 'Orders', status: 'MISMATCH', details: { backtest: '14 orders', virtual: '12 orders', diff: 'Virtual missed 2 execution orders on AAPL due to slippage rules.' } },
      { id: 'positions', name: 'Positions', status: 'MISMATCH', details: { backtest: 'AAPL +100', virtual: 'AAPL +0', diff: 'Failed entry condition in virtual.' } },
      { id: 'risk_rules', name: 'Risk Rules', status: 'MATCH', details: null },
      { id: 'costs', name: 'Costs', status: 'MISMATCH', details: { backtest: '$14.50', virtual: '$12.00', diff: 'Commission mismatch due to fewer orders.' } },
      { id: 'pnl', name: 'P&L', status: 'MISMATCH', details: { backtest: '+$450.00', virtual: '+$0.00', diff: 'Missing AAPL position.' } },
      { id: 'equity_curve', name: 'Equity Curve', status: 'MISMATCH', details: { backtest: 'Max Drawdown 2%', virtual: 'Max Drawdown 0%', diff: 'No trades executed in virtual.' } },
    ]
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Strategy Validation Report</h1>
          <p className="text-neutral-400 mt-1">Comparing Backtest <span className="text-neutral-300 font-mono">{params.backtestId}</span> vs Virtual <span className="text-neutral-300 font-mono">{params.virtualId}</span></p>
        </div>
        <div className={`px-4 py-2 rounded-md flex items-center gap-2 font-medium shrink-0 ${dummyReport.status === 'MATCH_ALL' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
          {dummyReport.status === 'MATCH_ALL' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {dummyReport.status === 'MATCH_ALL' ? 'Parity Verified' : 'Discrepancies Found'}
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-neutral-800 bg-neutral-900/50 text-sm font-medium text-neutral-400">
          <div className="col-span-12 md:col-span-3">Validation Check</div>
          <div className="col-span-12 md:col-span-2 hidden md:block">Status</div>
          <div className="col-span-12 md:col-span-7 hidden md:block">Details</div>
        </div>
        
        <div className="divide-y divide-neutral-800">
          {dummyReport.checks.map(check => (
            <div key={check.id} className="grid grid-cols-12 gap-4 p-4 items-start text-sm">
              <div className="col-span-12 md:col-span-3 font-medium text-neutral-200 flex items-center justify-between md:block">
                <span>{check.name}</span>
                <div className="md:hidden">
                  {check.status === 'MATCH' ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded text-xs font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />
                      MATCH
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-rose-500 bg-rose-500/10 px-2 py-1 rounded text-xs font-medium">
                      <XCircle className="w-3.5 h-3.5" />
                      MISMATCH
                    </span>
                  )}
                </div>
              </div>
              <div className="col-span-12 md:col-span-2 hidden md:block">
                {check.status === 'MATCH' ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded text-xs font-medium">
                    <CheckCircle className="w-3.5 h-3.5" />
                    MATCH
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-rose-500 bg-rose-500/10 px-2 py-1 rounded text-xs font-medium">
                    <XCircle className="w-3.5 h-3.5" />
                    MISMATCH
                  </span>
                )}
              </div>
              <div className="col-span-12 md:col-span-7">
                {check.status === 'MATCH' ? (
                  <span className="text-neutral-500 hidden md:inline">Validated successfully</span>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-neutral-300">
                      <div className="px-3 py-1.5 bg-neutral-800 rounded flex-1">
                        <span className="text-xs text-neutral-500 block mb-1">Backtest</span>
                        {check.details?.backtest}
                      </div>
                      <ArrowRight className="w-4 h-4 text-neutral-600 hidden sm:block flex-shrink-0" />
                      <div className="px-3 py-1.5 bg-neutral-800 rounded flex-1">
                        <span className="text-xs text-neutral-500 block mb-1">Virtual</span>
                        {check.details?.virtual}
                      </div>
                    </div>
                    <p className="text-rose-400/90 text-sm mt-2 sm:mt-0">{check.details?.diff}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
