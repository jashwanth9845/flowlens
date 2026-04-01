import { inferConfidence, inferScreenTags } from "./analysis";
import { fetchAndCacheRemoteImage, saveUploadedFile } from "../storage";
import {
  createId,
  createShareLink,
  getFigmaConnection,
  getImportRecordsForProject,
  getLastOpenedProject,
  getProjectById,
  getProjectForOwner,
  listProjectsByOwner,
  nowIso,
  saveImportRecord,
  saveProject,
  touchProject,
} from "../store";
import {
  loadFigmaParseResult,
  createPatConnection,
} from "../figma";
import type {
  Hotspot,
  Project,
  ProjectImport,
  ProjectSourceMode,
  Screen,
  ScreenFilter,
} from "../../types";

function defaultViewState() {
  return {
    selectedScreenId: null,
    searchQuery: "",
    activeFilter: "all" as ScreenFilter,
  };
}

function buildImportedScreen(args: {
  projectId: string;
  order: number;
  candidate: NonNullable<Awaited<ReturnType<typeof loadFigmaParseResult>>>["screens"][number];
  imageAssetKey: string;
  imageUrl: string;
}) {
  const hotspots: Hotspot[] = args.candidate.hotspots.map((hotspot) => ({
    id: createId("hotspot"),
    screenId: "",
    figmaNodeId: hotspot.figmaNodeId,
    label: hotspot.label,
    elementType: hotspot.elementType,
    rawName: hotspot.rawName,
    sourceType: "figma",
    editable: true,
    geometry: hotspot.normalizedBounds,
  }));

  const tags = inferScreenTags({
    name: args.candidate.name,
    category: args.candidate.pageName,
    subcategory: args.candidate.sectionName,
    hotspots,
  });

  const screen: Screen = {
    id: createId("screen"),
    projectId: args.projectId,
    name: args.candidate.name,
    category: args.candidate.pageName,
    subcategory: args.candidate.sectionName,
    tags,
    sourceType: "figma",
    sourceNodeId: args.candidate.figmaNodeId,
    imageAssetKey: args.imageAssetKey,
    imageUrl: args.imageUrl,
    imageWidth: Math.round(args.candidate.absoluteBounds.width),
    imageHeight: Math.round(args.candidate.absoluteBounds.height),
    analysisConfidence: inferConfidence(tags.length, hotspots.length),
    hotspots,
    order: args.order,
    isStartScreen: args.order === 0,
    changedSinceLastSync: false,
    lastSyncedAt: nowIso(),
  };

  for (const hotspot of screen.hotspots) {
    hotspot.screenId = screen.id;
  }

  return screen;
}

export async function listUserProjects(ownerId: string) {
  return listProjectsByOwner(ownerId);
}

export async function getResumeProject(ownerId: string) {
  return getLastOpenedProject(ownerId);
}

export async function loadProjectForEditor(ownerId: string, projectId: string) {
  const project = await getProjectForOwner(ownerId, projectId);
  if (!project) {
    return null;
  }

  await touchProject(projectId);
  return project;
}

export async function loadProjectByShareToken(token: string) {
  const link = await import("../store").then((module) => module.getShareLink(token));
  if (!link) {
    return null;
  }

  return getProjectById(link.projectId);
}

export async function createManualProject(args: {
  ownerId: string;
  name: string;
  description: string;
}) {
  const now = nowIso();
  const project: Project = {
    id: createId("project"),
    ownerId: args.ownerId,
    name: args.name,
    description: args.description,
    sourceMode: "manual",
    syncStatus: "draft",
    lastImportAt: null,
    lastOpenedAt: now,
    createdAt: now,
    updatedAt: now,
    screens: [],
    connections: [],
    viewState: defaultViewState(),
  };

  await saveProject(project);
  return project;
}

