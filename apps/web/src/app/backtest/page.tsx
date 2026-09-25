
'use client';
import { useState, useEffect } from 'react';

type Strategy = { id: string; name: string; type: string; configuration: unknown; };
type Instrument = { id: string; symbol: string; };
type BacktestMetrics = { 
  netPnl: string; 
  totalReturn: string; 
  totalTrades: number; 
  winRate: string; 
  profitFactor: string; 
  maxDrawdownPercent: string; 
  maxDrawdown: string; 
  totalFees: string; 
};
type BacktestTrade = { 
  id: string; 
  instrumentId: string; 
  side: string; 
  quantity: string; 
  entryPrice: string; 
  exitPrice?: string; 
  netPnl: string; 
  fees: string; 
};
type BacktestRun = {
  createdAt?: string;
  id: string;
  status: string;
  metrics: BacktestMetrics;
  trades: BacktestTrade[];
};


export default function BacktestDashboard() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [runs, setRuns] = useState<BacktestRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<BacktestRun | null>(null);
  const [runTrades, setRunTrades] = useState<BacktestTrade[]>([]);
  
  const [strategyId, setStrategyId] = useState('');
  const [instrumentId, setInstrumentId] = useState('');
  const [startDate, setStartDate] = useState('2020-01-01');
  const [endDate, setEndDate] = useState('2020-04-10');
  const [initialCapital, setInitialCapital] = useState('100000');
  const [message, setMessage] = useState('');

  // Strategy Builder State
  const [newStrategyName, setNewStrategyName] = useState('');
  const [newStrategyType, setNewStrategyType] = useState('MOVING_AVERAGE_CROSSOVER');
  const [maConfig, setMaConfig] = useState({ fastPeriod: 5, slowPeriod: 10, quantity: '10' });
  const [rsiConfig, setRsiConfig] = useState({ period: 14, oversold: 30, overbought: 70, quantity: '10' });
  const [macdConfig, setMacdConfig] = useState({ fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, quantity: '10' });
  const [bbConfig, setBbConfig] = useState({ period: 20, stdDevMultiplier: 2, quantity: '10' });

  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchData = async () => {
    try {
      const sRes = await fetch(url + '/api/v1/strategies', { credentials: 'include' });
      const strats: Strategy[] = await sRes.json();
      setStrategies(strats);
      if (strats.length > 0) setStrategyId(prev => prev || strats[0].id);

      const iRes = await fetch(url + '/api/v1/instruments', { credentials: 'include' });
      const insts: Instrument[] = await iRes.json();
      setInstruments(insts);
      if (insts.length > 0) setInstrumentId(prev => prev || insts[0].id);

      const rRes = await fetch(url + '/api/v1/backtests', { credentials: 'include' });
      const rData: BacktestRun[] = await rRes.json();
      setRuns(rData);
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const sRes = await fetch(url + '/api/v1/strategies', { credentials: 'include' });
        const strats: Strategy[] = await sRes.json();
        if (cancelled) return;
        setStrategies(strats);
        if (strats.length > 0) setStrategyId(prev => prev || strats[0].id);

        const iRes = await fetch(url + '/api/v1/instruments', { credentials: 'include' });
        const insts: Instrument[] = await iRes.json();
        if (cancelled) return;
        setInstruments(insts);
        if (insts.length > 0) setInstrumentId(prev => prev || insts[0].id);

        const rRes = await fetch(url + '/api/v1/backtests', { credentials: 'include' });
        const rData: BacktestRun[] = await rRes.json();
        if (cancelled) return;
        setRuns(rData);
      } catch(e) { console.error(e); }
    };
    init();
    return () => { cancelled = true; };
  }, [url]);

  const createStrategy = async () => {
    let configuration: Record<string, unknown> = {};
    if (newStrategyType === 'MOVING_AVERAGE_CROSSOVER') configuration = { ...maConfig, fastPeriod: Number(maConfig.fastPeriod), slowPeriod: Number(maConfig.slowPeriod) };
    if (newStrategyType === 'RSI_THRESHOLD') configuration = { ...rsiConfig, period: Number(rsiConfig.period), oversold: Number(rsiConfig.oversold), overbought: Number(rsiConfig.overbought) };
    if (newStrategyType === 'MACD_CROSSOVER') configuration = { ...macdConfig, fastPeriod: Number(macdConfig.fastPeriod), slowPeriod: Number(macdConfig.slowPeriod), signalPeriod: Number(macdConfig.signalPeriod) };
    if (newStrategyType === 'BOLLINGER_BAND') configuration = { ...bbConfig, period: Number(bbConfig.period), stdDevMultiplier: Number(bbConfig.stdDevMultiplier) };
    if (newStrategyType === 'CUSTOM_RULE_COMBINATION') {
      configuration = {
        quantity: '10',
        buyCondition: {
          operator: 'GREATER_THAN',
          left: { type: 'PRICE', field: 'close' },
          right: { type: 'INDICATOR', name: 'SMA', config: { period: 5 } }
        }
      };
    }

    const res = await fetch(url + '/api/v1/strategies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: newStrategyName || 'My Strategy',
        description: 'Created from UI',
        type: newStrategyType,
        configuration
      })
    });
    if (res.ok) {
        setMessage('Strategy created');
        fetchData();
    } else {
        const e = await res.json();
        setMessage('Error: ' + JSON.stringify(e));
    }
  };

  const runBacktest = async () => {
    setMessage('Running backtest...');
    const res = await fetch(url + '/api/v1/backtests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ strategyId, instrumentId, startDate, endDate, initialCapital })
    });
    if (res.ok) {
      setMessage('Backtest completed!');
      fetchData();
    } else {
      const e = await res.json();
      setMessage('Error: ' + JSON.stringify(e));
    }
  };

  const loadRunDetails = async (id: string) => {
    const r = await fetch(url + '/api/v1/backtests/' + id, { credentials: 'include' });
    setSelectedRun(await r.json());
    const t = await fetch(url + '/api/v1/backtests/' + id + '/trades', { credentials: 'include' });
    setRunTrades(await t.json());
  };

  return (
    <div className="flex flex-col gap-8 p-4">
      {message && <div className="bg-blue-100 text-blue-800 p-2 rounded">{message}</div>}

      <div className="border p-4 bg-gray-50 rounded">
        <h2 className="text-xl font-bold mb-4">Create Strategy</h2>
        
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex gap-4">
            <input type="text" placeholder="Strategy Name" value={newStrategyName} onChange={e => setNewStrategyName(e.target.value)} className="border p-2" />
            <select value={newStrategyType} onChange={e => setNewStrategyType(e.target.value)} className="border p-2">
              <option value="MOVING_AVERAGE_CROSSOVER">Moving Average Crossover</option>
              <option value="RSI_THRESHOLD">RSI Threshold</option>
              <option value="MACD_CROSSOVER">MACD Crossover</option>
              <option value="BOLLINGER_BAND">Bollinger Bands</option>
              <option value="CUSTOM_RULE_COMBINATION">Custom Rules (Simple Preset)</option>
            </select>
          </div>
          
          {newStrategyType === 'MOVING_AVERAGE_CROSSOVER' && (
            <div className="flex gap-4">
              <input type="number" placeholder="Fast Period" value={maConfig.fastPeriod} onChange={e => setMaConfig({...maConfig, fastPeriod: Number(e.target.value)})} className="border p-2" />
              <input type="number" placeholder="Slow Period" value={maConfig.slowPeriod} onChange={e => setMaConfig({...maConfig, slowPeriod: Number(e.target.value)})} className="border p-2" />
              <input type="text" placeholder="Quantity" value={maConfig.quantity} onChange={e => setMaConfig({...maConfig, quantity: e.target.value})} className="border p-2" />
            </div>
          )}

          {newStrategyType === 'RSI_THRESHOLD' && (
            <div className="flex gap-4">
              <input type="number" placeholder="Period" value={rsiConfig.period} onChange={e => setRsiConfig({...rsiConfig, period: Number(e.target.value)})} className="border p-2" />
              <input type="number" placeholder="Oversold" value={rsiConfig.oversold} onChange={e => setRsiConfig({...rsiConfig, oversold: Number(e.target.value)})} className="border p-2" />
              <input type="number" placeholder="Overbought" value={rsiConfig.overbought} onChange={e => setRsiConfig({...rsiConfig, overbought: Number(e.target.value)})} className="border p-2" />
              <input type="text" placeholder="Quantity" value={rsiConfig.quantity} onChange={e => setRsiConfig({...rsiConfig, quantity: e.target.value})} className="border p-2" />
            </div>
          )}

          {newStrategyType === 'MACD_CROSSOVER' && (
            <div className="flex gap-4">
              <input type="number" placeholder="Fast Period" value={macdConfig.fastPeriod} onChange={e => setMacdConfig({...macdConfig, fastPeriod: Number(e.target.value)})} className="border p-2" />
              <input type="number" placeholder="Slow Period" value={macdConfig.slowPeriod} onChange={e => setMacdConfig({...macdConfig, slowPeriod: Number(e.target.value)})} className="border p-2" />
              <input type="number" placeholder="Signal Period" value={macdConfig.signalPeriod} onChange={e => setMacdConfig({...macdConfig, signalPeriod: Number(e.target.value)})} className="border p-2" />
              <input type="text" placeholder="Quantity" value={macdConfig.quantity} onChange={e => setMacdConfig({...macdConfig, quantity: e.target.value})} className="border p-2" />
            </div>
          )}

          {newStrategyType === 'BOLLINGER_BAND' && (
            <div className="flex gap-4">
              <input type="number" placeholder="Period" value={bbConfig.period} onChange={e => setBbConfig({...bbConfig, period: Number(e.target.value)})} className="border p-2" />
              <input type="number" placeholder="Std Dev Multiplier" value={bbConfig.stdDevMultiplier} onChange={e => setBbConfig({...bbConfig, stdDevMultiplier: Number(e.target.value)})} className="border p-2" />
              <input type="text" placeholder="Quantity" value={bbConfig.quantity} onChange={e => setBbConfig({...bbConfig, quantity: e.target.value})} className="border p-2" />
            </div>
          )}

          <button onClick={createStrategy} className="bg-green-600 text-white px-4 py-2 rounded self-start">Save Strategy</button>
        </div>
      </div>

      <div className="border p-4 bg-gray-50 rounded">
        <h2 className="text-xl font-bold mb-4">Run New Backtest</h2>
        
        <div className="flex gap-4 items-center flex-wrap mb-4">
          <select value={strategyId} onChange={e => setStrategyId(e.target.value)} className="border p-2">
            <option value="">Select Strategy</option>
            {strategies.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
          </select>

          <select value={instrumentId} onChange={e => setInstrumentId(e.target.value)} className="border p-2">
            <option value="">Select Instrument</option>
            {instruments.map(i => <option key={i.id} value={i.id}>{i.symbol}</option>)}
          </select>
          
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border p-2" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border p-2" />
          <input type="number" value={initialCapital} onChange={e => setInitialCapital(e.target.value)} placeholder="Initial Capital" className="border p-2 w-32" />
          
          <button onClick={runBacktest} className="bg-blue-600 text-white px-4 py-2 rounded">Run Backtest</button>
        </div>
        
        <p className="text-xs text-gray-500 italic">Disclaimer: Backtest results are simulated and do not represent real-world trading performance. Past performance is not indicative of future results.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border p-4 rounded">
          <h2 className="text-xl font-bold">History</h2>
          <ul>
            {runs.map(r => (
              <li key={r.id} className="mb-2 border-b pb-2 cursor-pointer text-blue-600" onClick={() => loadRunDetails(r.id)}>
                {new Date(r.createdAt!).toLocaleString()} - {r.status}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="text-xl font-bold">Results</h2>
          {selectedRun?.metrics ? (
            <div>
              <p>Net P&L: ${selectedRun.metrics.netPnl}</p>
              <p>Return: {selectedRun.metrics.totalReturn}%</p>
              <p>Total Trades: {selectedRun.metrics.totalTrades}</p>
              <p>Win Rate: {selectedRun.metrics.winRate}%</p>
              <p>Profit Factor: {selectedRun.metrics.profitFactor}</p>
              <p>Max Drawdown: {selectedRun.metrics.maxDrawdownPercent}% (${selectedRun.metrics.maxDrawdown})</p>
              <p>Total Fees: ${selectedRun.metrics.totalFees}</p>
              <button className="mt-4 bg-purple-600 text-white px-4 py-2 rounded block w-full text-center" onClick={async () => { setMessage('Explaining with AI...'); try { const res = await fetch(url + '/api/v1/ai/backtests/' + selectedRun.id + '/explain', { method: 'POST', credentials: 'include' }); if (res.ok) { const data = await res.json(); setMessage('AI: ' + data.response); } else { const data = await res.json(); setMessage('AI Error: ' + data.message); } } catch (e) { setMessage('AI Error: ' + String(e)); } }}>Explain with AI</button><h3 className="font-bold mt-4">Trades</h3>
              <ul className="h-64 overflow-y-auto">
                {runTrades.map(t => (
                  <li key={t.id} className="text-sm border-b py-1">
                    {t.side} {t.quantity} - In: ${t.entryPrice} Out: ${t.exitPrice} - P&L: ${t.netPnl}
                  </li>
                ))}
              </ul>
            </div>
          ) : <p>Select a run to view details.</p>}
        </div>
      </div>
    </div>
  );
}
