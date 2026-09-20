import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { getProject } from "../api/projects";
import type { Project } from "../api/projects";

import { getTasks, updateTask } from "../api/tasks";
import type { Task, TaskStatus, TaskPriority } from "../api/tasks";

import CreateTaskForm from "../components/CreateTaskForm";
import TaskDetailsModal from "../components/TaskDetailsModal";

import { getOrganizationMembers } from "../api/organizations";

import type { OrganizationMembership } from "../api/organizations";

import { connectSocket, socket } from "../api/socket";

import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../api/notifications";

import type { Notification } from "../api/notifications";

const availableLabels = [
  { name: "Frontend", color: "#3B82F6" },
  { name: "Backend", color: "#8B5CF6" },
  { name: "Bug", color: "#EF4444" },
  { name: "Feature", color: "#22C55E" },
  { name: "Urgent", color: "#F97316" },
];

const columns: {
  status: TaskStatus;
  title: string;
}[] = [
  {
    status: "TODO",
    title: "To Do",
  },
  {
    status: "IN_PROGRESS",
    title: "In Progress",
  },
  {
    status: "IN_REVIEW",
    title: "In Review",
  },
  {
    status: "DONE",
    title: "Done",
  },
];

function TaskCard({
  task,
  isDragging = false,
  onClick,
}: {
  task: Task;
  isDragging?: boolean;
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "DONE";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`cursor-grab rounded-lg bg-white p-4 shadow-sm transition hover:shadow-md ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <h3 className="font-medium">{task.title}</h3>

      {task.description && (
        <p className="mt-2 text-sm text-gray-500">{task.description}</p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-medium">{task.priority}</span>

        {task.dueDate && (
          <div
            className={`mt-2 text-xs font-medium ${
              isOverdue ? "text-red-600" : "text-gray-500"
            }`}
          >
            {isOverdue ? "Overdue: " : "Due: "}
            {new Date(task.dueDate).toLocaleDateString()}
          </div>
        )}

        {task.labels?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {task.labels.map((label) => (
              <span
                key={label.id}
                className="rounded-full px-2 py-1 text-xs font-medium text-white"
                style={{
                  backgroundColor: label.color,
                }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {task.assignee && (
          <span className="text-xs text-gray-500">
            {task.assignee.name || task.assignee.email}
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  title,
  tasks,
  onTaskClick,
}: {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl p-4 transition ${
        isOver ? "bg-blue-100" : "bg-gray-200"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>

        <span className="rounded-full bg-white px-2 py-1 text-xs">
          {tasks.length}
        </span>
      </div>

      <div className="min-h-32 space-y-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
          />
        ))}

        {tasks.length === 0 && (
          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-gray-500">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectPage() {
  const { projectId } = useParams();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | TaskPriority>(
    "ALL"
  );
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [labelFilter, setLabelFilter] = useState("ALL");

  const [members, setMembers] = useState<OrganizationMembership[]>([]);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        (task.description || "").toLowerCase().includes(query);

      const matchesPriority =
        priorityFilter === "ALL" || task.priority === priorityFilter;

      const matchesAssignee =
        assigneeFilter === "ALL" || task.assigneeId === assigneeFilter;

      const matchesLabel =
        labelFilter === "ALL" ||
        task.labels?.some((label) => label.name === labelFilter);

      return (
        matchesSearch && matchesPriority && matchesAssignee && matchesLabel
      );
    });
  }, [tasks, searchQuery, priorityFilter, assigneeFilter, labelFilter]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    async function loadProject() {
      const accessToken = localStorage.getItem("accessToken");
      const organizationId = localStorage.getItem("organizationId");

      if (!accessToken || !organizationId || !projectId) {
        setError("Authentication or project information is missing.");
        setLoading(false);
        return;
      }

      try {
        const [projectData, taskData, memberData] = await Promise.all([
          getProject(accessToken, organizationId, projectId),
          getTasks(accessToken, organizationId, projectId),
          getOrganizationMembers(accessToken, organizationId),
        ]);

        setProject(projectData);
        setTasks(taskData);
        setMembers(memberData);
      } catch (error: any) {
        setError(error.response?.data?.message || "Failed to load project.");
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [projectId]);

  useEffect(() => {
    async function loadNotifications() {
      const accessToken = localStorage.getItem("accessToken");

      if (!accessToken) return;

      setNotificationsLoading(true);

      try {
        const data = await getNotifications(accessToken);
        setNotifications(data);
      } catch (error) {
        console.error("Failed to load notifications:", error);
      } finally {
        setNotificationsLoading(false);
      }
    }

    loadNotifications();
  }, []);

  useEffect(() => {
    function handleNewNotification(notification: Notification) {
      setNotifications((current) => [notification, ...current]);
    }

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, []);

  useEffect(() => {
    function handleTaskUpdated(task: any) {
      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === task.id ? task : currentTask
        )
      );
    }

    socket.on("task:updated", handleTaskUpdated);

    return () => {
      socket.off("task:updated", handleTaskUpdated);
    };
  }, []);

  useEffect(() => {
    connectSocket();

    function handleConnect() {
      console.log("Socket connected:", socket.id);
    }

    function handleDisconnect() {
      console.log("Socket disconnected");
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.disconnect();
    };
  }, []);

  function handleDragStart(event: any) {
    const task = tasks.find((item) => item.id === event.active.id);

    setActiveTask(task || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);

    const { active, over } = event;

    if (!over) {
      return;
    }

    const taskId = String(active.id);
    const newStatus = String(over.id) as TaskStatus;

    const task = tasks.find((item) => item.id === taskId);

    if (!task || task.status === newStatus) {
      return;
    }

    const accessToken = localStorage.getItem("accessToken");
    const organizationId = localStorage.getItem("organizationId");

    if (!accessToken || !organizationId || !projectId) {
      return;
    }

    const previousTasks = tasks;

    setTasks((currentTasks) =>
      currentTasks.map((item) =>
        item.id === taskId
          ? {
              ...item,
              status: newStatus,
            }
          : item
      )
    );

    try {
      const updatedTask = await updateTask(
        accessToken,
        organizationId,
        projectId,
        taskId,
        {
          status: newStatus,
        }
      );

      setTasks((currentTasks) =>
        currentTasks.map((item) =>
          item.id === updatedTask.id ? updatedTask : item
        )
      );
    } catch (error) {
      console.error("Failed to update task:", error);

      setTasks(previousTasks);

      setError("Failed to move task.");
    }
  }

  async function handleMarkNotificationAsRead(notificationId: string) {
    const accessToken = localStorage.getItem("accessToken");

    if (!accessToken) return;

    try {
      const updatedNotification = await markNotificationAsRead(
        accessToken,
        notificationId
      );

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? updatedNotification
            : notification
        )
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }

  async function handleMarkAllNotificationsAsRead() {
    const accessToken = localStorage.getItem("accessToken");

    if (!accessToken) return;

    try {
      await markAllNotificationsAsRead(accessToken);

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read: true,
        }))
      );
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading project...
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="p-8">
        <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications((current) => !current)}
                className="relative rounded-lg border bg-white p-2 text-gray-600 hover:bg-gray-50"
                aria-label="Notifications"
              >
                🔔
                {notifications.some((notification) => !notification.read) && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {
                      notifications.filter((notification) => !notification.read)
                        .length
                    }
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <h3 className="font-semibold">Notifications</h3>

                    <button
                      type="button"
                      onClick={handleMarkAllNotificationsAsRead}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      Mark all as read
                    </button>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notificationsLoading ? (
                      <p className="p-4 text-sm text-gray-500">
                        Loading notifications...
                      </p>
                    ) : notifications.length === 0 ? (
                      <p className="p-4 text-sm text-gray-500">
                        No notifications yet.
                      </p>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() =>
                            handleMarkNotificationAsRead(notification.id)
                          }
                          className={`w-full border-b px-4 py-3 text-left text-sm hover:bg-gray-50 ${
                            notification.read ? "bg-white" : "bg-blue-50"
                          }`}
                        >
                          <p className="font-medium text-gray-900">
                            {notification.message}
                          </p>

                          {notification.task && (
                            <p className="mt-1 text-xs text-gray-500">
                              Task: {notification.task.title}
                            </p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowCreateTask((current) => !current)}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              {showCreateTask ? "Close" : "+ Add Task"}
            </button>
          </div>

          <div className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />

              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(event.target.value as "ALL" | TaskPriority)
                }
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <option value="ALL">All priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>

              <select
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <option value="ALL">All assignees</option>

                {members.map((member) => (
                  <option key={member.user.id} value={member.user.id}>
                    {member.user.name || member.user.email}
                  </option>
                ))}
              </select>

              <select
                value={labelFilter}
                onChange={(event) => setLabelFilter(event.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <option value="ALL">All labels</option>

                {availableLabels.map((label) => (
                  <option key={label.name} value={label.name}>
                    {label.name}
                  </option>
                ))}
              </select>
            </div>

            {(searchQuery ||
              priorityFilter !== "ALL" ||
              assigneeFilter !== "ALL" ||
              labelFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPriorityFilter("ALL");
                  setAssigneeFilter("ALL");
                  setLabelFilter("ALL");
                }}
                className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Clear filters
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        {showCreateTask && (
          <CreateTaskForm
            projectId={project.id}
            onTaskCreated={(task) => {
              setTasks((currentTasks) => [task, ...currentTasks]);
              setShowCreateTask(false);
            }}
            onCancel={() => setShowCreateTask(false)}
          />
        )}

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {columns.map((column) => {
              // IMPORTANT:
              // Use filteredTasks instead of tasks.
              const columnTasks = filteredTasks.filter(
                (task) => task.status === column.status
              );

              return (
                <KanbanColumn
                  key={column.status}
                  status={column.status}
                  title={column.title}
                  tasks={columnTasks}
                  onTaskClick={setSelectedTask}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
          </DragOverlay>
        </DndContext>

        {selectedTask && (
          <TaskDetailsModal
            task={selectedTask}
            projectId={project.id}
            onClose={() => setSelectedTask(null)}
            onTaskUpdated={(updatedTask) => {
              setTasks((currentTasks) =>
                currentTasks.map((item) =>
                  item.id === updatedTask.id ? updatedTask : item
                )
              );

              setSelectedTask(updatedTask);
            }}
            onTaskDeleted={(taskId) => {
              setTasks((currentTasks) =>
                currentTasks.filter((item) => item.id !== taskId)
              );

              setSelectedTask(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
