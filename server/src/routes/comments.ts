import { Router } from "express";

import { prisma } from "../lib/prisma";

import { requireAuth } from "../middleware/auth";
import {
  OrganizationRequest,
  requireOrganization,
} from "../middleware/organization";

const router = Router();

async function findTaskInOrganization(taskId: string, organizationId: string) {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      project: {
        organizationId,
      },
    },
  });
}

// Get comments for a task
router.get(
  "/projects/:projectId/tasks/:taskId/comments",
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

      if (!req.organizationId) {
        return res.status(400).json({
          message: "Organization context is required",
        });
      }

      const task = await findTaskInOrganization(taskId, req.organizationId);

      if (!task || task.projectId !== projectId) {
        return res.status(404).json({
          message: "Task not found",
        });
      }

      const comments = await prisma.comment.findMany({
        where: {
          taskId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      return res.json({
        comments,
      });
    } catch (error) {
      console.error("Failed to fetch comments:", error);

      return res.status(500).json({
        message: "Failed to fetch comments",
      });
    }
  }
);

// Create a comment
router.post(
  "/projects/:projectId/tasks/:taskId/comments",
  requireAuth,
  requireOrganization,
  async (req: OrganizationRequest, res) => {
    try {
      const { projectId, taskId } = req.params;
      const { content } = req.body;

      if (typeof projectId !== "string" || typeof taskId !== "string") {
        return res.status(400).json({
          message: "Invalid project or task ID",
        });
      }

      if (!req.organizationId || !req.userId) {
        return res.status(401).json({
          message: "Authentication and organization context are required",
        });
      }

      if (typeof content !== "string" || !content.trim()) {
        return res.status(400).json({
          message: "Comment content is required",
        });
      }

      const task = await findTaskInOrganization(taskId, req.organizationId);

      if (!task || task.projectId !== projectId) {
        return res.status(404).json({
          message: "Task not found",
        });
      }

      const comment = await prisma.comment.create({
        data: {
          content: content.trim(),
          taskId,
          userId: req.userId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });

      await prisma.activity.create({
        data: {
          action: "COMMENT_ADDED",
          details: "A comment was added to the task",
          taskId,
          userId: req.userId,
        },
      });

      return res.status(201).json({
        comment,
      });
    } catch (error) {
      console.error("Failed to create comment:", error);

      return res.status(500).json({
        message: "Failed to create comment",
      });
    }
  }
);

// Update a comment
router.patch(
  "/projects/:projectId/tasks/:taskId/comments/:commentId",
  requireAuth,
  requireOrganization,
  async (req: OrganizationRequest, res) => {
    try {
      const { projectId, taskId, commentId } = req.params;

      const { content } = req.body;

      if (
        typeof projectId !== "string" ||
        typeof taskId !== "string" ||
        typeof commentId !== "string"
      ) {
        return res.status(400).json({
          message: "Invalid project, task, or comment ID",
        });
      }

      if (!req.organizationId || !req.userId) {
        return res.status(401).json({
          message: "Authentication and organization context are required",
        });
      }

      if (typeof content !== "string" || !content.trim()) {
        return res.status(400).json({
          message: "Comment content is required",
        });
      }

      const task = await findTaskInOrganization(taskId, req.organizationId);

      if (!task || task.projectId !== projectId) {
        return res.status(404).json({
          message: "Task not found",
        });
      }

      const existingComment = await prisma.comment.findFirst({
        where: {
          id: commentId,
          taskId,
        },
      });

      if (!existingComment) {
        return res.status(404).json({
          message: "Comment not found",
        });
      }

      if (existingComment.userId !== req.userId) {
        return res.status(403).json({
          message: "You can only edit your own comments",
        });
      }

      const comment = await prisma.comment.update({
        where: {
          id: commentId,
        },
        data: {
          content: content.trim(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });

      await prisma.activity.create({
        data: {
          action: "COMMENT_UPDATED",
          details: "A comment was updated",
          taskId,
          userId: req.userId,
        },
      });

      return res.json({
        comment,
      });
    } catch (error) {
      console.error("Failed to update comment:", error);

      return res.status(500).json({
        message: "Failed to update comment",
      });
    }
  }
);

// Delete a comment
router.delete(
  "/projects/:projectId/tasks/:taskId/comments/:commentId",
  requireAuth,
  requireOrganization,
  async (req: OrganizationRequest, res) => {
    try {
      const { projectId, taskId, commentId } = req.params;

      if (
        typeof projectId !== "string" ||
        typeof taskId !== "string" ||
        typeof commentId !== "string"
      ) {
        return res.status(400).json({
          message: "Invalid project, task, or comment ID",
        });
      }

      if (!req.organizationId || !req.userId) {
        return res.status(401).json({
          message: "Authentication and organization context are required",
        });
      }

      const task = await findTaskInOrganization(taskId, req.organizationId);

      if (!task || task.projectId !== projectId) {
        return res.status(404).json({
          message: "Task not found",
        });
      }

      const existingComment = await prisma.comment.findFirst({
        where: {
          id: commentId,
          taskId,
        },
      });

      if (!existingComment) {
        return res.status(404).json({
          message: "Comment not found",
        });
      }

      if (existingComment.userId !== req.userId) {
        return res.status(403).json({
          message: "You can only delete your own comments",
        });
      }

      await prisma.comment.delete({
        where: {
          id: commentId,
        },
      });

      await prisma.activity.create({
        data: {
          action: "COMMENT_DELETED",
          details: "A comment was deleted",
          taskId,
          userId: req.userId,
        },
      });

      return res.json({
        message: "Comment deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete comment:", error);

      return res.status(500).json({
        message: "Failed to delete comment",
      });
    }
  }
);

export default router;
