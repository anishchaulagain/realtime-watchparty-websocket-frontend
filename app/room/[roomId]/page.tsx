'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import ChatBox from '@/components/ChatBox';
import { useSocket } from '@/hooks/useSocket';
import { Check, Copy } from 'lucide-react';

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
    const { roomId } = use(params);
    const router = useRouter();
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [inputUrl, setInputUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [copied, setCopied] = useState(false);
    // Sync Handler
    const handleSyncData = useCallback((data: any) => {
        switch (data.type) {
            case 'sa_init':
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

    const { emitSync, isConnected, username, messages, sendMessage } = useSocket(roomId, handleSyncData);

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
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

            // Use server-side proxy upload to bypass CORS issues with R2
            const formData = new FormData();
            formData.append('video', file);

            const res = await fetch(`${apiBase}/api/upload/proxy-upload`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(`Upload failed: ${errorData.error || res.statusText}`);
            }

            const { url } = await res.json();

            setVideoUrl(url);
            emitSync('URL_CHANGE', { isPlaying: false, currentTime: 0, playbackRate: 1, videoSource: url, videoType: 'upload' });

        } catch (err) {
            console.error("Upload failed", err);
            const errorMessage = err instanceof Error ? err.message : 'Upload failed';
            alert(errorMessage);
        } finally {
            setIsUploading(false);
        }
    };
    const copyRoomId = async () => {
        await navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return (
        <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30">
            {/* Header */}
            <header className="border-b border-white/10 p-4 flex justify-between items-center bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <h1 className="font-bold text-xl tracking-tight bg-linear-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                        Anisync
                    </h1>
                    <div className="px-3 py-1 bg-zinc-900 rounded-full text-xs font-mono text-zinc-400 border border-zinc-800">
                        <div className='flex gap-2'>
                            <h1>ROOM:</h1>
                            <span className="text-white select-all">{roomId}</span>
                            <button
                                onClick={copyRoomId}
                                className="hover:text-green-400 transition"
                                title="Copy Room ID"
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        </div>
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
            <main className="max-w-[1400px] mx-auto p-4 lg:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[calc(100vh-80px)]">

                {/* Left Column (Video & Controls) - Spans 3 columns on LG */}
                <div className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col gap-6">
                    {/* Video Player Section */}
                    <div className="w-full">
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
                    </div>

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
                </div>

                {/* Right Column (Chat) - Spans 1 column on LG, Full height */}
                <div className="
    col-span-1 
    md:col-span-2 
    lg:col-span-1
    min-h-[420px]
    lg:max-h-[75vh]
">
                    <ChatBox
                        username={username}
                        messages={messages}
                        onSendMessage={sendMessage}
                        className="h-full"
                    />
                </div>
            </main>
        </div>
    );
}
