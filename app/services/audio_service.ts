import { stat } from "fs";
import { unlink } from "fs/promises";

type AudioServiceState =
  | "init"
  | "download"
  | "trim"
  | "loudness1"
  | "loudness2"
  | "clean"
  | "finish";

interface AudioServiceOptions {
  id: string;
  sourceUrl: string;
  start?: string | undefined;
  end?: string | undefined;
  onStateChange?: (state: AudioServiceState) => void;
}

interface LoudnormResults {
  input_i: number;
  input_lra: number;
  input_tp: number;
  input_thresh: number;
  output_i: number;
  output_tp: number;
  output_lra: number;
  output_thresh: number;
  normalization_type: string;
  target_offset: number;
}

export class AudioService {
  private state: AudioServiceState = "init";

  constructor(private options: AudioServiceOptions) {}

  async download() {
    this.emit("download");
    const { parsedSourceUrl, rawFile } = await this.ytdlp();
    this.emit("trim");
    const trimmedFile = await this.trimAndConvert(rawFile);
    this.emit("loudness1");
    const loudness1 = await this.loudnorm1(trimmedFile);
    this.emit("loudness2");
    const { normalizedFile, loudness2 } = await this.loudnorm2(
      trimmedFile,
      loudness1
    );
    this.emit("finish");
    return { file: normalizedFile, loudness: loudness2, parsedSourceUrl };
  }

  public onStateChange(fn: (state: typeof this.state) => void) {
    fn(this.state);
  }

  private emit(state: AudioServiceState) {
    this.state = state;
    this.options.onStateChange?.(this.state);
  }

  private async ytdlp() {
    const args = [
      "yt-dlp",
      "-f",
      "ba/b",
      "--prefer-free-formats",
      this.options.sourceUrl,
      "--print",
      "webpage_url,filename",
      "--no-simulate",
      "-o",
      `./audio/raw-${this.options.id}.%(ext)s`,
    ];
    const proc = Bun.spawn(args);
    const text = await proc.stdout.text();
    const [parsedSourceUrl, rawFile] = text.trim().split("\n");
    if (!parsedSourceUrl || !rawFile) {
      throw new Error("Could not find audio url");
    }
    return { parsedSourceUrl, rawFile };
  }

  private async trimAndConvert(rawFile: string) {
    const trimmedFile = `./audio/trimmed-${this.options.id}.webm`;
    const args = [];
    if (this.options.start) {
      args.push("-ss", this.options.start);
    }
    if (this.options.end) {
      args.push("-to", this.options.end);
    }
    args.push("-i", rawFile, "-c:a", "libopus", "-vn", trimmedFile);
    await this.ffmpeg(...args);
    return trimmedFile;
  }

  private async loudnorm1(trimmedFile: string) {
    return await this.loudnorm(trimmedFile);
  }

  private async loudnorm2(trimmedFile: string, loudness: LoudnormResults) {
    const normalizedFile = `./audio/${this.options.id}.webm`;
    const loudness2 = await this.loudnorm(
      trimmedFile,
      normalizedFile,
      loudness
    );
    return { normalizedFile, loudness2 };
  }

  private async ffmpeg(...args: string[]) {
    args = ["ffmpeg", "-hide_banner", "-y", ...args];
    const proc = Bun.spawn(args, { stderr: "pipe" });
    return await proc.stderr.text();
  }

  private async loudnorm(
    inFile: string,
    outFile?: string,
    loudness?: LoudnormResults
  ) {
    // Build command
    let cmd = ["-i", inFile];

    // Build filter
    let filter = "loudnorm=I=-23:LRA=7:tp=-2";
    if (loudness) {
      filter += `:measured_I=${loudness.input_i}:measured_LRA=${loudness.input_lra}:measured_tp=${loudness.input_tp}:measured_thresh=${loudness.input_thresh}`;
    }
    filter += ":print_format=json";
    cmd.push("-af", filter);

    // Add options
    if (loudness && outFile) {
      cmd.push(outFile);
    } else {
      cmd.push("-f", "null", "-");
    }

    // Run
    const result = await this.ffmpeg(...cmd);

    // Parse results
    const loudnormStr = result
      .split("[Parsed_loudnorm_0")[1]
      ?.match(/{[\s\S]*}/)?.[0];
    if (!loudnormStr) throw new Error("Could not parse results");
    const loudnorm = JSON.parse(loudnormStr);
    for (const field in loudnorm) {
      if (field !== "normalization_type") {
        loudnorm[field] = Number(loudnorm[field]);
      }
    }

    return loudnorm as LoudnormResults;
  }
}
