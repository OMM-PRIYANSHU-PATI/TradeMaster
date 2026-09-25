'use client';
import { useState } from 'react';

export default function AiCoachPage() {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
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

      setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      <h1 className="text-3xl font-bold mb-6">AI Trading Coach</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto mb-4 border rounded p-4 bg-gray-50 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="text-gray-500 text-center mt-10">
            Ask me anything about your trading, strategies, or backtests.
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`p-4 rounded-lg max-w-[80%] ${msg.role === 'user' ? 'bg-blue-600 text-white self-end' : 'bg-white border self-start'}`}>
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          ))
        )}
        {loading && (
          <div className="bg-white border self-start p-4 rounded-lg">
            Thinking...
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
