import { io, Socket } from 'socket.io-client';

const URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || undefined;

export const socket: Socket = io(URL as any, {
    withCredentials: true,
    autoConnect: false,
    transports: ['polling', 'websocket']
});
