import { NextResponse } from "next/server";
import { auth } from "@/lib/server/auth";
import { addManualScreen, createProjectShareLink, saveEditorProject } from "@/lib/server/services/project-service";
import type { Project } from "@/lib/types";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const action = String(formData.get("action") ?? "");

      if (action === "add-manual-screen") {
        const file = formData.get("file");
        if (!(file instanceof File) || file.size === 0) {
          return NextResponse.json({ error: "Please choose an image file." }, { status: 400 });
        }

        const project = await addManualScreen({
          ownerId: session.user.id,
          projectId: String(formData.get("projectId") ?? ""),
          file,
          name: String(formData.get("name") ?? file.name),
          category: String(formData.get("category") ?? "Manual"),
          subcategory: String(formData.get("subcategory") ?? "").trim() || null,
        });

        return NextResponse.json({ project });
      }

      return NextResponse.json({ error: "Unknown multipart action." }, { status: 400 });
    }

    const body = (await request.json()) as
      | { action: "save-project"; project: Project }
      | { action: "create-share-link"; projectId: string };

    if (body.action === "save-project") {
      const project = await saveEditorProject(session.user.id, body.project);
      return NextResponse.json({ project });
    }

    if (body.action === "create-share-link") {
      const shareLink = await createProjectShareLink(session.user.id, body.projectId);
      return NextResponse.json({ shareLink });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Editor request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
