import { getEnv, hasDatabase } from "./env";

type BossLike = {
  start(): Promise<void>;
  send(queue: string, payload: object): Promise<string | null>;
};

let bossPromise: Promise<BossLike | null> | null = null;

async function getBoss() {
  if (!bossPromise) {
    bossPromise = (async () => {
      if (!hasDatabase()) {
        return null;
      }

      const env = getEnv();
      const bossModule = (await import("pg-boss")) as unknown as {
        default?: new (options: { connectionString: string; schema: string }) => BossLike;
      };
      const BossCtor = bossModule.default;
      if (!BossCtor) throw new Error("pg-boss constructor unavailable");

      const boss = new BossCtor({
        connectionString: env.DATABASE_URL!,
        schema: env.PG_BOSS_SCHEMA ?? "pgboss",
      });
      await boss.start();
      return boss;
    })();
  }

  return bossPromise;
}

export async function enqueueOrRun<T extends object>(
  queue: string,
  payload: T,
  handler: (payload: T) => Promise<void>,
) {
  const boss = await getBoss();
  if (!boss) {
    await handler(payload);
    return { queued: false };
  }

  await boss.send(queue, payload);
  return { queued: true };
}
