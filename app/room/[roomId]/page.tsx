'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import { useSocket } from '@/hooks/useSocket';

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
    const { roomId } = use(params);
    const router = useRouter();
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [inputUrl, setInputUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Sync Handler
    const handleSyncData = useCallback((data: any) => {
        switch (data.type) {
            case 'sa_init': // Server Authoritative Init
            case 'PLAY':
            case 'PAUSE':
            case 'SEEK':
            case 'URL_CHANGE':
                if (data.videoSource) setVideoUrl(data.videoSource);
                setIsPlaying(data.isPlaying);
                setCurrentTime(data.currentTime); // You might want to account for network latency roughly here
                setPlaybackRate(data.playbackRate || 1);
                break;
            default:
                break;
        }
    }, []);

    const { emitSync, isConnected } = useSocket(roomId, handleSyncData);

    // Handlers for Player Events
    const onPlay = () => emitSync('PLAY', { isPlaying: true, currentTime, playbackRate });
    const onPause = () => emitSync('PAUSE', { isPlaying: false, currentTime, playbackRate });
    const onSeek = (seconds: number) => {
        setCurrentTime(seconds); // Optimistic update
        emitSync('SEEK', { isPlaying, currentTime: seconds, playbackRate });
    };
    const onProgress = ({ playedSeconds }: { playedSeconds: number }) => {
        // Periodic sync update if finding drift?
        // For now, Player component handles drift check against `currentTime`.
        // We could update local state so if we pause, we know where we are.
        setCurrentTime(playedSeconds);
    };

    const handleUrlSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputUrl) return;
        setVideoUrl(inputUrl);
        emitSync('URL_CHANGE', { isPlaying, currentTime, playbackRate, videoSource: inputUrl, videoType: 'url' });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);

        try {
            // 1. Get Presigned URL (or upload to server proxy as per current controller)
            // Current controller: /api/upload/presigned-upload
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

            // For MVP we are using the proxy logic or presigned if implemented. 
            // The uploadController I wrote has /presigned-upload for R2.

            const res = await fetch(`${apiBase}/api/upload/presigned-upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: file.name, fileType: file.type })
            });

            const { uploadUrl, fileKey } = await res.json();

            // 2. Upload to R2
            await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type }
            });

            // 3. Get View URL (if private) or construct public URL
            // If public bucket: https://pub-xxxx.r2.dev/key
            // If using /video/:key endpoint:
            const viewRes = await fetch(`${apiBase}/api/upload/video/${fileKey}`);
            const { url } = await viewRes.json();

            setVideoUrl(url);
            emitSync('URL_CHANGE', { isPlaying: false, currentTime: 0, playbackRate: 1, videoSource: url, videoType: 'upload' });

        } catch (err) {
            console.error("Upload failed", err);
            alert('Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30">
            {/* Header */}
            <header className="border-b border-white/10 p-4 flex justify-between items-center bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <h1 className="font-bold text-xl tracking-tight bg-linear-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                        WatchiParty
                    </h1>
                    <div className="px-3 py-1 bg-zinc-900 rounded-full text-xs font-mono text-zinc-400 border border-zinc-800">
                        ROOM: <span className="text-white select-all">{roomId}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/')}
                        className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-red-400 border border-red-500/20 bg-red-500/10 rounded-full hover:bg-red-500 hover:text-white transition-all"
                    >
                        Leave
                    </button>
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                    <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold hidden sm:block">
                        {isConnected ? 'Live Sync' : 'Offline'}
                    </span>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto p-4 lg:p-8 grid gap-8">
                <VideoPlayer
                    url={videoUrl}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    playbackRate={playbackRate}
                    onProgress={onProgress}
                    onPlay={onPlay}
                    onPause={onPause}
                    onSeek={onSeek}
                />

                {/* Controls */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Source Control */}
                    <div className="space-y-4 p-6 bg-zinc-900/50 rounded-2xl border border-white/5">
                        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Video Source</h3>

                        <div className="space-y-4">
                            {/* URL Input */}
                            <form onSubmit={handleUrlSubmit} className="flex gap-2">
                                <input
                                    type="url"
                                    placeholder="Paste YouTube / Direct Link"
                                    value={inputUrl}
                                    onChange={(e) => setInputUrl(e.target.value)}
                                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                                />
                                <button className="bg-white text-black px-4 py-2 rounded-xl text-sm font-bold hover:bg-zinc-200 transition-colors">
                                    Load
                                </button>
                            </form>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-zinc-800" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-zinc-900 px-2 text-zinc-500">Or upload file</span>
                                </div>
                            </div>

                            {/* File Upload */}
                            <label className={`block w-full cursor-pointer group ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
                                <div className="border-2 border-dashed border-zinc-800 rounded-xl p-8 text-center transition-colors group-hover:border-indigo-500/50 group-hover:bg-zinc-800/50">
                                    {isUploading ? (
                                        <span className="text-indigo-400 animate-pulse">Uploading to Cloudflare R2...</span>
                                    ) : (
                                        <span className="text-zinc-500 group-hover:text-zinc-300">Click to upload Video (MP4/WebM)</span>
                                    )}
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Room Info / Chat Placeholder */}
                    <div className="p-6 bg-zinc-900/50 rounded-2xl border border-white/5 flex flex-col justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Room Stats</h3>
                            <div className="space-y-2 text-sm text-zinc-300">
                                <div className="flex justify-between">
                                    <span>Status</span>
                                    <span className={isPlaying ? 'text-green-400' : 'text-yellow-400'}>{isPlaying ? 'Playing' : 'Paused'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Time</span>
                                    <span className="font-mono">{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                            <p className="text-xs text-indigo-300 text-center">
                                💡 Tip: Anyone in the room can control playback.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
