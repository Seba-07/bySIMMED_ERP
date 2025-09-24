import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
      });

      this.socket.on('connect', () => {
        console.log('Connected to server');
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from server');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
      });
    }

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  joinRoom(room: string): void {
    if (this.socket) {
      this.socket.emit('join-room', room);
    }
  }

  emitInventoryUpdate(data: any): void {
    if (this.socket) {
      this.socket.emit('inventory-updated', data);
    }
  }

  onInventoryChange(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('inventory-changed', callback);
    }
  }

  offInventoryChange(): void {
    if (this.socket) {
      this.socket.off('inventory-changed');
    }
  }
}

export const socketService = new SocketService();
export default socketService;