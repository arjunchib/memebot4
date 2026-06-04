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
      .where(isNull(Transcription.memeId));

    let i = memes.length;

    for (const { id, name } of memes) {
      const t0 = performance.now();
      try {
        await transcriptionService.transcibe(id);
      } catch (e) {
        console.error(`Failed transcribing ${name}`);
        throw e;
      }
      const t1 = performance.now();
      console.log(
        `[${i--}] Transcribed ${name} in ${((t1 - t0) / 1000).toFixed(3)}s`,
      );
    }
  }
}
