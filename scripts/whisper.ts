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

const url = `${env.assetBaseUrl}/audio/${meme.id}.webm`;
console.log(meme.name, url);

const prompt = args.at(1) || "";

console.time("transcribe");

const json =
  await $`ffmpeg -loglevel quiet -i ${url} -f wav -acodec pcm_f32le -ar 16000 -ac 1 - | ../whisper.cpp/build/bin/whisper-cli --model ../whisper.cpp/models/ggml-large-v3-turbo.bin -tr -np -nt -ojf -f -`.json();

// console.log(json);

const tokens = json.transcription[0].tokens as {
  text: string;
  timestamps: {
    from: string;
    to: string;
  };
  offsets: {
    from: number;
    to: number;
  };
  id: number;
  p: number;
  t_dtw: number;
}[];

const format = 0;
const red = 31;
const green = 32;
const yellow = 33;

console.log(
  tokens
    .filter((token) => token.id !== 50257)
    .map((token) => {
      let color = green;
      if (token.p < 0.333333) {
        color = red;
      } else if (token.p < 0.666666) {
        color = yellow;
      }
      return `\u001b[${format};${color}m${token.text}\u001b[0m`;
    })
    .join(""),
);

console.log();
console.timeEnd("transcribe");
