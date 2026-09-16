import { Router } from "express";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import {
  OrganizationRequest,
  requireOrganization,
} from "../middleware/organization";
import { requireRole } from "../middleware/role";
import { hashToken } from "../lib/token";

const router = Router();

router.post(
  "/",
  requireAuth,
  requireOrganization,
  requireRole("OWNER", "ADMIN"),
  async (req: OrganizationRequest, res) => {
    try {
      const { email, role } = req.body;

      if (!email) {
        return res.status(400).json({
          message: "Email is required",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const invitationRole = role === "ADMIN" ? "ADMIN" : "MEMBER";

      const existingUser = await prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

      if (existingUser) {
        const existingMembership = await prisma.membership.findUnique({
          where: {
            userId_organizationId: {
              userId: existingUser.id,
              organizationId: req.organizationId!,
            },
          },
        });

        if (existingMembership) {
          return res.status(409).json({
            message: "User is already a member of this organization",
          });
        }
      }

      const existingInvitation = await prisma.invitation.findFirst({
        where: {
          email: normalizedEmail,
          organizationId: req.organizationId!,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (existingInvitation) {
        return res.status(409).json({
          message: "An active invitation already exists for this email",
        });
      }

      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);

      const invitation = await prisma.invitation.create({
        data: {
          email: normalizedEmail,
          organizationId: req.organizationId!,
          role: invitationRole,
          tokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return res.status(201).json({
        message: "Invitation created",
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          token: rawToken,
        },
      });
    } catch (error) {
      console.error("Failed to create invitation:", error);

      return res.status(500).json({
        message: "Failed to create invitation",
      });
    }
  }
);

router.post("/accept", requireAuth, async (req: OrganizationRequest, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        message: "Invitation token is required",
      });
    }

    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const tokenHash = hashToken(token);

    const invitation = await prisma.invitation.findUnique({
      where: {
        tokenHash,
      },
    });

    if (!invitation) {
      return res.status(404).json({
        message: "Invitation not found or already used",
      });
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.invitation.delete({
        where: {
          id: invitation.id,
        },
      });

      return res.status(410).json({
        message: "Invitation has expired",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return res.status(403).json({
        message: "This invitation was sent to a different email address",
      });
    }

    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: invitation.organizationId,
        },
      },
    });

    if (existingMembership) {
      await prisma.invitation.delete({
        where: {
          id: invitation.id,
        },
      });

      return res.status(409).json({
        message: "You are already a member of this organization",
      });
    }

    const membership = await prisma.$transaction(async (tx) => {
      const createdMembership = await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });

      await tx.invitation.delete({
        where: {
          id: invitation.id,
        },
      });

      return createdMembership;
    });

    return res.json({
      message: "Invitation accepted",
      membership: {
        organizationId: membership.organizationId,
        role: membership.role,
      },
    });
  } catch (error) {
    console.error("Failed to accept invitation:", error);

    return res.status(500).json({
      message: "Failed to accept invitation",
    });
  }
});

export default router;
