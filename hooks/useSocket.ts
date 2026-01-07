import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export const useSocket = (roomId: string, onSync: (data: any) => void) => {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Initialize socket connection
        socketRef.current = io(SOCKET_URL, {
            transports: ['websocket'], // Force WebSocket for better performance
            reconnectionAttempts: 5,
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('Connected to WebSocket');
            setIsConnected(true);
            // Join the room upon connection
            socket.emit('join_room', roomId);
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket');
            setIsConnected(false);
        });

        socket.on('sync', (data: any) => {
            console.log('Received sync event:', data);
            onSync(data);
        });

        return () => {
            socket.disconnect();
        };
    }, [roomId, onSync]);

    const emitSync = (type: string, data: any) => {
        if (socketRef.current) {
            socketRef.current.emit('update_state', { ...data, roomId, type });
        }
    };

    return { socket: socketRef.current, isConnected, emitSync };
};
