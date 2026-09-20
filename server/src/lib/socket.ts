import type { Server } from "socket.io";

let io: Server | null = null;

export function setSocketIO(server: Server) {
  io = server;
}

export function getSocketIO() {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
}
