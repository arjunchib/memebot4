// Leaving for posterity but this does not work currently. Need to install @huggingface/transformers.js

import {
  AutoProcessor,
  AutoTokenizer,
  pipeline,
} from "@huggingface/transformers";
import { env } from "../app/services/env_service";
import { db } from "../db/database";
import { $ } from "bun";
import { eq, sql } from "drizzle-orm";
import { Meme } from "../db/schema";

async function transcribeAudio(audio: Float32Array) {
  const transcriber = await pipeline(
    "automatic-speech-recognition",
    "distil-whisper/distil-large-v3",
    // "Xenova/whisper-medium",
    {
      dtype: "fp32",
    }
  );

  const promptText = "Mets";

  // Get the processor/tokenizer (often integrated within the pipeline, but shown here for clarity if needed separately)
  // For simplicity, we can rely on the pipeline's internal mechanisms if available,
  // or manually generate the prompt_ids.
  // The core transformers library approach is to use the processor.get_prompt_ids()

  let prompt_ids = (
    await AutoTokenizer.from_pretrained("distil-whisper/distil-large-v3")
  ).encode(promptText, {
    add_special_tokens: false,
  });

  let bad = (
    await AutoTokenizer.from_pretrained("distil-whisper/distil-large-v3")
  ).encode("match", {
    add_special_tokens: false,
  });

  // const force_words = transcriber.tokenizer("the mets", {
  //   add_prefix_space: true,
  //   add_special_tokens: false,
  // }).input_ids;
  // const bad_words = transcriber.tokenizer("match", {
  //   add_prefix_space: true,
  //   add_special_tokens: false,
  // }).input_ids;
  // const force_words = transcriber.tokenizer.encode("the mets");
  // const bad_words = transcriber.tokenizer.encode("match");
  const output = await transcriber(audio, {
    task: "translate",
    // forced_decoder_ids: [prompt_ids],
    // force_words_ids: [force_words],
    // bad_words_ids: [bad],
    // num_beams: 5,
    // do_sample: true,
    generation_kwargs: {
      // prompt_ids: [prompt_ids],
    },
  });
  if (Array.isArray(output)) throw new Error("unexpected array");
  return output.text;
}

// Example usage (assuming audioBuffer is an AudioBuffer object)
// const [meme] = await db
//   .select({ id: Meme.id, name: Meme.name })
//   .from(Meme)
//   .orderBy(sql`RANDOM()`)
//   .limit(1);
const meme = await db.query.memes.findFirst({
  where: eq(Meme.name, "themets"),
});
if (!meme) throw new Error("no meme");
const url = `${env.s3Endpoint}/${env.s3Bucket}/audio/${meme.id}.webm`;
console.log(meme.name, url);
// const res = await fetch(
//   `${env.s3Endpoint}/${env.s3Bucket}/audio/${meme.id}.webm`
// );
// const myAudioBuffer = await res.arrayBuffer();
const buffer =
  await $`ffmpeg -i ${url} -f f32le -acodec pcm_f32le -ar 16000 -ac 1 -`.arrayBuffer();

console.time("transcribe");
const transcription = await transcribeAudio(new Float32Array(buffer));
console.log(transcription);
console.timeEnd("transcribe"); // Output: Loop Execution: 123.456ms (example output)
