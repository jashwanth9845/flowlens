"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { removeFigmaConnection } from "@/lib/server/store";
import {
  createManualProject,
  importProjectFromFigma,
  savePatConnectionForUser,
} from "@/lib/server/services/project-service";

function assertUserId(userId: string | undefined) {
  if (!userId) {
    throw new Error("You need to sign in first.");
  }
}

export async function createManualProjectAction(formData: FormData) {
  const user = await requireUser();
  assertUserId(user?.id);

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) {
    throw new Error("Project name is required.");
  }

  const project = await createManualProject({
    ownerId: user!.id,
    name,
    description,
  });

  revalidatePath("/app/projects");
  redirect(`/app/projects/${project.id}`);
}

export async function importFigmaProjectAction(formData: FormData) {
  const user = await requireUser();
  assertUserId(user?.id);

  const fileUrl = String(formData.get("fileUrl") ?? "").trim();
  const projectName = String(formData.get("projectName") ?? "").trim();
  if (!fileUrl) {
    throw new Error("A Figma file URL is required.");
  }

  const project = await importProjectFromFigma({
    ownerId: user!.id,
    fileUrl,
    projectName: projectName || undefined,
  });

  revalidatePath("/app/projects");
  redirect(`/app/projects/${project.id}`);
}

export async function saveFigmaPatAction(formData: FormData) {
  const user = await requireUser();
  assertUserId(user?.id);

  const token = String(formData.get("token") ?? "").trim();
  if (!token) {
    throw new Error("Figma personal access token is required.");
  }

  await savePatConnectionForUser(user!.id, token);
  revalidatePath("/app/settings");
  revalidatePath("/app/settings/integrations/figma");
}

export async function disconnectFigmaAction() {
  const user = await requireUser();
  assertUserId(user?.id);

  await removeFigmaConnection(user!.id);
  revalidatePath("/app/settings");
  revalidatePath("/app/settings/integrations/figma");
}
