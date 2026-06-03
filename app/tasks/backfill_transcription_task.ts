import { transcriptionService } from "../services/transcription_service";
import { db } from "../../db/database";
import { Meme, Transcription } from "../../db/schema";
import { eq, isNull, not } from "drizzle-orm";

export class BackfillTranscriptionTask {
  async perform() {
    const memes = await db
      .select({ id: Meme.id, name: Meme.name })
      .from(Meme)
      .leftJoin(Transcription, eq(Meme.id, Transcription.memeId))
      .where(isNull(Transcription.memeId))
      .limit(10);

    let i = memes.length;

    for (const { id, name } of memes) {
      const t0 = performance.now();
      await transcriptionService.transcibe(id);
      const t1 = performance.now();
      console.log(
        `[${i--}] Transcribed ${name} in ${((t1 - t0) / 1000).toFixed(3)}s`,
      );
    }
  }
}
