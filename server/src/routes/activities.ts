import { Router } from "express";

import { prisma } from "../lib/prisma";

import { requireAuth } from "../middleware/auth";
import {
  OrganizationRequest,
  requireOrganization,
} from "../middleware/organization";

const router = Router();

router.get(
  "/projects/:projectId/tasks/:taskId/activities",
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

      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          projectId,
          project: {
            organizationId: req.organizationId,
          },
        },
      });

      if (!task) {
        return res.status(404).json({
          message: "Task not found",
        });
      }

      const activities = await prisma.activity.findMany({
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
          createdAt: "desc",
        },
      });

      return res.json({
        activities,
      });
    } catch (error) {
      console.error("Failed to fetch activities:", error);

      return res.status(500).json({
        message: "Failed to fetch activities",
      });
    }
  }
);

export default router;
