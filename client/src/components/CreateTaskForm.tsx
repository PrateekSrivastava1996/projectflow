import { useState } from "react";

import { createTask, type TaskPriority, type TaskStatus } from "../api/tasks";

interface CreateTaskFormProps {
  projectId: string;
  onTaskCreated: (task: Awaited<ReturnType<typeof createTask>>) => void;
  onCancel: () => void;
}

export default function CreateTaskForm({
  projectId,
  onTaskCreated,
  onCancel,
}: CreateTaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [status, setStatus] = useState<TaskStatus>("TODO");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    const accessToken = localStorage.getItem("accessToken");

    const organizationId = localStorage.getItem("organizationId");

    if (!accessToken || !organizationId) {
      setError("Authentication information is missing.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const task = await createTask(accessToken, organizationId, projectId, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
      });

      onTaskCreated(task);

      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setStatus("TODO");
    } catch (error: any) {
      setError(error.response?.data?.message || "Failed to create task.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 rounded-xl bg-white p-6 shadow-sm"
    >
      <div className="mb-5">
        <h2 className="text-xl font-semibold">Create Task</h2>

        <p className="mt-1 text-sm text-gray-500">
          Add a new task to this project.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>

          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Build login page"
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the task..."
            rows={3}
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Priority</label>

            <select
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as TaskPriority)
              }
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as TaskStatus)}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DONE">Done</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Task"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border px-4 py-2 font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
