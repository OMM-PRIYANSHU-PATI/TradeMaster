'use client';

import { useState, useEffect } from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

export default function RiskCenterPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt to fetch risk config
    fetch('/api/v1/risk/config')
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Risk Center</h1>
        <p className="text-neutral-400 mt-1">Manage global portfolio exposure and execution safeguards.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-sm">
          <p className="text-sm text-neutral-400 font-medium mb-4">PORTFOLIO SUMMARY</p>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <span className="text-neutral-300">Equity</span>
              <span className="text-white font-medium">₹100,000</span>
            </div>
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <span className="text-neutral-300">Available</span>
              <span className="text-white font-medium">₹58,000</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-300">Exposure</span>
              <span className="text-white font-medium">42%</span>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-sm">
          <p className="text-sm text-neutral-400 font-medium mb-4">RISK STATUS</p>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <span className="text-neutral-300">System Status</span>
              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 text-xs font-medium rounded border border-emerald-900/50">NORMAL</span>
            </div>
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <span className="text-neutral-300">Daily Loss</span>
              <span className="text-white font-medium">₹420 / ₹5,000</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-300">Drawdown</span>
              <span className="text-white font-medium">3.2% / 10%</span>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-sm relative overflow-hidden">
          <p className="text-sm text-neutral-400 font-medium mb-4">ACTIVE CONTROLS</p>
          <div className="space-y-3 relative z-10">
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-400">Risk / Trade</span>
              <span className="text-white">{config?.riskPerTrade || '1.00'}%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-400">Max Position</span>
              <span className="text-white">₹{config?.maxPositionValue || '25,000'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-400">Max Exposure</span>
              <span className="text-white">{config?.maxPortfolioExposure || '60'}%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-400">Max Positions</span>
              <span className="text-white">{config?.maxConcurrentPositions || '5'}</span>
            </div>
            <div className="pt-4 mt-2 border-t border-neutral-800">
              <button className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-2 rounded transition-colors text-sm">
                EDIT RISK SETTINGS
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-neutral-900 border border-red-900/50 rounded-xl p-6 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-red-400">EMERGENCY CONTROLS</h2>
          <p className="text-sm text-neutral-400 mt-1">Halt all new entries across all strategies immediately.</p>
        </div>
        <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-md transition-colors shadow-[0_0_15px_rgba(220,38,38,0.3)]">
          ACTIVATE EMERGENCY STOP
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950/50">
          <h2 className="text-lg font-medium text-white">Recent Risk Events</h2>
        </div>
        <div className="p-6">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="text-neutral-400">
              <tr>
                <th className="pb-3 font-medium">Time</th>
                <th className="pb-3 font-medium">Event</th>
                <th className="pb-3 font-medium">Instrument</th>
                <th className="pb-3 font-medium">Strategy</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              <tr className="hover:bg-neutral-800/30">
                <td className="py-3 text-neutral-400">10:42 AM</td>
                <td className="py-3"><span className="text-amber-400 font-medium">ORDER_MODIFIED</span></td>
                <td className="py-3 text-white">AAPL</td>
                <td className="py-3 text-neutral-300">Momentum 20/50</td>
                <td className="py-3 text-right text-neutral-400">Position size capped</td>
              </tr>
              <tr className="hover:bg-neutral-800/30">
                <td className="py-3 text-neutral-400">09:15 AM</td>
                <td className="py-3"><span className="text-red-400 font-medium">ORDER_REJECTED</span></td>
                <td className="py-3 text-white">TSLA</td>
                <td className="py-3 text-neutral-300">Mean Reversion</td>
                <td className="py-3 text-right text-neutral-400">Max exposure reached</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
