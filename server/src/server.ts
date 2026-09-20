import "dotenv/config";
import { createServer } from "http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import app from "./app";
import { env } from "./config/env";
import { setSocketIO } from "./lib/socket";
import { prisma } from "./lib/prisma";

const PORT = 4000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

setSocketIO(io);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (typeof token !== "string") {
    return next(new Error("Authentication required"));
  }

  try {
    const payload = jwt.verify(token, env.jwtAccessSecret);

    if (typeof payload === "string" || !payload.userId) {
      return next(new Error("Invalid access token"));
    }

    socket.data.userId = payload.userId;

    next();
  } catch {
    next(new Error("Invalid or expired access token"));
  }
});

io.on("connection", async (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  const userId = socket.data.userId as string;

  socket.join(`user:${userId}`);

  console.log(`Socket joined user room: user:${userId}`);

  const memberships = await prisma.membership.findMany({
    where: {
      userId,
    },
    select: {
      organizationId: true,
    },
  });

  for (const membership of memberships) {
    socket.join(`organization:${membership.organizationId}`);
  }

  console.log(
    `Socket joined ${memberships.length} organization room(s) for user:${userId}`
  );

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
