import { Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "./auth";

export interface OrganizationRequest extends AuthenticatedRequest {
  organizationId?: string;
}

export async function requireOrganization(
  req: OrganizationRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const organizationId = req.headers["x-organization-id"];

    if (typeof organizationId !== "string") {
      return res.status(400).json({
        message: "x-organization-id header is required",
      });
    }

    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: req.userId,
          organizationId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this organization",
      });
    }

    req.organizationId = organizationId;

    next();
  } catch (error) {
    console.error("Organization authorization failed:", error);

    return res.status(500).json({
      message: "Organization authorization failed",
    });
  }
}
