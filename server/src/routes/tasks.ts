import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import {
  OrganizationRequest,
  requireOrganization,
} from "../middleware/organization";
import { requireRole } from "../middleware/role";
import { TaskPriority, TaskStatus } from "../generated/prisma/enums";
import { getSocketIO } from "../lib/socket";

const router = Router();

/**
 * Create a task
 */
router.post(
  "/projects/:projectId/tasks",
  requireAuth,
  requireOrganization,
  async (req: OrganizationRequest, res) => {
    try {
      const projectId = req.params.projectId;

      if (typeof projectId !== "string") {
        return res.status(400).json({
          message: "Invalid project ID",
        });
      }

      const {
        title,
        description,
        priority,
        status,
        assigneeId,
        dueDate,
        labels,
      } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({
          message: "Task title is required",
        });
      }

      // Make sure the project belongs to the current organization.
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          organizationId: req.organizationId!,
        },
      });

      if (!project) {
        return res.status(404).json({
          message: "Project not found",
        });
      }

      // If an assignee was provided, make sure they belong
      // to the current organization.
      if (assigneeId) {
        const membership = await prisma.membership.findUnique({
          where: {
            userId_organizationId: {
              userId: assigneeId,
              organizationId: req.organizationId!,
            },
          },
        });

        if (!membership) {
          return res.status(400).json({
            message: "Assignee is not a member of this organization",
          });
        }
      }

      const task = await prisma.task.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          projectId,
          status: status ?? TaskStatus.TODO,
          priority: priority ?? TaskPriority.MEDIUM,
          assigneeId: assigneeId || null,
          dueDate: dueDate ? new Date(dueDate) : null,
          labels: labels?.length
            ? {
                create: labels.map(
                  (label: { name: string; color: string }) => ({
                    name: label.name,
                    color: label.color,
                  })
                ),
              }
            : undefined,
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      await prisma.activity.create({
        data: {
          action: "TASK_CREATED",
          details: "Task was created",
          taskId: task.id,
          userId: req.userId!,
        },
      });

      return res.status(201).json({
        task,
      });
    } catch (error) {
      console.error("Failed to create task:", error);

      return res.status(500).json({
        message: "Failed to create task",
      });
    }
  }
);

/**
 * List tasks for a project
 */
router.get(
  "/projects/:projectId/tasks",
  requireAuth,
  requireOrganization,
  async (req: OrganizationRequest, res) => {
    try {
      const projectId = req.params.projectId;

      if (typeof projectId !== "string") {
        return res.status(400).json({
          message: "Invalid project ID",
        });
      }

      // Make sure the project belongs to the current organization.
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          organizationId: req.organizationId!,
        },
      });

      if (!project) {
        return res.status(404).json({
          message: "Project not found",
        });
      }

      const tasks = await prisma.task.findMany({
        where: {
          projectId,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          labels: true,
        },
      });

      return res.json({
        tasks,
      });
    } catch (error) {
      console.error("Failed to fetch tasks:", error);

      return res.status(500).json({
        message: "Failed to fetch tasks",
      });
    }
  }
);

router.get(
  "/projects/:projectId/tasks/:taskId",
  requireAuth,
  requireOrganization,
  async (req: OrganizationRequest, res) => {
    try {
      const { projectId, taskId } = req.params;

      if (typeof projectId !== "string" || typeof taskId !== "string") {
        return res.status(400).json({
          message: "Invalid project or task ID",
        });
      }

      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          projectId,
          project: {
            organizationId: req.organizationId!,
          },
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          labels: true,
        },
      });

      if (!task) {
        return res.status(404).json({
          message: "Task not found",
        });
      }

      return res.json({
        task,
      });
    } catch (error) {
      console.error("Failed to fetch task:", error);

      return res.status(500).json({
        message: "Failed to fetch task",
      });
    }
  }
);

