import jwt from "jsonwebtoken";
import { env } from "../config/env";

export function createAccessToken(userId: string) {
  return jwt.sign(
    {
      userId,
    },
    env.jwtAccessSecret,
    {
      expiresIn: "15m",
    }
  );
}

export function createRefreshToken(userId: string) {
  return jwt.sign(
    {
      userId,
    },
    env.jwtRefreshSecret,
    {
      expiresIn: "7d",
    }
  );
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.jwtRefreshSecret);
}