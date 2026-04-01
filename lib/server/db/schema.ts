import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accountsTable = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
  }),
);

export const sessionsTable = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokensTable = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  }),
);

export const authenticatorsTable = pgTable(
  "authenticator",
  {
    credentialID: text("credentialID").notNull().unique(),
    userId: text("userId")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    providerAccountId: text("providerAccountId").notNull(),
    credentialPublicKey: text("credentialPublicKey").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credentialDeviceType").notNull(),
    credentialBackedUp: boolean("credentialBackedUp").notNull(),
    transports: text("transports"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.credentialID] }),
  }),
);

export const figmaConnectionsTable = pgTable("figma_connection", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  mode: text("mode").notNull(),
  displayName: text("displayName").notNull(),
  scopes: jsonb("scopes").$type<string[]>().notNull(),
  accessTokenEncrypted: text("accessTokenEncrypted"),
  refreshTokenEncrypted: text("refreshTokenEncrypted"),
  patTokenEncrypted: text("patTokenEncrypted"),
  tokenExpiresAt: timestamp("tokenExpiresAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
  lastSyncAt: timestamp("lastSyncAt", { mode: "date" }),
});

export const projectsTable = pgTable("project", {
  id: text("id").primaryKey(),
  ownerId: text("ownerId")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sourceMode: text("sourceMode").notNull(),
  syncStatus: text("syncStatus").notNull(),
  figmaFileKey: text("figmaFileKey"),
  figmaFileName: text("figmaFileName"),
  figmaLastModified: text("figmaLastModified"),
  lastImportAt: timestamp("lastImportAt", { mode: "date" }),
  lastOpenedAt: timestamp("lastOpenedAt", { mode: "date" }),
  viewState: jsonb("viewState").notNull(),
  screens: jsonb("screens").notNull(),
  connections: jsonb("connections").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
});

export const projectImportsTable = pgTable("project_import", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: text("projectId")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  sourceMode: text("sourceMode").notNull(),
  status: text("status").notNull(),
  sourceLabel: text("sourceLabel").notNull(),
  error: text("error"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
  completedAt: timestamp("completedAt", { mode: "date" }),
});

export const shareLinksTable = pgTable("share_link", {
  id: text("id").primaryKey(),
  projectId: text("projectId")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull(),
  revokedAt: timestamp("revokedAt", { mode: "date" }),
});

export const jobsTable = pgTable(
  "job",
  {
    id: text("id").notNull(),
    queue: text("queue").notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull(),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
    completedAt: timestamp("completedAt", { mode: "date" }),
    failed: boolean("failed").notNull().default(false),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.queue] }),
  }),
);
