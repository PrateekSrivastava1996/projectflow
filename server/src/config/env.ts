import "dotenv/config";

const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

if (!accessSecret) {
  throw new Error("JWT_ACCESS_SECRET is not defined");
}

if (!refreshSecret) {
  throw new Error("JWT_REFRESH_SECRET is not defined");
}

export const env = {
  jwtAccessSecret: accessSecret,
  jwtRefreshSecret: refreshSecret,
};
