"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, PenTool, ArrowRight, Save, Play, Edit3, Loader2 } from 'lucide-react';

export default function StrategiesCreatePage() {
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedStrategy, setGeneratedStrategy] = useState<unknown>(null);

  const handleGenerate = async () => {
    if (!description.trim()) return;
    
    setIsGenerating(true);
    // Dummy API call simulation
    setTimeout(() => {
      setGeneratedStrategy({
        name: 'AI Momentum Breakout',
        entry: 'Go long when 50 EMA crosses above 200 EMA and price closes above resistance.',
        exit: 'Trailing stop loss at 2 ATR or when MACD histogram turns negative.',
        risk: '2% account equity per trade.',
        timeframe: '1H',
        assets: 'BTC, ETH'
      });
      setIsGenerating(false);
    }, 2500);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 text-sm">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create Strategy</h1>
        <p className="text-gray-500">
          Build a new trading strategy manually or use AI to generate one from a description.
        </p>
      </div>

      {!generatedStrategy ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Describe Strategy Mode */}
          <div className="border border-gray-200 dark:border-gray-800 p-6 rounded-lg shadow-sm flex flex-col space-y-4 bg-white dark:bg-gray-950">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-medium">Describe Strategy</h2>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              Use natural language to describe your trading logic. Our AI will translate it into a structured strategy.
            </p>
            <textarea
              className="flex-1 w-full min-h-[150px] p-3 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all"
              placeholder="E.g., Buy Bitcoin when the RSI drops below 30 on the 4H timeframe, and sell when it crosses above 70..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isGenerating}
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !description.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex justify-center items-center h-10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Logic...
                </>
              ) : (
                'Generate Strategy'
              )}
            </button>
          </div>

          {/* Manual Builder Mode */}
          <div className="border border-gray-200 dark:border-gray-800 p-6 rounded-lg shadow-sm flex flex-col space-y-4 bg-white dark:bg-gray-950">
            <div className="flex items-center space-x-2">
              <PenTool className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h2 className="text-lg font-medium">Manual Builder</h2>
            </div>
            <p className="text-gray-500 dark:text-gray-400 flex-1">
              Construct your strategy block by block using our visual builder. Define exact indicators, conditions, and risk parameters.
            </p>
            <Link
              href="/strategies/new"
              className="border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 px-4 py-2 rounded-md font-medium transition-colors flex justify-center items-center h-10"
            >
              Open Builder <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-800 p-6 rounded-lg shadow-sm bg-white dark:bg-gray-950 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <div>
              <h2 className="text-xl font-medium flex items-center">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                Generated Strategy
              </h2>
              <p className="text-gray-500 text-sm mt-1">Review the AI-generated logic before saving or testing.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-[120px_1fr] gap-4">
              <div className="text-gray-500 font-medium">Name</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{(generatedStrategy as any).name}</div>
              
              <div className="text-gray-500 font-medium">Entry Logic</div>
              <div className="text-gray-800 dark:text-gray-300">{(generatedStrategy as any).entry}</div>
              
              <div className="text-gray-500 font-medium">Exit Logic</div>
              <div className="text-gray-800 dark:text-gray-300">{(generatedStrategy as any).exit}</div>
              
              <div className="text-gray-500 font-medium">Risk Mgmt</div>
              <div className="text-gray-800 dark:text-gray-300">{(generatedStrategy as any).risk}</div>
              
              <div className="text-gray-500 font-medium">Assets</div>
              <div className="text-gray-800 dark:text-gray-300">{(generatedStrategy as any).assets} ({(generatedStrategy as any).timeframe})</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Link
              href="/strategies/new"
              className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <Edit3 className="w-4 h-4 mr-2" /> Edit Manually
            </Link>
            <button className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
              <Save className="w-4 h-4 mr-2" /> Save Draft
            </button>
            <button className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              <Play className="w-4 h-4 mr-2" /> Run Backtest
            </button>
            <button 
              onClick={() => { setGeneratedStrategy(null); setDescription(''); }}
              className="ml-auto text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 px-4 py-2 transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
