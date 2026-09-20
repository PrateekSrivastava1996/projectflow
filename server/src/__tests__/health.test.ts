import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app";

describe("GET /api/health", () => {
  it("returns the API health status", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      message: "ProjectFlow API is running",
    });
  });
});
