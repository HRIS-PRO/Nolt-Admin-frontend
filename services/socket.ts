import { io, Socket } from 'socket.io-client';

const URL = undefined; // Use window.location (goes through Vite proxy)

export const socket: Socket = io(URL, {
    withCredentials: true,
    autoConnect: false,
    transports: ['polling', 'websocket']
});
