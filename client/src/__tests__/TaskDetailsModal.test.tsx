import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TaskDetailsModal from "../components/TaskDetailsModal";
import type { Task } from "../api/tasks";

const mockTask: Task = {
  id: "task-1",
  title: "Build login page",
  description: "Implement the login UI",
  projectId: "project-1",
  status: "IN_PROGRESS",
  priority: "HIGH",
  assigneeId: null,
  dueDate: null,
  labels: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  assignee: null,
};

describe("TaskDetailsModal", () => {
  it("renders task details", () => {
    render(
      <TaskDetailsModal
        task={mockTask}
        projectId="project-1"
        onClose={vi.fn()}
        onTaskUpdated={vi.fn()}
        onTaskDeleted={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue("Build login page")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Implement the login UI")
    ).toBeInTheDocument();
  });
});