router.patch(
  "/projects/:projectId/tasks/:taskId",
  requireAuth,
  requireOrganization,
  async (req: OrganizationRequest, res) => {
    try {
      const { projectId, taskId } = req.params;

      if (typeof projectId !== "string" || typeof taskId !== "string") {
        return res.status(400).json({
          message: "Invalid project or task ID",
        });
      }

      const {
        title,
        description,
        status,
        priority,
        assigneeId,
        dueDate,
        labels,
      } = req.body;

      const normalizedLabels = Array.isArray(labels)
        ? labels.map((label: { name: string; color: string }) => ({
            name: label.name,
            color: label.color,
          }))
        : [];

      const existingTask = await prisma.task.findFirst({
        where: {
          id: taskId,
          projectId,
          project: {
            organizationId: req.organizationId!,
          },
        },
      });

      if (!existingTask) {
        return res.status(404).json({
          message: "Task not found",
        });
      }

      if (assigneeId) {
        const membership = await prisma.membership.findUnique({
          where: {
            userId_organizationId: {
              userId: assigneeId,
              organizationId: req.organizationId!,
            },
          },
        });

        if (!membership) {
          return res.status(400).json({
            message: "Assignee is not a member of this organization",
          });
        }
      }

      const task = await prisma.task.update({
        where: {
          id: taskId,
        },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(status !== undefined && { status }),
          ...(priority !== undefined && { priority }),
          ...(assigneeId !== undefined && { assigneeId }),
          ...(dueDate !== undefined && {
            dueDate: dueDate ? new Date(dueDate) : null,
          }),
          ...(labels !== undefined && {
            labels: {
              deleteMany: {},

              create: normalizedLabels,
            },
          }),
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },

          project: true,
          labels: true,
        },
      });

      const io = getSocketIO();
      io.to(`organization:${req.organizationId}`).emit("task:updated", task);

      const activities: {
        action: string;
        details: string;
        taskId: string;
        userId: string;
      }[] = [];

      if (status !== undefined && status !== existingTask.status) {
        activities.push({
          action: "STATUS_CHANGED",
          details: `Status changed from ${existingTask.status} to ${status}`,
          taskId,
          userId: req.userId!,
        });
      }

      if (priority !== undefined && priority !== existingTask.priority) {
        activities.push({
          action: "PRIORITY_CHANGED",
          details: `Priority changed from ${existingTask.priority} to ${priority}`,
          taskId,
          userId: req.userId!,
        });
      }

      if (assigneeId !== undefined && assigneeId !== existingTask.assigneeId) {
        activities.push({
          action: "ASSIGNEE_CHANGED",
          details: assigneeId
            ? "Task was assigned to a team member"
            : "Task was unassigned",
          taskId,
          userId: req.userId!,
        });
      }

      if (title !== undefined && title !== existingTask.title) {
        activities.push({
          action: "TITLE_CHANGED",
          details: "Task title was updated",
          taskId,
          userId: req.userId!,
        });
      }

      if (
        description !== undefined &&
        description !== existingTask.description
      ) {
        activities.push({
          action: "DESCRIPTION_CHANGED",
          details: "Task description was updated",
          taskId,
          userId: req.userId!,
        });
      }

      if (dueDate !== undefined) {
        const oldDueDate = existingTask.dueDate
          ? existingTask.dueDate.toISOString().slice(0, 10)
          : null;

        const newDueDate = dueDate || null;

        if (oldDueDate !== newDueDate) {
          activities.push({
            action: "DUE_DATE_CHANGED",
            details: newDueDate
              ? `Due date changed to ${newDueDate}`
              : "Due date was removed",
            taskId,
            userId: req.userId!,
          });
        }
      }

      if (activities.length > 0) {
        await prisma.activity.createMany({
          data: activities,
        });

        console.log("TASK ACTIVITY CREATED:", activities);
      }

      if (
        assigneeId !== undefined &&
        assigneeId !== existingTask.assigneeId &&
        assigneeId !== null &&
        assigneeId !== req.userId
      ) {
        const notification = await prisma.notification.create({
          data: {
            type: "TASK_ASSIGNED",
            message: `Task "${task.title}" was assigned to you.`,
            userId: assigneeId,
            taskId: task.id,
          },
        });

        const io = getSocketIO();

        io.to(`user:${assigneeId}`).emit("notification:new", notification);

        console.log("TASK NOTIFICATION CREATED:", {
          type: "TASK_ASSIGNED",
          userId: assigneeId,
          taskId: task.id,
        });
      }

      if (
        status !== undefined &&
        status !== existingTask.status &&
        existingTask.assigneeId &&
        existingTask.assigneeId !== req.userId
      ) {
        const notification = await prisma.notification.create({
          data: {
            type: "TASK_STATUS_CHANGED",
            message: `Task "${task.title}" status changed to ${status}.`,
            userId: existingTask.assigneeId,
            taskId: task.id,
          },
        });

        const io = getSocketIO();

        io.to(`user:${existingTask.assigneeId}`).emit(
          "notification:new",
          notification
        );

        console.log("STATUS NOTIFICATION CREATED:", {
          type: "TASK_STATUS_CHANGED",
          userId: existingTask.assigneeId,
          taskId: task.id,
        });
      }

      return res.json({
        task,
      });
    } catch (error) {
      console.error("Failed to update task:", error);

      return res.status(500).json({
        message: "Failed to update task",
      });
    }
  }
);

router.delete(
  "/projects/:projectId/tasks/:taskId",
  requireAuth,
  requireOrganization,
  requireRole("OWNER", "ADMIN"),
  async (req: OrganizationRequest, res) => {
    try {
      const { projectId, taskId } = req.params;

      if (typeof projectId !== "string" || typeof taskId !== "string") {
        return res.status(400).json({
          message: "Invalid project or task ID",
        });
      }

      const existingTask = await prisma.task.findFirst({
        where: {
          id: taskId,
          projectId,
          project: {
            organizationId: req.organizationId!,
          },
        },
      });

      if (!existingTask) {
        return res.status(404).json({
          message: "Task not found",
        });
      }

      await prisma.task.delete({
        where: {
          id: taskId,
        },
      });

      return res.json({
        message: "Task deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete task:", error);

      return res.status(500).json({
        message: "Failed to delete task",
      });
    }
  }
);

export default router;
