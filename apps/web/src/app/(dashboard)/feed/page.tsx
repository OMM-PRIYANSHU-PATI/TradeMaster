"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ThumbsUp, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  TrendingUp, 
  Activity, 
  Layers, 
  History, 
  MonitorPlay,
  MoreHorizontal
} from 'lucide-react';

type PostType = 'TEXT' | 'STRATEGY' | 'BACKTEST' | 'VIRTUAL';

interface Post {
  id: string;
  author: {
    name: string;
    handle: string;
    avatar: string;
  };
  type: PostType;
  timestamp: string;
  content: string;
  metrics?: {
    returnPct?: number;
    cagr?: number;
    winRate?: number;
    trades?: number;
    maxDrawdown?: number;
  };
  resourceName?: string;
  likes: number;
  comments: number;
  saved?: boolean;
}

const initialDummyPosts: Post[] = [
  {
    id: '1',
    author: { name: 'Sarah Chen', handle: '@schen_algo', avatar: 'SC' },
    type: 'STRATEGY',
    timestamp: '2h ago',
    content: 'Just published a new mean-reversion strategy targeting mid-cap tech stocks. The underlying logic uses a customized Bollinger Band width filter to avoid consolidating markets.',
    resourceName: 'Tech Mean Reversion v2.1',
    likes: 124,
    comments: 18,
  },
  {
    id: '2',
    author: { name: 'Marcus Trading', handle: '@marcus_t', avatar: 'MT' },
    type: 'BACKTEST',
    timestamp: '5h ago',
    content: 'Ran a 5-year backtest on the Momentum Breakout strategy through the recent bear market. Surprisingly resilient results given the market conditions.',
    resourceName: 'Momentum Breakout 5Y SPY',
    metrics: {
      returnPct: 142.5,
      cagr: 19.4,
      winRate: 58.2,
      trades: 342,
      maxDrawdown: -12.4
    },
    likes: 89,
    comments: 12,
  },
  {
    id: '3',
    author: { name: 'Elena Rodriguez', handle: '@erodriguez', avatar: 'ER' },
    type: 'TEXT',
    timestamp: '8h ago',
    content: 'Market structure is looking interesting this week. Implied volatility is dropping across the board, which might create some cheap options setups for earnings season.',
    likes: 210,
    comments: 45,
  },
  {
    id: '4',
    author: { name: 'David Kim', handle: '@dk_quant', avatar: 'DK' },
    type: 'VIRTUAL',
    timestamp: '1d ago',
    content: 'After 3 months of forward testing in the virtual environment, the Volatility Scalper has maintained parity with the backtest results. Moving this to live capital next week.',
    resourceName: 'Vol Scalper Q3 Forward',
    metrics: {
      returnPct: 12.8,
      winRate: 64.5,
      trades: 1120,
      maxDrawdown: -4.2
    },
    likes: 342,
    comments: 56,
  }
];

