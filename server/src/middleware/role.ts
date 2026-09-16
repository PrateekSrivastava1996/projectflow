import { Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { OrganizationRequest } from "./organization";
import { MembershipRole } from "../generated/prisma/enums";

export function requireRole(...allowedRoles: MembershipRole[]) {
  return async (
    req: OrganizationRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.userId || !req.organizationId) {
        return res.status(401).json({
          message: "Authentication and organization context are required",
        });
      }

      const membership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: req.userId,
            organizationId: req.organizationId,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({
          message: "You are not a member of this organization",
        });
      }

      if (!allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          message: "You do not have permission to perform this action",
        });
      }

      next();
    } catch (error) {
      console.error("Role authorization failed:", error);

      return res.status(500).json({
        message: "Role authorization failed",
      });
    }
  };
}
