'use client';

import React, { useState } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Settings2, Info } from 'lucide-react';
import Link from 'next/link';

export default function NewStrategyBuilder() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assetClass: 'Crypto',
    timeframe: '1h',
    tags: '',
  });

  const [indicators, setIndicators] = useState([
    { id: 1, type: 'EMA', length: 14, source: 'close', alias: 'EMA1' }
  ]);

  const [entryConditions, setEntryConditions] = useState([
    { id: 1, source: 'close', operator: 'crosses_above', value: 'EMA1', action: 'BUY' }
  ]);
  
  const [exitConditions, setExitConditions] = useState({
    stopLoss: 2.0,
    takeProfit: 5.0,
    trailingStop: false
  });

  const [positionSizing, setPositionSizing] = useState({
    type: 'risk_based',
    riskPerTrade: 1.0,
    maxPositionSize: 10000
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.name.trim()) {
      setError('Strategy name is required.');
      return;
    }

    setIsSaving(true);
    try {
      // Dummy API call
      await fetch('/api/v1/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          indicators,
          entryConditions,
          exitConditions,
          positionSizing
        })
      });
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      setSuccess(true);
    } catch (_err) {
      setError('Failed to save strategy. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const addIndicator = () => {
    setIndicators([...indicators, { id: Date.now(), type: 'RSI', length: 14, source: 'close', alias: `RSI${indicators.length + 1}` }]);
  };

  const removeIndicator = (id: number) => {
    setIndicators(indicators.filter(ind => ind.id !== id));
  };

  const addEntryCondition = () => {
    setEntryConditions([...entryConditions, { id: Date.now(), source: 'close', operator: 'greater_than', value: '', action: 'BUY' }]);
  };

  const removeEntryCondition = (id: number) => {
    setEntryConditions(entryConditions.filter(cond => cond.id !== id));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/strategies" className="p-2 -ml-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Strategy Builder</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Design rule-based trading systems</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2"
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Strategy'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
          Strategy saved successfully!
        </div>
      )}

      <form className="space-y-8" onSubmit={handleSave}>
        {/* Strategy Information */}
        <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4 flex items-center">
            <Info className="mr-2 h-5 w-5 text-slate-400" />
            Strategy Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">Strategy Name *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="e.g., EMA Crossover v1"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="tags" className="text-sm font-medium text-slate-700 dark:text-slate-300">Tags</label>
              <input
                id="tags"
                type="text"
                value={formData.tags}
                onChange={e => setFormData({...formData, tags: e.target.value})}
                className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Trend, Crypto, Medium-term"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="assetClass" className="text-sm font-medium text-slate-700 dark:text-slate-300">Asset Class</label>
              <select
                id="assetClass"
                value={formData.assetClass}
                onChange={e => setFormData({...formData, assetClass: e.target.value})}
                className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option>Crypto</option>
                <option>Equities</option>
                <option>Forex</option>
                <option>Commodities</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="timeframe" className="text-sm font-medium text-slate-700 dark:text-slate-300">Default Timeframe</label>
              <select
                id="timeframe"
                value={formData.timeframe}
                onChange={e => setFormData({...formData, timeframe: e.target.value})}
                className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="1m">1m</option>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="1h">1h</option>
                <option value="4h">4h</option>
                <option value="1d">1d</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="description" className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="flex min-h-[80px] w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Describe the logic and goals of this strategy..."
              />
            </div>
          </div>
        </section>

        {/* Indicators */}
        <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center">
              <Settings2 className="mr-2 h-5 w-5 text-slate-400" />
              Indicators
            </h2>
            <button
              type="button"
              onClick={addIndicator}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus className="mr-1 h-4 w-4" /> Add Indicator
            </button>
          </div>
          
          <div className="space-y-3">
            {indicators.map((ind, index) => (
              <div key={ind.id} className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800">
                <div className="flex-1 min-w-[120px]">
                  <label className="text-xs text-slate-500 block mb-1">Indicator</label>
                  <select 
                    value={ind.type}
                    onChange={(e) => {
                      const newInd = [...indicators];
                      newInd[index].type = e.target.value;
                      setIndicators(newInd);
                    }}
                    className="w-full h-8 text-sm rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="EMA">EMA</option>
                    <option value="SMA">SMA</option>
                    <option value="RSI">RSI</option>
                    <option value="MACD">MACD</option>
                    <option value="BB">Bollinger Bands</option>
                    <option value="ATR">ATR</option>
                  </select>
                </div>
                <div className="w-24">
                  <label className="text-xs text-slate-500 block mb-1">Length/Params</label>
                  <input 
                    type="number"
                    value={ind.length}
                    onChange={(e) => {
                      const newInd = [...indicators];
                      newInd[index].length = Number(e.target.value);
                      setIndicators(newInd);
                    }}
                    className="w-full h-8 text-sm rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-600 px-2"
                  />
                </div>
                <div className="w-32">
                  <label className="text-xs text-slate-500 block mb-1">Source</label>
                  <select 
                    value={ind.source}
                    onChange={(e) => {
                      const newInd = [...indicators];
                      newInd[index].source = e.target.value;
                      setIndicators(newInd);
                    }}
                    className="w-full h-8 text-sm rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="close">Close</option>
                    <option value="open">Open</option>
                    <option value="high">High</option>
                    <option value="low">Low</option>
                    <option value="hl2">HL2</option>
                    <option value="hlc3">HLC3</option>
                  </select>
                </div>
                <div className="w-32">
                  <label className="text-xs text-slate-500 block mb-1">Alias (Ref)</label>
                  <input 
                    type="text"
                    value={ind.alias}
                    onChange={(e) => {
                      const newInd = [...indicators];
                      newInd[index].alias = e.target.value;
                      setIndicators(newInd);
                    }}
                    className="w-full h-8 text-sm rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-600 px-2"
                  />
                </div>
                <div className="pt-5">
                  <button
                    type="button"
                    onClick={() => removeIndicator(ind.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    aria-label="Remove indicator"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {indicators.length === 0 && (
              <p className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded">
                No indicators added. Click &quot;Add Indicator&quot; to start.
              </p>
            )}
          </div>
        </section>

        {/* Entry Conditions */}
        <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">Entry Conditions</h2>
            <button
              type="button"
              onClick={addEntryCondition}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus className="mr-1 h-4 w-4" /> Add Rule
            </button>
          </div>
          
          <div className="space-y-3">
            {entryConditions.map((cond, index) => (
              <div key={cond.id} className="flex flex-wrap items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-md border border-blue-100 dark:border-blue-900/30">
                <span className="text-sm font-semibold text-slate-500">WHEN</span>
                <select 
                  value={cond.source}
                  onChange={(e) => {
                    const newConds = [...entryConditions];
                    newConds[index].source = e.target.value;
                    setEntryConditions(newConds);
                  }}
                  className="flex-1 min-w-[120px] h-9 text-sm rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-600"
                >
                  <option value="close">Price (Close)</option>
                  <option value="open">Price (Open)</option>
                  <option value="volume">Volume</option>
                  {indicators.map(ind => (
                    <option key={ind.alias} value={ind.alias}>{ind.alias}</option>
                  ))}
                </select>
                
                <select 
                  value={cond.operator}
                  onChange={(e) => {
                    const newConds = [...entryConditions];
                    newConds[index].operator = e.target.value;
                    setEntryConditions(newConds);
                  }}
                  className="w-40 h-9 text-sm rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-600"
                >
                  <option value="crosses_above">Crosses Above</option>
                  <option value="crosses_below">Crosses Below</option>
                  <option value="greater_than">Is Greater Than</option>
                  <option value="less_than">Is Less Than</option>
                  <option value="equal">Is Equal To</option>
                </select>
                
                <input 
                  type="text"
                  placeholder="Value or Indicator"
                  value={cond.value}
                  onChange={(e) => {
                    const newConds = [...entryConditions];
                    newConds[index].value = e.target.value;
                    setEntryConditions(newConds);
                  }}
                  className="flex-1 min-w-[120px] h-9 text-sm rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 focus:ring-2 focus:ring-blue-600"
                />

                <span className="text-sm font-semibold text-slate-500">THEN</span>
                
                <select 
                  value={cond.action}
                  onChange={(e) => {
                    const newConds = [...entryConditions];
                    newConds[index].action = e.target.value;
                    setEntryConditions(newConds);
                  }}
                  className="w-24 h-9 text-sm font-semibold rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-600 text-green-600 dark:text-green-500"
                >
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
                
                <button
                  type="button"
                  onClick={() => removeEntryCondition(cond.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded ml-2"
                  aria-label="Remove condition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Exit Conditions & Position Sizing Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Exit Conditions */}
          <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
            <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">Exit & Risk Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Stop Loss (%)</label>
                <input 
                  type="number"
                  step="0.1"
                  value={exitConditions.stopLoss}
                  onChange={e => setExitConditions({...exitConditions, stopLoss: Number(e.target.value)})}
                  className="w-24 h-9 text-sm rounded border-slate-300 dark:border-slate-700 bg-transparent px-3 text-right focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Take Profit (%)</label>
                <input 
                  type="number"
                  step="0.1"
                  value={exitConditions.takeProfit}
                  onChange={e => setExitConditions({...exitConditions, takeProfit: Number(e.target.value)})}
                  className="w-24 h-9 text-sm rounded border-slate-300 dark:border-slate-700 bg-transparent px-3 text-right focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Trailing Stop</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={exitConditions.trailingStop}
                    onChange={e => setExitConditions({...exitConditions, trailingStop: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </section>

          {/* Position Sizing */}
          <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
            <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">Position Sizing</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sizing Type</label>
                <select 
                  value={positionSizing.type}
                  onChange={e => setPositionSizing({...positionSizing, type: e.target.value})}
                  className="flex h-9 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="risk_based">Risk Based (% of equity)</option>
                  <option value="fixed_qty">Fixed Quantity</option>
                  <option value="fixed_capital">Fixed Capital Amount</option>
                </select>
              </div>
              
              {positionSizing.type === 'risk_based' && (
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Risk per Trade (%)</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={positionSizing.riskPerTrade}
                    onChange={e => setPositionSizing({...positionSizing, riskPerTrade: Number(e.target.value)})}
                    className="w-24 h-9 text-sm rounded border-slate-300 dark:border-slate-700 bg-transparent px-3 text-right focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Max Position Size ($)</label>
                <input 
                  type="number"
                  step="100"
                  value={positionSizing.maxPositionSize}
                  onChange={e => setPositionSizing({...positionSizing, maxPositionSize: Number(e.target.value)})}
                  className="w-32 h-9 text-sm rounded border-slate-300 dark:border-slate-700 bg-transparent px-3 text-right focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </section>

        </div>
      </form>
    </div>
  );
}
