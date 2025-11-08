import { db } from "../../db/database";
import { lte } from "drizzle-orm";
import { KV } from "../../db/schema";

export class CleanupKvExpiredTask {
  private now = new Date();

  async perform() {
    console.log("Start cleanup expired KV");
    const expired = await db
      .delete(KV)
      .where(lte(KV.exp, this.now))
      .returning();
    console.log(`Successfully removed ${expired.length} entries(s)`);
  }
}
