import { eq } from "drizzle-orm";
import { db } from "../../db/database";
import { KV } from "../../db/schema";

export class KvService {
  async set<T>(key: string, value: T, exp?: Date) {
    await db.insert(KV).values({ key, value, exp }).onConflictDoNothing();
  }

  async get<T>(key: string): Promise<T> {
    const { value } =
      (await db.query.kv.findFirst({
        where: eq(KV.key, key),
        columns: { value: true },
      })) ?? {};
    return value as T;
  }
}

export const kv = new KvService();
