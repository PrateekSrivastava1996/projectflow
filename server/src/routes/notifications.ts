import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";

const router = Router();

router.get(
  "/notifications",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          userId: req.userId!,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
        include: {
          task: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      return res.json({ notifications });
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      return res.status(500).json({
        message: "Failed to fetch notifications",
      });
    }
  }
);

router.patch(
  "/notifications/:notificationId/read",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { notificationId } = req.params;

      if (typeof notificationId !== "string") {
        return res.status(400).json({
          message: "Invalid notification ID",
        });
      }

      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId: req.userId!,
        },
      });

      if (!notification) {
        return res.status(404).json({
          message: "Notification not found",
        });
      }

      const updatedNotification = await prisma.notification.update({
        where: {
          id: notificationId,
        },
        data: {
          read: true,
        },
      });

      return res.json({
        notification: updatedNotification,
      });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      return res.status(500).json({
        message: "Failed to mark notification as read",
      });
    }
  }
);

router.patch(
  "/notifications/read-all",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId: req.userId!,
          read: false,
        },
        data: {
          read: true,
        },
      });

      return res.json({
        updatedCount: result.count,
      });
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
      return res.status(500).json({
        message: "Failed to mark notifications as read",
      });
    }
  }
);

export default router;
