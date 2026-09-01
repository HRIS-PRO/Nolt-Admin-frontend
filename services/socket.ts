import { io, Socket } from 'socket.io-client';
import { apiBase } from '@/lib/api-config';

const URL = apiBase() || undefined;

export const socket: Socket = io(URL as any, {
    withCredentials: true,
    autoConnect: false,
    transports: ['polling', 'websocket']
});
