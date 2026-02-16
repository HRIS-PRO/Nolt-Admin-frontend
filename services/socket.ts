import { io, Socket } from 'socket.io-client';

// Use env var (for direct connection) or default to window.location (for proxy/rewrite)
// In production, VITE_BACKEND_URL should be set OR vercel.json rewrite must be present.
const URL = import.meta.env.VITE_BACKEND_URL || undefined;

export const socket: Socket = io(URL, {
    withCredentials: true,
    autoConnect: false,
    transports: ['polling', 'websocket']
});
