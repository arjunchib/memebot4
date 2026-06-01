import { db } from "../db/database";
import { eq, sql } from "drizzle-orm";
import { Meme } from "../db/schema";
import { transcriptionService } from "../app/services/transcription_service";

const args = Bun.argv.slice(2);

async function getMeme() {
  if (args[0]) {
    return await db.query.memes.findFirst({
      where: eq(Meme.name, args[0]),
    });
  } else {
    const [meme] = await db
      .select({ id: Meme.id, name: Meme.name })
      .from(Meme)
      .orderBy(sql`RANDOM()`)
      .limit(1);
    return meme;
  }
}

const meme = await getMeme();

if (!meme) throw new Error("No meme");

console.log(`Transcribing ${meme.name}`);

console.time("transcribe");

await transcriptionService.transcibe(meme.id);

console.log();
console.timeEnd("transcribe");
