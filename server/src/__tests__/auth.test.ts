import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app";

describe("Authentication", () => {
  it("rejects requests without an access token", async () => {
    const response = await request(app).post(
      "/api/projects/test-project/tasks"
    );
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Authorization header is required",
    });
  });
});
