import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export const useSocket = (roomId: string, onSync: (data: any) => void) => {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [username, setUsername] = useState<string>('');
    const [messages, setMessages] = useState<any[]>([]);

    useEffect(() => {
        // Initialize socket connection
        socketRef.current = io(SOCKET_URL, {
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
            onSync(data);
        });

        socket.on('your_name', (name: string) => {
            setUsername(name);
        });

        socket.on('receive_message', (message: any) => {
            setMessages((prev) => [...prev, message]);
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

    const sendMessage = (text: string) => {
        if (socketRef.current) {
            socketRef.current.emit('send_message', { roomId, text });
        }
    };

    return { socket: socketRef.current, isConnected, emitSync, username, messages, sendMessage };
};
