import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { cache } from "react";
import { getEnv, hasDatabase } from "../env";

export const getDb = cache(() => {
  if (!hasDatabase()) {
    return null;
  }

  const connection = postgres(getEnv().DATABASE_URL!, {
    max: 1,
    prepare: false,
  });

  return drizzle(connection);
});
