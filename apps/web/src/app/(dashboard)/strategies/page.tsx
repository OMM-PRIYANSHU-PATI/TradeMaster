import React from 'react';
import { Plus, Search, MoreVertical, Play, Copy, Share2, Edit2, Beaker, FileText } from 'lucide-react';
import Link from 'next/link';

const tabs = ['My Strategies', 'Recent', 'Saved', 'Drafts'];

const dummyStrategies = [
  { id: 1, name: 'EMA Crossover', version: 'v1.2', instrument: 'BTC/USD', timeframe: '1h', updated: '2023-10-25', status: 'Active' },
  { id: 2, name: 'RSI Mean Reversion', version: 'v2.0', instrument: 'AAPL', timeframe: '15m', updated: '2023-10-24', status: 'Draft' },
  { id: 3, name: 'MACD Trend Following', version: 'v1.0', instrument: 'EUR/USD', timeframe: '4h', updated: '2023-10-20', status: 'Archived' },
];

export default function StrategyLibrary() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Strategies</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage and build your automated trading strategies.</p>
        </div>
        <Link href="/strategies/new" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2">
          <Plus className="mr-2 h-4 w-4" /> New Strategy
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex space-x-1 border-b border-slate-200 dark:border-slate-800 w-full sm:w-auto overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${tab === 'My Strategies' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search strategies..."
            className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 pl-8"
          />
        </div>
      </div>

      <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Instrument</th>
                <th className="px-4 py-3 font-medium">Timeframe</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {dummyStrategies.map((strategy) => (
                <tr key={strategy.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-slate-400" />
                    {strategy.name}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{strategy.version}</td>
                  <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{strategy.instrument}</td>
                  <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{strategy.timeframe}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{strategy.updated}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      strategy.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      strategy.status === 'Draft' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    }`}>
                      {strategy.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button title="Backtest" className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"><Beaker className="h-4 w-4" /></button>
                      <button title="Run Virtually" className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"><Play className="h-4 w-4" /></button>
                      <button title="Edit" className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"><Edit2 className="h-4 w-4" /></button>
                      <button title="Duplicate" className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"><Copy className="h-4 w-4" /></button>
                      <button title="Share" className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"><Share2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