export async function addManualScreen(args: {
  ownerId: string;
  projectId: string;
  file: File;
  name: string;
  category: string;
  subcategory: string | null;
}) {
  const project = await getProjectForOwner(args.ownerId, args.projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  const savedAsset = await saveUploadedFile({
    projectId: project.id,
    screenKey: args.name || args.file.name,
    file: args.file,
  });

  const tags = inferScreenTags({
    name: args.name,
    category: args.category,
    subcategory: args.subcategory,
    hotspots: [],
  });

  const screen: Screen = {
    id: createId("screen"),
    projectId: project.id,
    name: args.name,
    category: args.category,
    subcategory: args.subcategory,
    tags,
    sourceType: "manual",
    imageAssetKey: savedAsset.imageAssetKey,
    imageUrl: savedAsset.imageUrl,
    imageWidth: 1080,
    imageHeight: 1920,
    analysisConfidence: 0.45,
    hotspots: [],
    order: project.screens.length,
    isStartScreen: project.screens.length === 0,
    changedSinceLastSync: true,
    lastSyncedAt: null,
  };

  const now = nowIso();
  project.screens.push(screen);
  project.sourceMode = project.sourceMode === "figma" ? "hybrid" : "manual";
  project.updatedAt = now;
  project.lastOpenedAt = now;
  await saveProject(project);
  return project;
}

export async function importProjectFromFigma(args: {
  ownerId: string;
  fileUrl: string;
  projectName?: string;
}) {
  const connection = await getFigmaConnection(args.ownerId);
  if (!connection) {
    throw new Error("Connect Figma in Settings before importing a file.");
  }

  const parsed = await loadFigmaParseResult(connection, args.fileUrl);
  const now = nowIso();
  const importRecord: ProjectImport = {
    id: createId("import"),
    userId: args.ownerId,
    projectId: createId("project"),
    sourceMode: "figma",
    status: "running",
    sourceLabel: args.fileUrl,
    error: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
  await saveImportRecord(importRecord);

  const imageUrlMap = await import("../figma").then((module) =>
    module.fetchFigmaImages(connection, parsed.fileKey, parsed.screens.map((screen) => screen.figmaNodeId)),
  );

  const screens: Screen[] = [];
  for (const [index, candidate] of parsed.screens.entries()) {
    const remoteUrl = imageUrlMap[candidate.figmaNodeId];
    if (!remoteUrl) {
      continue;
    }

    const cached = await fetchAndCacheRemoteImage({
      projectId: importRecord.projectId,
      screenKey: candidate.name || candidate.figmaNodeId,
      remoteUrl,
    });

    screens.push(
      buildImportedScreen({
        projectId: importRecord.projectId,
        order: index,
        candidate,
        imageAssetKey: cached.imageAssetKey,
        imageUrl: cached.imageUrl,
      }),
    );
  }

  const project: Project = {
    id: importRecord.projectId,
    ownerId: args.ownerId,
    name: args.projectName?.trim() || parsed.fileName,
    description: "Imported from Figma",
    sourceMode: "figma",
    syncStatus: "complete",
    figmaFileKey: parsed.fileKey,
    figmaFileName: parsed.fileName,
    figmaLastModified: parsed.lastModified,
    lastImportAt: nowIso(),
    lastOpenedAt: nowIso(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    screens,
    connections: [],
    viewState: {
      ...defaultViewState(),
      selectedScreenId: screens[0]?.id ?? null,
    },
  };

  await saveProject(project);
  await saveImportRecord({
    ...importRecord,
    status: "complete",
    updatedAt: nowIso(),
    completedAt: nowIso(),
  });

  return project;
}

export async function saveEditorProject(ownerId: string, payload: Project) {
  const existing = await getProjectForOwner(ownerId, payload.id);
  if (!existing) {
    throw new Error("Project not found.");
  }

  const now = nowIso();
  const sourceMode: ProjectSourceMode =
    payload.screens.some((screen) => screen.sourceType === "figma") &&
    payload.screens.some((screen) => screen.sourceType === "manual")
      ? "hybrid"
      : payload.screens.some((screen) => screen.sourceType === "figma")
        ? "figma"
        : "manual";

  const updated: Project = {
    ...payload,
    ownerId,
    sourceMode,
    updatedAt: now,
    lastOpenedAt: now,
  };

  await saveProject(updated);
  return updated;
}

export async function createProjectShareLink(ownerId: string, projectId: string) {
  const project = await getProjectForOwner(ownerId, projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  return createShareLink(project.id);
}

export async function getProjectHistory(ownerId: string, projectId: string) {
  const project = await getProjectForOwner(ownerId, projectId);
  if (!project) {
    return [];
  }

  return getImportRecordsForProject(project.id);
}

export async function savePatConnectionForUser(userId: string, token: string) {
  return createPatConnection(userId, token);
}
