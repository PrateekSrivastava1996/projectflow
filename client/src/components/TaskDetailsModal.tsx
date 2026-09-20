import { useEffect, useState } from "react";

import { getOrganizationMembers } from "../api/organizations";

import type { OrganizationMembership } from "../api/organizations";

import { deleteTask, updateTask } from "../api/tasks";

import type { Task, TaskPriority, TaskStatus } from "../api/tasks";

import { getTaskActivities, type TaskActivity } from "../api/activities";

import {
  createTaskComment,
  deleteTaskComment,
  getTaskComments,
  updateTaskComment,
} from "../api/comments";

import type { TaskComment } from "../api/comments";

interface TaskDetailsModalProps {
  task: Task;
  projectId: string;
  onClose: () => void;
  onTaskUpdated: (task: Task) => void;
  onTaskDeleted: (taskId: string) => void;
}

const availableLabels = [
  { name: "Frontend", color: "#3B82F6" },
  { name: "Backend", color: "#8B5CF6" },
  { name: "Bug", color: "#EF4444" },
  { name: "Feature", color: "#22C55E" },
  { name: "Urgent", color: "#F97316" },
];

export default function TaskDetailsModal({
  task,
  projectId,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
}: TaskDetailsModalProps) {
  const [title, setTitle] = useState(task.title);

  const [description, setDescription] = useState(task.description || "");

  const [priority, setPriority] = useState<TaskPriority>(task.priority);

  const [status, setStatus] = useState<TaskStatus>(task.status);

  const [assigneeId, setAssigneeId] = useState<string>(task.assigneeId || "");

  const [dueDate, setDueDate] = useState(
    task.dueDate ? task.dueDate.slice(0, 10) : ""
  );

  const [members, setMembers] = useState<OrganizationMembership[]>([]);

  const [selectedLabels, setSelectedLabels] = useState<
    {
      name: string;
      color: string;
    }[]
  >(task.labels || []);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [commentUpdating, setCommentUpdating] = useState(false);
  const [commentDeletingId, setCommentDeletingId] = useState<string | null>(
    null
  );

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority);
    setStatus(task.status);

    setAssigneeId(task.assigneeId || "");

    setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");

    setSelectedLabels(task.labels || []);

    setError("");
  }, [task]);

  useEffect(() => {
    async function loadMembers() {
      const accessToken = localStorage.getItem("accessToken");

      const organizationId = localStorage.getItem("organizationId");

      if (!accessToken || !organizationId) {
        return;
      }

      try {
        const organizationMembers = await getOrganizationMembers(
          accessToken,
          organizationId
        );

        setMembers(organizationMembers);
      } catch (error) {
        console.error("Failed to load organization members:", error);
      }
    }

    loadMembers();
  }, []);

  useEffect(() => {
    async function loadActivities() {
      const accessToken = localStorage.getItem("accessToken");
      const organizationId = localStorage.getItem("organizationId");

      if (!accessToken || !organizationId) {
        return;
      }

      try {
        const taskActivities = await getTaskActivities(
          accessToken,
          organizationId,
          projectId,
          task.id
        );

        setActivities(taskActivities);
      } catch (error) {
        console.error("Failed to load task activities:", error);
      }
    }

    loadActivities();
  }, [projectId, task.id]);

  useEffect(() => {
    async function loadComments() {
      const accessToken = localStorage.getItem("accessToken");
      const organizationId = localStorage.getItem("organizationId");

      if (!accessToken || !organizationId) {
        return;
      }

      setCommentLoading(true);

      try {
        const taskComments = await getTaskComments(
          accessToken,
          organizationId,
          projectId,
          task.id
        );

        setComments(taskComments);
      } catch (error) {
        console.error("Failed to load task comments:", error);
      } finally {
        setCommentLoading(false);
      }
    }

    loadComments();
  }, [projectId, task.id]);

  function toggleLabel(label: { name: string; color: string }) {
    setSelectedLabels((currentLabels) => {
      const exists = currentLabels.some((item) => item.name === label.name);

      if (exists) {
        return currentLabels.filter((item) => item.name !== label.name);
      }

      return [...currentLabels, label];
    });
  }

  async function handleSave() {
    const accessToken = localStorage.getItem("accessToken");

    const organizationId = localStorage.getItem("organizationId");

    if (!accessToken || !organizationId) {
      setError("Authentication information is missing.");
      return;
    }

    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const updatedTask = await updateTask(
        accessToken,
        organizationId,
        projectId,
        task.id,
        {
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          status,
          assigneeId: assigneeId || null,
          dueDate: dueDate || null,
          labels: selectedLabels,
        }
      );

      onTaskUpdated(updatedTask);
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.message || "Failed to update task.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) {
      return;
    }

    const accessToken = localStorage.getItem("accessToken");

    const organizationId = localStorage.getItem("organizationId");

    if (!accessToken || !organizationId) {
      setError("Authentication information is missing.");
      return;
    }

    setDeleting(true);
    setError("");

    try {
      await deleteTask(accessToken, organizationId, projectId, task.id);

      onTaskDeleted(task.id);
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.message || "Failed to delete task.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddComment() {
    const content = newComment.trim();

    if (!content) return;

    const accessToken = localStorage.getItem("accessToken");
    const organizationId = localStorage.getItem("organizationId");

    if (!accessToken || !organizationId) return;

    setCommentSubmitting(true);

    try {
      const comment = await createTaskComment(
        accessToken,
        organizationId,
        projectId,
        task.id,
        content
      );

      setComments((current) => [comment, ...current]);
      setNewComment("");
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setCommentSubmitting(false);
    }
  }

  function startEditingComment(comment: TaskComment) {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
  }

  function cancelEditingComment() {
    setEditingCommentId(null);
    setEditingCommentText("");
  }

  async function handleUpdateComment(commentId: string) {
    const content = editingCommentText.trim();

    if (!content) return;

    const accessToken = localStorage.getItem("accessToken");
    const organizationId = localStorage.getItem("organizationId");

    if (!accessToken || !organizationId) return;

    setCommentUpdating(true);

    try {
      const updatedComment = await updateTaskComment(
        accessToken,
        organizationId,
        projectId,
        task.id,
        commentId,
        content
      );

      setComments((current) =>
        current.map((comment) =>
          comment.id === commentId ? updatedComment : comment
        )
      );

      cancelEditingComment();
    } catch (error) {
      console.error("Failed to update comment:", error);
    } finally {
      setCommentUpdating(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    const accessToken = localStorage.getItem("accessToken");
    const organizationId = localStorage.getItem("organizationId");

    if (!accessToken || !organizationId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this comment?"
    );

    if (!confirmed) return;

    setCommentDeletingId(commentId);

    try {
      await deleteTaskComment(
        accessToken,
        organizationId,
        projectId,
        task.id,
        commentId
      );

      setComments((current) =>
        current.filter((comment) => comment.id !== commentId)
      );
    } catch (error) {
      console.error("Failed to delete comment:", error);
    } finally {
      setCommentDeletingId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">Task Details</h2>

            <p className="mt-1 text-sm text-gray-500">
              Edit your task information.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
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
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Description
            </label>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
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
                onChange={(event) =>
                  setStatus(event.target.value as TaskStatus)
                }
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Assignee</label>

            <select
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="">Unassigned</option>

              {members.map((member) => (
                <option key={member.user.id} value={member.user.id}>
                  {member.user.name || member.user.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Due Date</label>

            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Labels</label>

            <div className="flex flex-wrap gap-2">
              {availableLabels.map((label) => {
                const selected = selectedLabels.some(
                  (item) => item.name === label.name
                );

                return (
                  <button
                    key={label.name}
                    type="button"
                    onClick={() => toggleLabel(label)}
                    className="rounded-full border px-3 py-1 text-sm font-medium transition"
                    style={{
                      backgroundColor: selected ? label.color : "white",
                      color: selected ? "white" : label.color,
                      borderColor: label.color,
                    }}
                  >
                    {selected ? "✓ " : ""}
                    {label.name}
                  </button>
                );
              })}
            </div>
            {selectedLabels.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium text-gray-500">
                  Selected labels
                </p>

                <div className="flex flex-wrap gap-2">
                  {selectedLabels.map((label) => (
                    <span
                      key={label.name}
                      className="rounded-full px-3 py-1 text-xs font-medium text-white"
                      style={{
                        backgroundColor: label.color,
                      }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Activity
            </h3>

            {activities.length === 0 ? (
              <p className="text-sm text-gray-500">No activity yet.</p>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />

                    <div>
                      <p className="text-sm text-gray-800">
                        {activity.details}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {activity.user.name || activity.user.email} ·{" "}
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t pt-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Comments
            </h3>

            {commentLoading ? (
              <p className="text-sm text-gray-500">Loading comments...</p>
            ) : (
              <>
                <div className="mb-4">
                  <textarea
                    value={newComment}
                    onChange={(event) => setNewComment(event.target.value)}
                    placeholder="Write a comment..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />

                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddComment}
                      disabled={commentSubmitting || !newComment.trim()}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {commentSubmitting ? "Adding..." : "Add Comment"}
                    </button>
                  </div>
                </div>

                {comments.length === 0 ? (
                  <p className="text-sm text-gray-500">No comments yet.</p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {comment.user.name || comment.user.email}
                          </p>

                          <p className="text-xs text-gray-500">
                            {new Date(comment.createdAt).toLocaleString()}
                          </p>
                        </div>

                        {editingCommentId === comment.id ? (
                          <div className="mt-3">
                            <textarea
                              value={editingCommentText}
                              onChange={(event) =>
                                setEditingCommentText(event.target.value)
                              }
                              rows={3}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                            />

                            <div className="mt-2 flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={cancelEditingComment}
                                disabled={commentUpdating}
                                className="rounded-lg border px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
                              >
                                Cancel
                              </button>

                              <button
                                type="button"
                                onClick={() => handleUpdateComment(comment.id)}
                                disabled={
                                  commentUpdating || !editingCommentText.trim()
                                }
                                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {commentUpdating ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="mt-2 text-sm text-gray-700">
                              {comment.content}
                            </p>

                            <div className="mt-3 flex justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => startEditingComment(comment)}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comment.id)}
                                disabled={commentDeletingId === comment.id}
                                className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                              >
                                {commentDeletingId === comment.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg px-4 py-2 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Task"}
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 font-medium hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
