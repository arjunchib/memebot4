import { env } from "../app/services/env_service";
import { db } from "../db/database";
import { $ } from "bun";
import { eq, sql } from "drizzle-orm";
import { Meme } from "../db/schema";

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

const url = `${env.s3Endpoint}/${env.s3Bucket}/audio/${meme.id}.webm`;
console.log(meme.name, url);

const prompt = args.at(1) || "";

console.time("transcribe");
console.log(
  await $`ffmpeg -loglevel quiet -i ${url} -f wav -acodec pcm_f32le -ar 16000 -ac 1 - | ../whisper.cpp/build/bin/whisper-cli --model ~/.models/ggml-large-v3-turbo.bin -tr -np -pc -nt -of -f -`.text()
);
console.log();
console.timeEnd("transcribe");
