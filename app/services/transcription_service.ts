import { $ } from "bun";
import { env } from "./env_service";

interface TranscriptionJsonResult {
  transcription: {
    tokens: {
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
  }[];
}

const FORMAT = 0;
const RED = 31;
const GREEN = 32;
const YELLOW = 33;

export class TranscriptionService {
  async getTranscriptionJson(id: string) {
    const url = `${env.assetBaseUrl}/audio/${id}.webm`;
    return (await $`ffmpeg -loglevel quiet -i ${url} -f wav -acodec pcm_f32le -ar 16000 -ac 1 - | ../whisper.cpp/build/bin/whisper-cli --model ~/.models/ggml-large-v3-turbo.bin -tr -np -nt -ojf -f -`.json()) as TranscriptionJsonResult;
  }

  async transcribeColor(id: string) {
    const json = await this.getTranscriptionJson(id);
    const transcriptions = json.transcription;
    const tokens = transcriptions.flatMap((t) => t.tokens);

    return tokens
      .filter((token) => token.id !== 50257)
      .map((token, i) => {
        let color = GREEN;
        if (token.p < 0.333333) {
          color = RED;
        } else if (token.p < 0.666666) {
          color = YELLOW;
        }
        const text = i === 0 ? token.text.trimStart() : token.text;
        return `\u001b[${FORMAT};${color}m${text}\u001b[0m`;
      })
      .join("");
  }
}

export const transcriptionService = new TranscriptionService();
