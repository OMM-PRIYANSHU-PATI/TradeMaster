'use client';
import { useState } from 'react';

interface AiInsightResponse {
  summary: string;
  observations: string[];
  explanations: string[];
  risks: string[];
  learningPoints: string[];
  suggestedActions: string[];
  confidence: 'low' | 'medium' | 'high';
  dataLimitations: string[];
}

// AiTradeReviewResponse used when trade review UI is implemented

export default function AiCoachPage() {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; data?: AiInsightResponse; raw?: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', raw: userMessage }]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to get AI response');
      }

      setMessages(prev => [...prev, { role: 'ai', data }]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (endpoint: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/ai/${endpoint}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to get AI response');
      setMessages(prev => [...prev, { role: 'ai', data }]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">AI Trading Coach (Phase 10)</h1>
        <div className="flex gap-2">
          <button onClick={() => handleAction('journal/analyze')} className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm hover:bg-gray-300">Analyze Journal Patterns</button>
          {/* Note: Strategy/Trade/Backtest endpoints require an ID parameter which would normally come from route params or a selector */}
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto mb-4 border rounded p-4 bg-gray-50 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="text-gray-500 text-center mt-10">
            Ask me anything about your trading, strategies, or backtests. 
            <br />I analyze authoritative financial data and return structured insights.
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`p-4 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white self-end max-w-[80%]' : 'bg-white border self-start w-full'}`}>
              {msg.role === 'user' ? (
                <div className="whitespace-pre-wrap">{msg.raw}</div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="font-bold text-lg mb-2">Summary</h3>
                    <p>{msg.data?.summary}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {msg.data?.observations && msg.data.observations.length > 0 && (
                      <div className="bg-blue-50 p-3 rounded">
                        <h4 className="font-bold mb-1">Observations</h4>
                        <ul className="list-disc pl-5 text-sm">{msg.data.observations.map((o, idx) => <li key={idx}>{o}</li>)}</ul>
                      </div>
                    )}
                    {msg.data?.risks && msg.data.risks.length > 0 && (
                      <div className="bg-red-50 p-3 rounded">
                        <h4 className="font-bold mb-1">Risks</h4>
                        <ul className="list-disc pl-5 text-sm">{msg.data.risks.map((r, idx) => <li key={idx}>{r}</li>)}</ul>
                      </div>
                    )}
                    {msg.data?.learningPoints && msg.data.learningPoints.length > 0 && (
                      <div className="bg-green-50 p-3 rounded">
                        <h4 className="font-bold mb-1">Learning Points</h4>
                        <ul className="list-disc pl-5 text-sm">{msg.data.learningPoints.map((l, idx) => <li key={idx}>{l}</li>)}</ul>
                      </div>
                    )}
                    {msg.data?.suggestedActions && msg.data.suggestedActions.length > 0 && (
                      <div className="bg-yellow-50 p-3 rounded">
                        <h4 className="font-bold mb-1">Suggested Actions</h4>
                        <ul className="list-disc pl-5 text-sm">{msg.data.suggestedActions.map((a, idx) => <li key={idx}>{a}</li>)}</ul>
                      </div>
                    )}
                  </div>
                  
                  {msg.data?.dataLimitations && msg.data.dataLimitations.length > 0 && (
                    <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                      <strong>Limitations:</strong> {msg.data.dataLimitations.join(' | ')}
                    </div>
                  )}
                  {msg.data?.confidence && (
                    <div className="text-xs text-gray-400">
                      Confidence Level: {msg.data.confidence.toUpperCase()}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="bg-white border self-start p-4 rounded-lg">
            Analyzing authoritative data...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          className="border p-3 rounded flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}
