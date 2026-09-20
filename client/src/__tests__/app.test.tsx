import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

describe("ProjectFlow client", () => {
  it("renders a heading", () => {
    render(<h1>ProjectFlow</h1>);

    expect(
      screen.getByRole("heading", { name: "ProjectFlow" })
    ).toBeInTheDocument();
  });
});
