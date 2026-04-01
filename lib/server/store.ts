import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  FigmaConnection,
  LocalUserRecord,
  Project,
  ProjectImport,
  ProjectSummary,
  ShareLink,
  StoreData,
} from "../types";

const STORE_PATH = path.join(process.cwd(), "data", "flowlens-store.json");

const EMPTY_STORE: StoreData = {
  users: [],
  projects: [],
  figmaConnections: [],
  imports: [],
  shareLinks: [],
};

let storeWriteQueue = Promise.resolve();

async function ensureStoreFile() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });

  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeFile(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2), "utf8");
  }
}

async function readStore(): Promise<StoreData> {
  await ensureStoreFile();
  const raw = await readFile(STORE_PATH, "utf8");
  const parsed = JSON.parse(raw) as Partial<StoreData>;
  return {
    users: parsed.users ?? [],
    projects: parsed.projects ?? [],
    figmaConnections: parsed.figmaConnections ?? [],
    imports: parsed.imports ?? [],
    shareLinks: parsed.shareLinks ?? [],
  };
}

async function writeStore(data: StoreData) {
  await writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

async function withStore<T>(updater: (data: StoreData) => Promise<T> | T) {
  let result!: T;
  storeWriteQueue = storeWriteQueue.then(async () => {
    const current = await readStore();
    result = await updater(current);
    await writeStore(current);
  });
  await storeWriteQueue;
  return result;
}

export function nowIso() {
  return new Date().toISOString();
}

export function createId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

export async function ensureLocalUser(profile: {
  id: string;
  email: string;
  name: string;
  image?: string;
}) {
  return withStore(async (store) => {
    const now = nowIso();
    const existing = store.users.find((user) => user.id === profile.id);

    if (existing) {
      existing.email = profile.email;
      existing.name = profile.name;
      existing.image = profile.image;
      existing.updatedAt = now;
      return existing;
    }

    const created: LocalUserRecord = {
      ...profile,
      createdAt: now,
      updatedAt: now,
    };
    store.users.push(created);
    return created;
  });
}

export async function getUserById(id: string) {
  const store = await readStore();
  return store.users.find((user) => user.id === id) ?? null;
}

export async function listProjectsByOwner(ownerId: string): Promise<ProjectSummary[]> {
  const store = await readStore();
  return store.projects
    .filter((project) => project.ownerId === ownerId)
    .map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      sourceMode: project.sourceMode,
      syncStatus: project.syncStatus,
      screenCount: project.screens.length,
      connectionCount: project.connections.length,
      categoryCount: new Set(project.screens.map((screen) => screen.category)).size,
      updatedAt: project.updatedAt,
      lastOpenedAt: project.lastOpenedAt,
    }))
    .sort((left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    );
}

export async function getProjectForOwner(ownerId: string, projectId: string) {
  const store = await readStore();
  return (
    store.projects.find((project) => project.ownerId === ownerId && project.id === projectId) ?? null
  );
}

export async function getProjectById(projectId: string) {
  const store = await readStore();
  return store.projects.find((project) => project.id === projectId) ?? null;
}

export async function saveProject(project: Project) {
  return withStore(async (store) => {
    const index = store.projects.findIndex((candidate) => candidate.id === project.id);
    if (index >= 0) {
      store.projects[index] = project;
    } else {
      store.projects.push(project);
    }
    return project;
  });
}

export async function touchProject(projectId: string) {
  return withStore(async (store) => {
    const project = store.projects.find((candidate) => candidate.id === projectId);
    if (!project) {
      return null;
    }

    const now = nowIso();
    project.lastOpenedAt = now;
    project.updatedAt = now;
    return project;
  });
}

export async function getLastOpenedProject(ownerId: string) {
  const store = await readStore();
  return (
    store.projects
      .filter((project) => project.ownerId === ownerId)
      .sort((left, right) => {
        const rightStamp = right.lastOpenedAt ?? right.updatedAt;
        const leftStamp = left.lastOpenedAt ?? left.updatedAt;
        return new Date(rightStamp).getTime() - new Date(leftStamp).getTime();
      })[0] ?? null
  );
}

export async function saveFigmaConnection(connection: FigmaConnection) {
  return withStore(async (store) => {
    store.figmaConnections = store.figmaConnections.filter(
      (candidate) => candidate.userId !== connection.userId,
    );
    store.figmaConnections.push(connection);
    return connection;
  });
}

export async function getFigmaConnection(userId: string) {
  const store = await readStore();
  return store.figmaConnections.find((connection) => connection.userId === userId) ?? null;
}

export async function removeFigmaConnection(userId: string) {
  return withStore(async (store) => {
    store.figmaConnections = store.figmaConnections.filter(
      (connection) => connection.userId !== userId,
    );
  });
}

export async function saveImportRecord(record: ProjectImport) {
  return withStore(async (store) => {
    const index = store.imports.findIndex((candidate) => candidate.id === record.id);
    if (index >= 0) {
      store.imports[index] = record;
    } else {
      store.imports.push(record);
    }
    return record;
  });
}

export async function getImportRecordsForProject(projectId: string) {
  const store = await readStore();
  return store.imports
    .filter((record) => record.projectId === projectId)
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
}

export async function createShareLink(projectId: string) {
  return withStore(async (store) => {
    const link: ShareLink = {
      id: createId("share"),
      projectId,
      token: randomUUID().replace(/-/g, ""),
      createdAt: nowIso(),
      revokedAt: null,
    };
    store.shareLinks.push(link);
    return link;
  });
}

export async function getShareLink(token: string) {
  const store = await readStore();
  return (
    store.shareLinks.find((link) => link.token === token && link.revokedAt === null) ?? null
  );
}

export async function revokeShareLink(token: string) {
  return withStore(async (store) => {
    const link = store.shareLinks.find((candidate) => candidate.token === token);
    if (link) {
      link.revokedAt = nowIso();
    }
  });
}
