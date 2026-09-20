import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import {
  OrganizationRequest,
  requireOrganization,
} from "../middleware/organization";
import { requireRole } from "../middleware/role";

const router = Router();

router.post(
  "/",
  requireAuth,
  requireOrganization,
  requireRole("OWNER", "ADMIN"),
  async (req: OrganizationRequest, res) => {
    try {
      const { name, description } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          message: "Project name is required",
        });
      }

      const projectName = name.trim();

      const baseSlug = projectName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const slug = `${baseSlug}-${Date.now()}`;

      const project = await prisma.project.create({
        data: {
          name: projectName,
          description: description?.trim() || null,
          slug,
          organizationId: req.organizationId!,
        },
      });

      return res.status(201).json({
        project,
      });
    } catch (error) {
      console.error("Failed to create project:", error);

      return res.status(500).json({
        message: "Failed to create project",
      });
    }
  }
);

router.get(
  "/",
  requireAuth,
  requireOrganization,
  async (req: OrganizationRequest, res) => {
    try {
      const projects = await prisma.project.findMany({
        where: {
          organizationId: req.organizationId!,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          _count: {
            select: {
              tasks: true,
            },
          },
        },
      });

      return res.json({
        projects,
      });
    } catch (error) {
      console.error("Failed to fetch projects:", error);

      return res.status(500).json({
        message: "Failed to fetch projects",
      });
    }
  }
);

router.get(
  "/:id",
  requireAuth,
  requireOrganization,
  async (req: OrganizationRequest, res) => {
    try {
      const projectId = req.params.id;

      if (typeof projectId !== "string") {
        return res.status(400).json({
          message: "Invalid project ID",
        });
      }

      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          organizationId: req.organizationId!,
        },
        include: {
          _count: {
            select: {
              tasks: true,
            },
          },
        },
      });

      if (!project) {
        return res.status(404).json({
          message: "Project not found",
        });
      }

      return res.json({
        project,
      });
    } catch (error) {
      console.error("Failed to fetch project:", error);

      return res.status(500).json({
        message: "Failed to fetch project",
      });
    }
  }
);

export default router;
