import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

interface VideoPlayerProps {
    url: string | null;
    isPlaying: boolean;
    currentTime: number; // The target time from server
    playbackRate: number;
    onProgress: (state: { playedSeconds: number }) => void;
    onPlay: () => void;
    onPause: () => void;
    onSeek: (seconds: number) => void;
    isHost?: boolean; // If we want host-only controls later
}

const SYNC_THRESHOLD = 0.5; // Seconds

export default function VideoPlayer({
    url,
    isPlaying,
    currentTime,
    playbackRate,
    onProgress,
    onPlay,
    onPause,
    onSeek,
}: VideoPlayerProps) {
    const playerRef = useRef<typeof ReactPlayer>(null);
    const [localPlaying, setLocalPlaying] = useState(isPlaying);

    // Ref to track if the seek was initiated by the user or the socket to prevent loops
    const isSeekingRef = useRef(false);

    // Sync Play/Pause
    useEffect(() => {
        setLocalPlaying(isPlaying);
    }, [isPlaying]);

    // Sync Playback Rate
    useEffect(() => {
        // react-player handles playbackRate prop naturally
    }, [playbackRate]);

    // Sync Time (Drift Correction)
    useEffect(() => {
        if (!playerRef.current || !url) return;

        const currentLocalTime = playerRef.current.getCurrentTime();
        const diff = Math.abs(currentLocalTime - currentTime);

        if (diff > SYNC_THRESHOLD) {
            console.log(`Drift detected (${diff}s). Seeking to ${currentTime}`);
            playerRef.current.seekTo(currentTime, 'seconds');
        }
    }, [currentTime, url]);

    // Handle User Actions
    const handlePlay = () => {
        setLocalPlaying(true);
        onPlay();
    };

    const handlePause = () => {
        setLocalPlaying(false);
        onPause();
    };

    const handleSeek = (seconds: number) => {
        // Logic to distinguish local seek vs remote seek can be tricky.
        // We rely on the player's internal check or just emit.
        onSeek(seconds);
    };

    if (!url) {
        return (
            <div className="w-full aspect-video bg-gray-900 flex items-center justify-center text-white">
                Waiting for video source...
            </div>
        );
    }

    return (
        <div className="w-full aspect-video bg-black rounded-lg overflow-hidden shadow-xl">
            <ReactPlayer
                ref={playerRef}
                url={url}
                playing={localPlaying}
                playbackRate={playbackRate}
                controls={true}
                width="100%"
                height="100%"
                onPlay={handlePlay}
                onPause={handlePause}
                onProgress={onProgress}
                onSeek={handleSeek}
                progressInterval={500} // Frequent updates for checking drift potentially, or just use built-in
            />
        </div>
    );
}
