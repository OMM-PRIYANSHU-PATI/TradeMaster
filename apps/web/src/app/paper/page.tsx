/* eslint-disable */
'use client';
import { useState, useEffect } from 'react';

export default function PaperDashboard() {
  const [account, setAccount] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [instruments, setInstruments] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  
  const [selectedInst, setSelectedInst] = useState('');
  const [side, setSide] = useState('BUY');
  const [type, setType] = useState('MARKET');
  const [quantity, setQuantity] = useState('1');
  const [limitPrice, setLimitPrice] = useState('');
  
  const [message, setMessage] = useState('');

  const fetchDashboard = async () => {
    try {
      const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(url + '/api/v1/paper/accounts', { credentials: 'include' });
      let accounts = await res.json();
      
      if (!accounts || accounts.length === 0) {
        const createRes = await fetch(url + '/api/v1/paper/accounts', { method: 'POST', credentials: 'include' });
        const newAcc = await createRes.json();
        accounts = [newAcc];
      }
      
      const acc = accounts[0];
      setAccount(acc);

      const pRes = await fetch(url + `/api/v1/paper/accounts/${acc.id}/portfolio`, { credentials: 'include' });
      setPortfolio(await pRes.json());

      const lRes = await fetch(url + `/api/v1/paper/accounts/${acc.id}/ledger`, { credentials: 'include' });
      setLedger(await lRes.json());
      
      const oRes = await fetch(url + `/api/v1/paper/accounts/${acc.id}/orders`, { credentials: 'include' });
      setOrders(await oRes.json());
      
      const iRes = await fetch(url + '/api/v1/instruments', { credentials: 'include' });
      const insts = await iRes.json();
      setInstruments(insts);
      
      if (insts.length > 0 && !selectedInst) setSelectedInst(insts[0].id);
      
      for (const inst of insts) {
        const qRes = await fetch(url + `/api/v1/market-data/instruments/${inst.id}/quote`, { credentials: 'include' });
        if (qRes.ok) {
           const quote = await qRes.json();
           inst.currentPrice = quote.price;
        }
      }
      setInstruments([...insts]);
    } catch (e) { 
        console.error(e); 
        setMessage('Failed to load dashboard');
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const placeOrder = async () => {
    setMessage('Submitting order...');
    try {
      const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const body: any = { instrumentId: selectedInst, side, type, quantity };
      if (type === 'LIMIT') body.limitPrice = limitPrice;

      const res = await fetch(url + `/api/v1/paper/accounts/${account.id}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (res.ok) {
         setMessage('Order submitted successfully!');
      } else {
         setMessage('Order failed: ' + (data.message || JSON.stringify(data)));
      }
      fetchDashboard();
    } catch(e: any) {
      setMessage('Error submitting order: ' + e.message);
    }
  };

  const cancelOrder = async (orderId: string) => {
    setMessage('Cancelling order...');
    try {
        const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(url + `/api/v1/paper/orders/${orderId}/cancel`, { method: 'POST', credentials: 'include' });
        if (res.ok) setMessage('Order cancelled successfully!');
        else setMessage('Failed to cancel order.');
        fetchDashboard();
    } catch(e: any) {
        setMessage('Error cancelling order: ' + e.message);
    }
  };

  if (!account) return <div>Loading...</div>;

  return (
    <div className="flex flex-col gap-8 p-4">
      {message && <div className="bg-blue-100 text-blue-800 p-2 rounded">{message}</div>}

      <div className="border p-4 bg-gray-50 rounded">
        <h2 className="text-xl font-bold">Account Overview</h2>
        <p>Cash Balance: ${portfolio?.cashBalance}</p>
        <p>Position Value: ${portfolio?.totalPositionValue}</p>
        <p>Portfolio Value: ${portfolio?.totalPortfolioValue}</p>
        <p>Gross Realized P&L: ${portfolio?.grossRealizedPnl}</p>
        <p>Unrealized P&L: ${portfolio?.unrealizedPnl}</p>
        <p>Total Fees: ${portfolio?.totalFees}</p>
        <p>Net P&L: ${portfolio?.netPnl}</p>
      </div>

      <div className="border p-4 bg-white rounded">
        <h2 className="text-xl font-bold mb-4">Trade</h2>
        <div className="flex gap-4 items-center flex-wrap">
          <select value={selectedInst} onChange={e => setSelectedInst(e.target.value)} className="border p-2">
            {(instruments as any[]).map(i => <option key={i.id} value={i.id}>{i.symbol} (${i.currentPrice || '---'})</option>)}
          </select>
          <select value={side} onChange={e => setSide(e.target.value)} className="border p-2">
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
          <select value={type} onChange={e => setType(e.target.value)} className="border p-2">
            <option value="MARKET">MARKET</option>
            <option value="LIMIT">LIMIT</option>
          </select>
          <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Quantity" className="border p-2 w-24" />
          {type === 'LIMIT' && (
             <input type="number" value={limitPrice} onChange={e => setLimitPrice(e.target.value)} placeholder="Limit Price" className="border p-2 w-24" />
          )}
          <button onClick={placeOrder} className="bg-blue-600 text-white px-4 py-2 rounded">Submit Order</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border p-4 rounded">
          <h2 className="text-xl font-bold">Positions</h2>
          <ul>
            {portfolio?.positions?.map((p: any) => (
              <li key={p.id} className="mb-2 border-b pb-2">
                <b>{p.instrument.symbol}</b>: {p.quantity} shares @ {p.averageEntryPrice} <br/>
                Market Value: ${p.marketValue} | Unrlz: ${p.unrealizedPnl} | Rlz: ${p.realizedPnl}
              </li>
            ))}
          </ul>
        </div>
        <div className="border p-4 rounded">
          <h2 className="text-xl font-bold">Recent Orders</h2>
          <ul>
            {orders.slice(0,5).map(o => (
              <li key={o.id} className="mb-2 border-b pb-2 flex justify-between">
                <span>{o.side} {o.quantity} {o.type} - <b>{o.status}</b></span>
                {o.status === 'OPEN' && <button className="text-red-500" onClick={() => cancelOrder(o.id)}>Cancel</button>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border p-4 rounded">
        <h2 className="text-xl font-bold">Ledger</h2>
        <ul>
          {(ledger as any[]).map(l => (
            <li key={l.id} className="mb-1 text-sm border-b py-1">
              {new Date(l.createdAt).toLocaleString()} | {l.type} | Amount: ${l.amount} | {l.description}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
