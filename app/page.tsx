'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const router = useRouter();
  const [joinId, setJoinId] = useState('');

  const handleCreateRoom = async () => {
    try {
      // We could call the backend to create a room entry if we want strict validation
      // or just generate an ID and let the backend handle the first join as creation.
      // The backend `roomRouter.post('/create')` exists, let's use it properly.
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/rooms/create`, {
        method: 'POST'
      });
      const data = await res.json();
      router.push(`/room/${data.roomId}`);
    } catch (err) {
      console.error("Failed to create room", err);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinId.trim()) {
      router.push(`/room/${joinId.trim()}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 lg:p-24 bg-zinc-950 text-white selection:bg-indigo-500 selection:text-white">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col gap-8 lg:gap-12">
        <div className="text-center space-y-4 animate-in fade-in zoom-in duration-700">
          <h1 className="text-4xl lg:text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
            Anisync - Watch Live with Friends
          </h1>
          <p className="text-zinc-400 text-lg lg:text-xl max-w-lg mx-auto">
            Synchronize video playback with friends. Low latency. No sign-up required.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 lg:gap-6 w-full max-w-md animate-in slide-in-from-bottom-5 duration-700 delay-200">
          {/* Create Room */}
          <button
            onClick={handleCreateRoom}
            className="flex-1 group relative px-8 py-4 bg-zinc-900 rounded-2xl border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-800 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative text-lg font-bold text-zinc-100 group-hover:text-white">
              Create Room
            </span>
          </button>

          {/* Join Room */}
          <form onSubmit={handleJoinRoom} className="flex-1 flex flex-col gap-2">
            <input
              type="text"
              placeholder="Enter Room ID"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              className="w-full px-6 py-4 bg-zinc-900 rounded-2xl border border-zinc-800 text-center text-lg placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-all"
            />
            <button
              type="submit"
              disabled={!joinId}
              className="w-full py-2 text-sm font-medium text-zinc-500 hover:text-indigo-400 disabled:opacity-50 transition-colors"
            >
              Join Existing →
            </button>
          </form>
        </div>
      </div>

      <div className="absolute bottom-10 text-zinc-800 text-xs">
        © 2026 Er. Anish Chaulagain.
      </div>
    </main>
  );
}
