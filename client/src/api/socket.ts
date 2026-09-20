import { io } from "socket.io-client";

export const socket = io("http://localhost:4000", {
  autoConnect: false,
});

export function connectSocket() {
  const accessToken = localStorage.getItem("accessToken");

  if (!accessToken) {
    return;
  }

  socket.auth = {
    token: accessToken,
  };

  socket.connect();
}
