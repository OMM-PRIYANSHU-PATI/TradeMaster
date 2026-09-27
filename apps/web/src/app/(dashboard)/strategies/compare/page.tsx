"use client";

import React, { useState } from 'react';
import { Plus, X, BarChart2, TrendingDown } from 'lucide-react';

const DUMMY_STRATEGIES = [
  { id: '1', name: 'Momentum Breakout', return: '+45.2%', cagr: '21.5%', sharpe: '1.8', maxDd: '-12.4%', winRate: '62%', pf: '1.9', trades: 145 },
  { id: '2', name: 'Mean Reversion', return: '+28.7%', cagr: '14.1%', sharpe: '2.1', maxDd: '-8.2%', winRate: '71%', pf: '2.4', trades: 312 },
  { id: '3', name: 'Trend Following', return: '+82.1%', cagr: '35.4%', sharpe: '1.5', maxDd: '-24.5%', winRate: '41%', pf: '1.6', trades: 84 },
  { id: '4', name: 'Grid Bot BTC', return: '+15.4%', cagr: '8.2%', sharpe: '3.2', maxDd: '-2.1%', winRate: '89%', pf: '3.1', trades: 1045 },
];

export default function StrategyComparePage() {
  const [selectedIds, setSelectedIds] = useState<string[]>(['1', '2']);

  const selectedStrategies = selectedIds.map(id => DUMMY_STRATEGIES.find(s => s.id === id)!);

  const addStrategy = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val && !selectedIds.includes(val) && selectedIds.length < 3) {
      setSelectedIds([...selectedIds, val]);
    }
    e.target.value = '';
  };

  const removeStrategy = (id: string) => {
    setSelectedIds(selectedIds.filter(sId => sId !== id));
  };

  const availableStrategies = DUMMY_STRATEGIES.filter(s => !selectedIds.includes(s.id));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-sm">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Compare Strategies</h1>
          <p className="text-gray-500">Side-by-side performance metrics and risk analysis.</p>
        </div>

        <div className="flex items-center space-x-2">
          <select 
            onChange={addStrategy}
            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
            disabled={selectedIds.length >= 3}
            defaultValue=""
          >
            <option value="" disabled>
              {selectedIds.length >= 3 ? 'Max 3 selected' : 'Add strategy to compare...'}
            </option>
            {availableStrategies.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedStrategies.length > 0 ? (
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-x-auto bg-white dark:bg-gray-950 shadow-sm">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr>
                <th className="p-4 border-b border-r border-gray-100 dark:border-gray-800 font-medium text-gray-500 w-48">Metric</th>
                {selectedStrategies.map(s => (
                  <th key={s.id} className="p-4 border-b border-gray-100 dark:border-gray-800 font-semibold align-top min-w-[200px]">
                    <div className="flex items-center justify-between">
                      <span className="truncate pr-2">{s.name}</span>
                      <button 
                        onClick={() => removeStrategy(s.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        aria-label={`Remove ${s.name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </th>
                ))}
                {/* Empty column if less than 3 */}
                {Array.from({ length: 3 - selectedStrategies.length }).map((_, i) => (
                  <th key={`empty-${i}`} className="p-4 border-b border-gray-100 dark:border-gray-800 w-full min-w-[200px] bg-gray-50/50 dark:bg-gray-900/20">
                    <span className="text-gray-400 font-normal italic">Add strategy</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {[
                { label: 'Total Return', key: 'return' },
                { label: 'CAGR', key: 'cagr' },
                { label: 'Sharpe Ratio', key: 'sharpe' },
                { label: 'Max Drawdown', key: 'maxDd' },
                { label: 'Win Rate', key: 'winRate' },
                { label: 'Profit Factor', key: 'pf' },
                { label: 'Total Trades', key: 'trades' },
              ].map((row) => (
                <tr key={row.key} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                  <td className="p-4 border-r border-gray-100 dark:border-gray-800 font-medium text-gray-600 dark:text-gray-400">
                    {row.label}
                  </td>
                  {selectedStrategies.map(s => (
                    <td key={s.id} className="p-4 font-mono text-gray-900 dark:text-gray-100">
                      {s[row.key as keyof typeof s]}
                    </td>
                  ))}
                  {Array.from({ length: 3 - selectedStrategies.length }).map((_, i) => (
                    <td key={`empty-cell-${i}`} className="p-4 bg-gray-50/50 dark:bg-gray-900/20"></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 text-center text-gray-500 border border-gray-200 dark:border-gray-800 rounded-lg border-dashed">
          No strategies selected. Add some above to start comparing.
        </div>
      )}

      {selectedStrategies.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
          <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-5 bg-white dark:bg-gray-950 shadow-sm h-[300px] flex flex-col">
            <h3 className="font-medium flex items-center mb-4">
              <BarChart2 className="w-4 h-4 mr-2 text-gray-500" />
              Equity Curve Comparison
            </h3>
            <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 rounded flex items-center justify-center text-gray-400 border border-dashed border-gray-200 dark:border-gray-800">
              [ Synchronized Equity Chart Placeholder ]
            </div>
          </div>

          <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-5 bg-white dark:bg-gray-950 shadow-sm h-[300px] flex flex-col">
            <h3 className="font-medium flex items-center mb-4">
              <TrendingDown className="w-4 h-4 mr-2 text-gray-500" />
              Drawdown Analysis
            </h3>
            <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 rounded flex items-center justify-center text-gray-400 border border-dashed border-gray-200 dark:border-gray-800">
              [ Synchronized Drawdown Chart Placeholder ]
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
