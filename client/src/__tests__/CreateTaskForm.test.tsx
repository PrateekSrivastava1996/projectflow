import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CreateTaskForm from "../components/CreateTaskForm";

describe("CreateTaskForm", () => {
  it("renders the task creation form", () => {
    render(
      <CreateTaskForm
        projectId="project-1"
        onTaskCreated={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Create Task" })
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText("e.g. Build login page")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Task" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });
    
  it("shows an error when the title is empty", async () => {
    const user = await import("@testing-library/user-event");

    render(
      <CreateTaskForm
        projectId="project-1"
        onTaskCreated={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const userEvent = user.default.setup();

    await userEvent.click(screen.getByRole("button", { name: "Create Task" }));

    expect(screen.getByText("Task title is required.")).toBeInTheDocument();
  });
});
