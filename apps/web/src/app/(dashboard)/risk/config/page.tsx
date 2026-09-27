'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RiskConfigPage() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    riskPerTrade: '1.00',
    maxConcurrentPositions: '5',
    maxPositionValue: '25000',
    maxPortfolioExposure: '60',
    maxDailyLoss: '5000',
    maxDrawdown: '10',
    stopLossEnabled: true,
    takeProfitEnabled: true,
    trailingStopEnabled: true
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/v1/risk/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      alert('Risk configuration updated securely.');
    } catch (e) {
      console.error(e);
      alert('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-2 text-sm text-neutral-500 mb-6">
        <Link href="/risk" className="hover:text-white transition-colors">Risk Center</Link>
        <span>/</span>
        <span className="text-neutral-300 truncate max-w-[200px]">Configuration</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Risk Configuration</h1>
        <p className="text-neutral-400 mt-1">Define strict execution boundaries for your virtual and live portfolios.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* General Risk */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-medium text-white mb-4 border-b border-neutral-800 pb-2">GENERAL RISK</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Risk per Trade (%)</label>
              <input type="number" step="0.01" value={config.riskPerTrade} onChange={e => setConfig({...config, riskPerTrade: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-neutral-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Maximum Concurrent Positions</label>
              <input type="number" value={config.maxConcurrentPositions} onChange={e => setConfig({...config, maxConcurrentPositions: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-neutral-500" />
            </div>
          </div>
        </div>

        {/* Position Limits */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-medium text-white mb-4 border-b border-neutral-800 pb-2">POSITION LIMITS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Maximum Position Value (₹)</label>
              <input type="number" value={config.maxPositionValue} onChange={e => setConfig({...config, maxPositionValue: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-neutral-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Maximum Portfolio Exposure (%)</label>
              <input type="number" value={config.maxPortfolioExposure} onChange={e => setConfig({...config, maxPortfolioExposure: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-neutral-500" />
            </div>
          </div>
        </div>

        {/* Loss Protection */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-medium text-white mb-4 border-b border-neutral-800 pb-2">LOSS PROTECTION</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Maximum Daily Loss (₹)</label>
              <input type="number" value={config.maxDailyLoss} onChange={e => setConfig({...config, maxDailyLoss: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-neutral-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Maximum Drawdown (%)</label>
              <input type="number" value={config.maxDrawdown} onChange={e => setConfig({...config, maxDrawdown: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-neutral-500" />
            </div>
          </div>
        </div>

        {/* Exit Protection */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-medium text-white mb-4 border-b border-neutral-800 pb-2">EXIT PROTECTION</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-neutral-800 rounded bg-neutral-950/50">
              <div>
                <p className="text-white font-medium">Stop Loss</p>
                <p className="text-sm text-neutral-500">Automatically exit positions when price falls below risk threshold.</p>
              </div>
              <input type="checkbox" checked={config.stopLossEnabled} onChange={e => setConfig({...config, stopLossEnabled: e.target.checked})} className="w-5 h-5 accent-emerald-500" />
            </div>
            <div className="flex items-center justify-between p-4 border border-neutral-800 rounded bg-neutral-950/50">
              <div>
                <p className="text-white font-medium">Take Profit</p>
                <p className="text-sm text-neutral-500">Automatically secure profits at defined target levels.</p>
              </div>
              <input type="checkbox" checked={config.takeProfitEnabled} onChange={e => setConfig({...config, takeProfitEnabled: e.target.checked})} className="w-5 h-5 accent-emerald-500" />
            </div>
            <div className="flex items-center justify-between p-4 border border-neutral-800 rounded bg-neutral-950/50">
              <div>
                <p className="text-white font-medium">Trailing Stop</p>
                <p className="text-sm text-neutral-500">Dynamically adjust stop loss upwards as price moves favorably.</p>
              </div>
              <input type="checkbox" checked={config.trailingStopEnabled} onChange={e => setConfig({...config, trailingStopEnabled: e.target.checked})} className="w-5 h-5 accent-emerald-500" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-neutral-800">
          <button type="submit" disabled={loading} className="bg-white text-black px-8 py-2.5 rounded-md font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
