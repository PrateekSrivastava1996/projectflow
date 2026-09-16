import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import {
  OrganizationRequest,
  requireOrganization,
} from "../middleware/organization";
import { requireRole } from "../middleware/role";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const organizations = await prisma.organization.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(organizations);
  } catch (error) {
    console.error("Failed to fetch organizations:", error);

    return res.status(500).json({
      message: "Failed to fetch organizations",
    });
  }
});

router.get(
  "/current",
  requireAuth,
  requireOrganization,
  async (req: OrganizationRequest, res) => {
    try {
      const organization = await prisma.organization.findUnique({
        where: {
          id: req.organizationId,
        },
        include: {
          memberships: {
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
          },
        },
      });

      if (!organization) {
        return res.status(404).json({
          message: "Organization not found",
        });
      }

      return res.json({
        organization,
      });
    } catch (error) {
      console.error("Failed to fetch organization:", error);

      return res.status(500).json({
        message: "Failed to fetch organization",
      });
    }
  }
);

router.get(
  "/members",
  requireAuth,
  requireOrganization,
  async (req: OrganizationRequest, res) => {
    try {
      const members = await prisma.membership.findMany({
        where: {
          organizationId: req.organizationId,
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
        members,
      });
    } catch (error) {
      console.error("Failed to fetch organization members:", error);

      return res.status(500).json({
        message: "Failed to fetch organization members",
      });
    }
  }
);

export default router;
