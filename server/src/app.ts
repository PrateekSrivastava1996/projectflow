import express from "express";
import cors from "cors";
import organizationsRouter from "./routes/organizations";
import authRouter from "./routes/auth";
import invitationsRouter from "./routes/invitations";
import projectsRouter from "./routes/projects";
import tasksRouter from "./routes/tasks";
import commentsRouter from "./routes/comments";
import activitiesRouter from "./routes/activities";
import notificationsRouter from "./routes/notifications";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "ProjectFlow API is running",
  });
});

app.use("/api/organizations", organizationsRouter);
app.use("/api/auth", authRouter);
app.use("/api/invitations", invitationsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api", tasksRouter);
app.use("/api", commentsRouter);
app.use("/api", activitiesRouter);
app.use("/api", notificationsRouter);

export default app;
