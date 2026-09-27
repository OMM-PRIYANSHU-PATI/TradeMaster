"use client";

import React, { useState } from 'react';
import { 
  Play, Save, Edit, Monitor, Share2, 
  Settings, BarChart2, TrendingUp, TrendingDown,
  ChevronDown, Calendar, DollarSign, Percent
} from 'lucide-react';

export default function BacktestStudio() {
  // Dummy state for demonstration
  const [, setIsRunning] = useState(false);

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-900 text-slate-300 font-sans text-sm">
      {/* Header / Top Action Bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 shrink-0">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold text-slate-100 flex items-center">
            <Monitor className="w-5 h-5 mr-2 text-blue-500" />
            Backtest Studio
          </h1>
          <div className="text-xs px-2 py-1 bg-slate-800 text-slate-400 rounded border border-slate-700">
            Environment: Local Sandbox
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="flex items-center px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
            <Edit className="w-3.5 h-3.5 mr-1.5" />
            EDIT STRATEGY
          </button>
          <button className="flex items-center px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
            <Monitor className="w-3.5 h-3.5 mr-1.5" />
            CREATE VIRTUAL SESSION
          </button>
          <button className="flex items-center px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
            <Save className="w-3.5 h-3.5 mr-1.5" />
            SAVE RESULT
          </button>
          <button className="flex items-center px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            SHARE RESULT
          </button>
          <button 
            className="flex items-center px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 focus:ring-offset-slate-900"
            onClick={() => setIsRunning(true)}
          >
            <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
            RUN BACKTEST
          </button>
        </div>
      </header>

      {/* Main 3-Panel Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Panel: Configuration */}
        <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col overflow-y-auto shrink-0">
          <div className="p-3 border-b border-slate-800 bg-slate-950/50 sticky top-0 z-10">
            <h2 className="font-semibold text-slate-200 flex items-center uppercase tracking-wider text-xs">
              <Settings className="w-4 h-4 mr-2" />
              Configuration
            </h2>
          </div>
          <div className="p-4 space-y-5">
            {/* Strategy */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Strategy</label>
              <select className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
                <option>Mean Reversion Alpha</option>
                <option>Trend Following Beta</option>
                <option>Statistical Arbitrage V1</option>
              </select>
            </div>

            {/* Instrument & Timeframe */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Instrument</label>
                <input type="text" defaultValue="AAPL" className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Timeframe</label>
                <select className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
                  <option>1m</option>
                  <option>5m</option>
                  <option>15m</option>
                  <option>1h</option>
                  <option>1d</option>
                </select>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center">
                <Calendar className="w-3 h-3 mr-1" /> Date Range
              </label>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500 w-8">From</span>
                  <input type="date" defaultValue="2023-01-01" className="flex-1 bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 [color-scheme:dark]" />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500 w-8">To</span>
                  <input type="date" defaultValue="2023-12-31" className="flex-1 bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 [color-scheme:dark]" />
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-800 my-4" />

            {/* Capital & Risk */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center">
                  <DollarSign className="w-3 h-3 mr-1" /> Capital
                </label>
                <input type="number" defaultValue="100000" className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 text-right font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center">
                  <Percent className="w-3 h-3 mr-1" /> Risk
                </label>
                <input type="number" defaultValue="1.0" step="0.1" className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 text-right font-mono" />
              </div>
            </div>

            {/* Fees & Slippage */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Fees/Cost Profile</label>
                <select className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
                  <option>Zero Fee</option>
                  <option>Interactive Brokers Tiered</option>
                  <option>Binance VIP 0</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Slippage (BPS)</label>
                <input type="number" defaultValue="2" className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 text-right font-mono" />
              </div>
            </div>
          </div>
        </aside>

        {/* Center Panel: Charts */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-900">
          <div className="flex-1 flex flex-col p-2 space-y-2 overflow-y-auto">
            {/* Market Chart Placeholder */}
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded relative min-h-[300px]">
              <div className="absolute top-2 left-2 px-2 py-1 bg-slate-800/80 border border-slate-700 rounded text-xs font-medium text-slate-300 backdrop-blur-sm z-10 flex items-center">
                <BarChart2 className="w-3.5 h-3.5 mr-1" /> Market Chart
              </div>
              <div className="w-full h-full flex items-center justify-center text-slate-600 font-medium tracking-wide">
                TradingView / Chart Placeholder
              </div>
            </div>

            {/* Equity Curve Placeholder */}
            <div className="h-48 bg-slate-950 border border-slate-800 rounded relative shrink-0">
              <div className="absolute top-2 left-2 px-2 py-1 bg-slate-800/80 border border-slate-700 rounded text-xs font-medium text-slate-300 backdrop-blur-sm z-10 flex items-center">
                <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Equity Curve
              </div>
              <div className="w-full h-full flex items-center justify-center text-slate-600 font-medium tracking-wide">
                Equity Curve Chart
              </div>
            </div>

            {/* Drawdown Curve Placeholder */}
            <div className="h-32 bg-slate-950 border border-slate-800 rounded relative shrink-0">
              <div className="absolute top-2 left-2 px-2 py-1 bg-slate-800/80 border border-slate-700 rounded text-xs font-medium text-slate-300 backdrop-blur-sm z-10 flex items-center">
                <TrendingDown className="w-3.5 h-3.5 mr-1 text-red-500" /> Drawdown Curve
              </div>
              <div className="w-full h-full flex items-center justify-center text-slate-600 font-medium tracking-wide">
                Drawdown Curve Chart
              </div>
            </div>
          </div>
        </main>

        {/* Right Panel: Results */}
        <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
            <h2 className="font-semibold text-slate-200 uppercase tracking-wider text-xs">
              Performance Summary
            </h2>
            <button className="text-slate-400 hover:text-slate-200 focus:outline-none">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto space-y-6">
            {/* Topline Metrics */}
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Final Equity</div>
              <div className="text-3xl font-mono text-emerald-400">$124,560.50</div>
              <div className="text-sm font-medium text-emerald-500 mt-1 flex items-center">
                +24.56% <span className="text-slate-500 ml-2 font-normal">Net P&L: $24,560.50</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <div className="space-y-1">
                <div className="text-xs text-slate-500 uppercase tracking-wider">Initial Capital</div>
                <div className="text-sm font-mono text-slate-300">$100,000.00</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-500 uppercase tracking-wider">CAGR</div>
                <div className="text-sm font-mono text-emerald-400">24.56%</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-xs text-slate-500 uppercase tracking-wider">Max Drawdown</div>
                <div className="text-sm font-mono text-red-400">-12.40%</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-500 uppercase tracking-wider">Sharpe Ratio</div>
                <div className="text-sm font-mono text-slate-300">1.85</div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-slate-500 uppercase tracking-wider">Win Rate</div>
                <div className="text-sm font-mono text-slate-300">54.2%</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-500 uppercase tracking-wider">Profit Factor</div>
                <div className="text-sm font-mono text-slate-300">1.62</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-xs text-slate-500 uppercase tracking-wider">Total Trades</div>
                <div className="text-sm font-mono text-slate-300">248</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-500 uppercase tracking-wider">Total Costs</div>
                <div className="text-sm font-mono text-amber-500/90">$1,240.00</div>
              </div>
            </div>

            <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium uppercase tracking-wide rounded transition-colors border border-slate-700 mt-4 focus:outline-none focus:ring-2 focus:ring-blue-500">
              View Detailed Report
            </button>
          </div>
        </aside>

      </div>

      {/* Bottom Panel: Trade History Table */}
      <div className="h-64 border-t border-slate-800 bg-slate-900 flex flex-col shrink-0">
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/80 flex justify-between items-center">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Trade History</h3>
          <div className="flex space-x-2">
            <button className="text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1 rounded transition-colors focus:outline-none">
              Export CSV
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-slate-950/30">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-2 font-medium">Trade #</th>
                <th className="px-4 py-2 font-medium">Entry Date</th>
                <th className="px-4 py-2 font-medium">Exit Date</th>
                <th className="px-4 py-2 font-medium">Side</th>
                <th className="px-4 py-2 font-medium text-right">Quantity</th>
                <th className="px-4 py-2 font-medium text-right">Entry Price</th>
                <th className="px-4 py-2 font-medium text-right">Exit Price</th>
                <th className="px-4 py-2 font-medium text-right">Gross P&L</th>
                <th className="px-4 py-2 font-medium text-right">Fees</th>
                <th className="px-4 py-2 font-medium text-right">Slippage</th>
                <th className="px-4 py-2 font-medium text-right">Net P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-mono text-[11px]">
              {/* Dummy rows */}
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-2 text-slate-500">{249 - i}</td>
                  <td className="px-4 py-2 text-slate-300">2023-12-15 09:30</td>
                  <td className="px-4 py-2 text-slate-300">2023-12-18 15:45</td>
                  <td className="px-4 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${i % 2 === 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {i % 2 === 0 ? 'Short' : 'Long'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-slate-300">100</td>
                  <td className="px-4 py-2 text-right text-slate-300">$185.20</td>
                  <td className="px-4 py-2 text-right text-slate-300">$188.40</td>
                  <td className={`px-4 py-2 text-right ${i === 3 || i === 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {i === 3 || i === 5 ? '-$120.00' : '+$320.00'}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-400">-$2.00</td>
                  <td className="px-4 py-2 text-right text-slate-400">-$1.50</td>
                  <td className={`px-4 py-2 text-right font-semibold ${i === 3 || i === 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {i === 3 || i === 5 ? '-$123.50' : '+$316.50'}
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
