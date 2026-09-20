import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CreateTaskForm from "../components/CreateTaskForm";
import { createTask } from "../api/tasks";

vi.mock("../api/tasks", async () => {
  const actual = await vi.importActual<typeof import("../api/tasks")>(
    "../api/tasks"
  );

  return {
    ...actual,
    createTask: vi.fn(),
  };
});

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

  it("creates a task with the entered values", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();

    const mockTask = {
      id: "task-1",
      title: "Build login page",
      description: "Implement the login UI",
      projectId: "project-1",
      status: "IN_PROGRESS" as const,
      priority: "HIGH" as const,
      assigneeId: null,
      dueDate: null,
      labels: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      assignee: null,
    };

    vi.mocked(createTask).mockResolvedValue(mockTask);

    localStorage.setItem("accessToken", "test-access-token");
    localStorage.setItem("organizationId", "org-1");

    const onTaskCreated = vi.fn();

    render(
      <CreateTaskForm
        projectId="project-1"
        onTaskCreated={onTaskCreated}
        onCancel={vi.fn()}
      />
    );

    await user.type(
      screen.getByPlaceholderText("e.g. Build login page"),
      "Build login page"
    );

    await user.type(
      screen.getByPlaceholderText("Describe the task..."),
      "Implement the login UI"
    );

    await user.selectOptions(screen.getByLabelText("Priority"), "HIGH");
    await user.selectOptions(screen.getByLabelText("Status"), "IN_PROGRESS");

    await user.click(screen.getByRole("button", { name: "Create Task" }));

    expect(createTask).toHaveBeenCalledWith(
      "test-access-token",
      "org-1",
      "project-1",
      {
        title: "Build login page",
        description: "Implement the login UI",
        priority: "HIGH",
        status: "IN_PROGRESS",
      }
    );

    expect(onTaskCreated).toHaveBeenCalledWith(mockTask);
  });
});
