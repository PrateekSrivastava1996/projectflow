import { useEffect, useState } from "react";
import { createProject, getProjects, type Project } from "../api/projects";
import { useNavigate } from "react-router-dom";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const accessToken = localStorage.getItem("accessToken");

  const organizationId = localStorage.getItem("organizationId");

  async function loadProjects() {
    if (!accessToken || !organizationId) {
      setError("Authentication information is missing.");
      setLoading(false);
      return;
    }

    try {
      const data = await getProjects(accessToken, organizationId);

      setProjects(data);
    } catch (error: any) {
      setError(error.response?.data?.message || "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function handleCreateProject(
    event: React.SubmitEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!accessToken || !organizationId) {
      setError("Authentication information is missing.");
      return;
    }

    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const project = await createProject(accessToken, organizationId, {
        name,
        description,
      });

      setProjects((current) => [project, ...current]);

      setName("");
      setDescription("");
    } catch (error: any) {
      setError(error.response?.data?.message || "Failed to create project.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Projects</h1>

          <p className="mt-1 text-gray-600">Manage your team's projects.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Create Project</h2>

          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label
                htmlFor="project-name"
                className="mb-1 block text-sm font-medium"
              >
                Project name
              </label>

              <input
                id="project-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Website Redesign"
                className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2"
              />
            </div>

            <div>
              <label
                htmlFor="project-description"
                className="mb-1 block text-sm font-medium"
              >
                Description
              </label>

              <textarea
                id="project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the project..."
                rows={3}
                className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-black px-5 py-2 font-medium text-white disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create project"}
            </button>
          </form>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold">Your Projects</h2>

          {projects.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center text-gray-500 shadow-sm">
              No projects yet.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="w-full rounded-xl bg-white p-6 text-left shadow-sm transition hover:shadow-md"
                >
                  <h3 className="text-lg font-semibold">{project.name}</h3>

                  <p className="mt-2 min-h-12 text-sm text-gray-600">
                    {project.description || "No description"}
                  </p>

                  <div className="mt-4 border-t pt-4">
                    <span className="text-sm text-gray-500">
                      Tasks: {project._count?.tasks ?? 0}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
