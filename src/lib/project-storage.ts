import type { DashboardLayout } from "./types";
import type { Project, ProjectPatch } from "./project-types";

const PROJECT_PARAM = "project";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getProjectFromUrl(): string | null {
  if (!isBrowser()) return null;
  return new URLSearchParams(window.location.search).get(PROJECT_PARAM);
}

export function syncProjectToUrl(projectId: string | null) {
  if (!isBrowser()) return;
  const params = new URLSearchParams(window.location.search);
  if (projectId) params.set(PROJECT_PARAM, projectId);
  else params.delete(PROJECT_PARAM);
  params.delete("sheet");
  const qs = params.toString();
  const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, "", next);
}

export function getProjectShareUrl(projectId: string): string {
  if (!isBrowser()) return "";
  const params = new URLSearchParams();
  params.set(PROJECT_PARAM, projectId);
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

export async function fetchProjects(): Promise<Project[]> {
  try {
    const res = await fetch("/api/user/projects");
    if (!res.ok) return [];
    const json = await res.json();
    return json.projects ?? [];
  } catch {
    return [];
  }
}

export async function fetchProject(id: string): Promise<Project | null> {
  try {
    const res = await fetch(`/api/user/projects/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.project ?? null;
  } catch {
    return null;
  }
}

export async function createProject(
  name: string,
  options?: { description?: string } & ProjectPatch
): Promise<Project | null> {
  try {
    const { description, ...initial } = options ?? {};
    const res = await fetch("/api/user/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, ...initial }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.project ?? null;
  } catch {
    return null;
  }
}

export async function updateProject(id: string, patch: ProjectPatch): Promise<Project | null> {
  try {
    const res = await fetch(`/api/user/projects/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.project ?? null;
  } catch {
    return null;
  }
}

export async function deleteProject(id: string): Promise<boolean> {
  const res = await fetch(`/api/user/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return res.ok;
}

export async function saveProjectLayout(
  projectId: string,
  layout: DashboardLayout
): Promise<boolean> {
  const project = await updateProject(projectId, {
    layout: { ...layout, updatedAt: new Date().toISOString() },
  });
  return Boolean(project);
}