export default function HomeFeedPage() {
  const [posts, setPosts] = useState<Post[]>(initialDummyPosts);
  const [newPostContent, setNewPostContent] = useState("");

  const handlePost = () => {
    if (!newPostContent.trim()) return;

    const newPost: Post = {
      id: Date.now().toString(),
      author: { name: 'Test User', handle: '@test_user', avatar: 'TU' },
      type: 'TEXT',
      timestamp: 'Just now',
      content: newPostContent,
      likes: 0,
      comments: 0,
    };

    setPosts([newPost, ...posts]);
    setNewPostContent("");
  };

  // Define action handlers
  const handleLike = (id: string) => {
    setPosts(posts.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));
  };

  const handleSave = (id: string) => {
    setPosts(posts.map(p => p.id === id ? { ...p, saved: !p.saved } : p));
  };

  const handleShare = () => {
    alert("Post link copied to clipboard!");
  };

  const handleComment = (id: string) => {
    // For now just increment comments to show interactivity
    setPosts(posts.map(p => p.id === id ? { ...p, comments: p.comments + 1 } : p));
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Home Feed</h1>
        <p className="text-neutral-400 text-sm">Discover strategies, insights, and performance updates from the quantitative trading community.</p>
      </div>

      {/* New Post Input */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
            TU
          </div>
          <div className="flex-1 space-y-3">
            <textarea 
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Share an insight, strategy, or backtest result..." 
              className="w-full bg-transparent text-neutral-200 placeholder-neutral-500 border-none focus:ring-0 resize-none outline-none"
              rows={2}
            />
            <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
              <div className="flex gap-2">
                <button type="button" className="p-2 text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors">
                  <Layers className="w-4 h-4" />
                </button>
                <button type="button" className="p-2 text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors">
                  <History className="w-4 h-4" />
                </button>
                <button type="button" className="p-2 text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors">
                  <MonitorPlay className="w-4 h-4" />
                </button>
              </div>
              <button 
                onClick={handlePost}
                disabled={!newPostContent.trim()}
                className="px-4 py-1.5 bg-emerald-500 disabled:opacity-50 text-neutral-950 font-semibold text-sm rounded-md hover:bg-emerald-400 transition-colors"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {posts.map(post => (
          <div key={post.id} className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
            <div className="p-5">
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-bold text-neutral-300 shrink-0">
                    {post.author.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-200">{post.author.name}</span>
                      <span className="text-neutral-500 text-sm">{post.author.handle}</span>
                      <span className="text-neutral-600 text-sm">•</span>
                      <span className="text-neutral-500 text-sm">{post.timestamp}</span>
                    </div>
                    {post.type !== 'TEXT' && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                          post.type === 'STRATEGY' ? 'bg-indigo-500/10 text-indigo-400' :
                          post.type === 'BACKTEST' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {post.type}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button className="text-neutral-500 hover:text-white">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <Link href={`/feed/${post.id}`} className="block hover:opacity-80 transition-opacity">
                <p className="text-neutral-300 text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                  {post.content}
                </p>

                {/* Rich Card */}
                {post.type !== 'TEXT' && (
                  <div className="mb-4 border border-neutral-800 rounded-lg overflow-hidden">
                    <div className="bg-neutral-950 p-3 border-b border-neutral-800 flex items-center gap-2">
                      {post.type === 'STRATEGY' ? <Layers className="w-4 h-4 text-indigo-400" /> :
                       post.type === 'BACKTEST' ? <History className="w-4 h-4 text-amber-400" /> :
                       <MonitorPlay className="w-4 h-4 text-emerald-400" />}
                      <span className="font-medium text-sm text-neutral-200">{post.resourceName}</span>
                    </div>
                    
                    {post.metrics && (
                      <div className="bg-neutral-900/50 p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {post.metrics.returnPct !== undefined && (
                          <div>
                            <div className="text-xs text-neutral-500 mb-1">Total Return</div>
                            <div className="text-lg font-medium text-emerald-400">+{post.metrics.returnPct}%</div>
                          </div>
                        )}
                        {post.metrics.cagr !== undefined && (
                          <div>
                            <div className="text-xs text-neutral-500 mb-1">CAGR</div>
                            <div className="text-lg font-medium text-neutral-200">{post.metrics.cagr}%</div>
                          </div>
                        )}
                        {post.metrics.winRate !== undefined && (
                          <div>
                            <div className="text-xs text-neutral-500 mb-1">Win Rate</div>
                            <div className="text-lg font-medium text-neutral-200">{post.metrics.winRate}%</div>
                          </div>
                        )}
                        {post.metrics.maxDrawdown !== undefined && (
                          <div>
                            <div className="text-xs text-neutral-500 mb-1">Max Drawdown</div>
                            <div className="text-lg font-medium text-rose-400">{post.metrics.maxDrawdown}%</div>
                          </div>
                        )}
                      </div>
                    )}
                    {post.type === 'STRATEGY' && !post.metrics && (
                      <div className="bg-neutral-900/50 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-neutral-400">
                          <div className="flex items-center gap-1.5"><Activity className="w-4 h-4" /> Active Status</div>
                          <div className="flex items-center gap-1.5"><TrendingUp className="w-4 h-4" /> Equity focused</div>
                        </div>
                        <span className="text-sm text-white font-medium underline">View Strategy</span>
                      </div>
                    )}
                  </div>
                )}
              </Link>
            </div>

            {/* Actions */}
            <div className="px-5 py-3 border-t border-neutral-800 flex items-center justify-between text-neutral-400">
              <button onClick={() => handleLike(post.id)} className="flex items-center gap-2 hover:text-emerald-400 transition-colors text-sm font-medium">
                <ThumbsUp className="w-4 h-4" /> {post.likes}
              </button>
              <button onClick={() => handleComment(post.id)} className="flex items-center gap-2 hover:text-blue-400 transition-colors text-sm font-medium">
                <MessageSquare className="w-4 h-4" /> {post.comments}
              </button>
              <button onClick={handleShare} className="flex items-center gap-2 hover:text-indigo-400 transition-colors text-sm font-medium">
                <Share2 className="w-4 h-4" /> Share
              </button>
              <button onClick={() => handleSave(post.id)} className={`flex items-center gap-2 transition-colors text-sm font-medium ${post.saved ? 'text-amber-400' : 'hover:text-amber-400'}`}>
                <Bookmark className={`w-4 h-4 ${post.saved ? 'fill-amber-400' : ''}`} /> {post.saved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
