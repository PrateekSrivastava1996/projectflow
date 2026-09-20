import { useEffect, useState } from "react";
import { getCurrentOrganization } from "../api/organizations";
import type { Organization } from "../api/organizations";

export default function DashboardPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrganization() {
      try {
        const accessToken = localStorage.getItem("accessToken");

        const organizationId = localStorage.getItem("organizationId");

        if (!accessToken || !organizationId) {
          setError("Authentication information is missing.");
          return;
        }

        const data = await getCurrentOrganization(accessToken, organizationId);

        setOrganization(data);
      } catch (error: any) {
        setError(
          error.response?.data?.message || "Failed to load organization."
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrganization();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
      </div>
    );
  }

  if (!organization) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b bg-white px-8 py-5">
        <h1 className="text-2xl font-bold">ProjectFlow</h1>

        <p className="text-sm text-gray-500">{organization.name}</p>
      </header>

      <main className="p-8">
        <h2 className="mb-6 text-3xl font-bold">Workspace Overview</h2>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Organization</p>

            <p className="mt-2 text-xl font-semibold">{organization.name}</p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Members</p>

            <p className="mt-2 text-3xl font-bold">
              {organization.memberships.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Your Role</p>

            <p className="mt-2 text-xl font-semibold">
              {organization.memberships[0]?.role ?? "MEMBER"}
            </p>
          </div>
        </div>

        <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-semibold">Team Members</h3>

          <div className="divide-y">
            {organization.memberships.map((membership) => (
              <div
                key={membership.id}
                className="flex items-center justify-between py-4"
              >
                <div>
                  <p className="font-medium">
                    {membership.user.name || "Unnamed user"}
                  </p>

                  <p className="text-sm text-gray-500">
                    {membership.user.email}
                  </p>
                </div>

                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
                  {membership.role}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
