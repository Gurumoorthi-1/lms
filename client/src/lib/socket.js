import { io } from 'socket.io-client';

const socket = io('http://127.0.0.1:5002', {
  autoConnect: true,
  reconnection: true,
});

export default socket;
