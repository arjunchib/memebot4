import { $ } from "bun";
import { env } from "./env_service";
import { db } from "../../db/database";
import { Transcription } from "../../db/schema";
import { sql } from "drizzle-orm";

export interface TranscriptionToken {
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
}

export interface TranscriptionJson {
  transcription: {
    text: string;
    tokens: TranscriptionToken[];
  }[];
}

const FORMAT = 0;

enum AnsiColor {
  Gray = 30,
  Red,
  Green,
  Yellow,
  Blue,
  Pink,
  Cyan,
  White,
}

export class TranscriptionService {
  static COLORS = [
    AnsiColor.Red,
    AnsiColor.Yellow,
    AnsiColor.Green,
    AnsiColor.Cyan,
  ];

  async transcibe(id: string, file?: string) {
    const url = file || `${env.assetBaseUrl}/audio/${id}.webm`;

    const result =
      (await $`ffmpeg -loglevel quiet -i ${url} -f wav -acodec pcm_f32le -ar 16000 -ac 1 - | ../whisper.cpp/build/bin/whisper-cli --model ../whisper.cpp/models/ggml-large-v3-turbo.bin -tr -np -nt -ojf -f -`.json()) as TranscriptionJson;

    await db
      .insert(Transcription)
      .values({
        memeId: id,
        json: result,
        text: result.transcription
          .map((t) => t.text)
          .join("")
          .trim(),
        isHuman: false,
        // TODO: remove once this is fixed https://github.com/drizzle-team/drizzle-orm/issues/2388
        updatedAt: sql`(unixepoch())`,
      })
      .onConflictDoUpdate({
        target: Transcription.memeId,
        set: {
          json: sql`excluded.json`,
          text: sql`excluded.text`,
          updatedAt: sql`excluded.updated_at`,
          isHuman: false,
        },
      });
  }

  colorizeJson(json: TranscriptionJson) {
    const tokens = json.transcription.flatMap((t) => t.tokens);

    const text = tokens
      .filter((token) => token.id !== 50257)
      .reduce((acc, token, i, arr) => {
        const first = i === 0;
        const last = i === arr.length - 1;
        const color = this.color(token.p);

        if (first) {
          acc += `\u001b[${FORMAT};${color}m${token.text.trimStart()}`;
        } else if (color !== this.color(arr[i - 1]?.p)) {
          acc += `\u001b[0m\u001b[${FORMAT};${color}m${token.text}`;
        } else {
          acc += token.text;
        }

        if (last) acc += `\u001b[0m`;

        return acc;
      }, "");

    // Color text does not work above 1000 characters, fall back to plain text
    if (text.length <= 1000) {
      return text;
    } else {
      return tokens
        .map((t) => t.text)
        .join("")
        .trim();
    }
  }

  colorizeHuman(text: string) {
    // Use last color for 100% confidence
    const color = TranscriptionService.COLORS.at(-1);
    const colorText = `\u001b[${FORMAT};${color}m${text}\u001b[0m`;

    // Color text does not work above 1000 characters, fall back to plain text
    return colorText.length <= 1000 ? colorText : text;
  }

  private color(p?: number) {
    if (p == null) throw new Error("Missing probability!");

    // The last color value is only for when p = 1.0
    const i = Math.floor(p * (TranscriptionService.COLORS.length - 1));

    return TranscriptionService.COLORS[i];
  }
}

export const transcriptionService = new TranscriptionService();
