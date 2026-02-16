import { io, Socket } from 'socket.io-client';

const URL = "https://nolt-admin-backend-production.up.railway.app" // Use env var or default to window.location

export const socket: Socket = io(URL, {
    withCredentials: true,
    autoConnect: false,
    transports: ['polling', 'websocket']
});
