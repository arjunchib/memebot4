import { eq } from "drizzle-orm";
import { db } from "../../db/database";
import { KV } from "../../db/schema";

export class KvService {
  async set(key: string, value: unknown) {
    await db.insert(KV).values({ key, value }).onConflictDoNothing();
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
