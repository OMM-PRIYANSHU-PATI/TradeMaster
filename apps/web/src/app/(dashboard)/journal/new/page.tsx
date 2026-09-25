'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewJournalPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    reviewType: 'TRADE',
    notes: '',
    emotion: '',
    setup: '',
    entryReason: '',
    exitReason: '',
    marketCondition: '',
    mistakes: '',
    ruleAdherence: '',
    tags: '',
    attachments: ''
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        attachments: formData.attachments ? formData.attachments.split(',').map(t => t.trim()).filter(Boolean) : []
      };

      const res = await fetch('/api/v1/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to save');
      }
      
      router.push('/journal');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Journal Entry</h1>
      {error && <div className="mb-4 text-red-600 bg-red-50 p-3 rounded">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input 
              type="text" 
              className="w-full border rounded p-2" 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Review Type</label>
            <select 
              className="w-full border rounded p-2"
              value={formData.reviewType}
              onChange={e => setFormData({...formData, reviewType: e.target.value})}
            >
              <option value="TRADE">Trade</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea 
            className="w-full border rounded p-2 h-32" 
            value={formData.notes} 
            onChange={e => setFormData({...formData, notes: e.target.value})} 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Emotion</label>
            <input type="text" className="w-full border rounded p-2" value={formData.emotion} onChange={e => setFormData({...formData, emotion: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Setup</label>
            <input type="text" className="w-full border rounded p-2" value={formData.setup} onChange={e => setFormData({...formData, setup: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Market Condition</label>
            <input type="text" className="w-full border rounded p-2" value={formData.marketCondition} onChange={e => setFormData({...formData, marketCondition: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Mistakes</label>
            <textarea className="w-full border rounded p-2" value={formData.mistakes} onChange={e => setFormData({...formData, mistakes: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Rule Adherence</label>
            <textarea className="w-full border rounded p-2" value={formData.ruleAdherence} onChange={e => setFormData({...formData, ruleAdherence: e.target.value})} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
          <input type="text" className="w-full border rounded p-2" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Attachments (comma separated URLs)</label>
          <input type="text" className="w-full border rounded p-2" value={formData.attachments} onChange={e => setFormData({...formData, attachments: e.target.value})} />
        </div>

        <div className="flex gap-4">
          <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Entry'}
          </button>
          <button type="button" onClick={() => router.push('/journal')} className="bg-gray-200 text-gray-800 px-6 py-2 rounded font-medium hover:bg-gray-300">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
