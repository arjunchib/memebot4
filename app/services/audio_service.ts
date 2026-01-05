import { readdir, unlink } from "fs/promises";

interface AudioServiceOptions {
  id: string;
  sourceUrl: string;
  start?: string | undefined;
  end?: string | undefined;
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
  constructor(private options: AudioServiceOptions) {}

  async download() {
    const { parsedSourceUrl, rawFile } = await this.ytdlp();
    await this.verifyDownload(rawFile);
    await this.trimAndConvert(rawFile);
    let loudness = await this.loudnorm();
    loudness = await this.loudnorm(loudness);
    const [stats] = await Promise.all([this.ffprobe(), this.waveform()]);
    return {
      file: this.file,
      waveformFile: this.waveformFile,
      loudness,
      parsedSourceUrl,
      stats,
    };
  }

  private get file() {
    return `./audio/${this.options.id}.webm`;
  }

  private get trimmedFile() {
    return `./audio/trimmed-${this.options.id}.webm`;
  }

  private get waveformFile() {
    return `./audio/waveform-${this.options.id}.png`;
  }

  private async ytdlp() {
    const hash = Bun.hash.crc32(this.options.sourceUrl);
    const files = await readdir("./audio");
    const file = files.find((f) => f.startsWith(hash.toString()));
    if (file) {
      return {
        parsedSourceUrl: this.options.sourceUrl,
        rawFile: `./audio/${file}`,
      };
    }
    const args = [
      "yt-dlp",
      "--js-runtimes",
      "bun",
      "--remote-components",
      "ejs:npm",
      "-f",
      "ba/b",
      "--prefer-free-formats",
      this.options.sourceUrl,
      "--print",
      "webpage_url,filename",
      "--no-simulate",
      "-o",
      `./audio/${hash}.%(ext)s`,
    ];
    console.log(args.join(" "));
    const proc = Bun.spawn(args);
    const text = await proc.stdout.text();
    const [parsedSourceUrl, rawFile] = text.trim().split("\n");
    if (!parsedSourceUrl || !rawFile) {
      throw new Error("Could not find audio url");
    }
    return { parsedSourceUrl, rawFile };
  }

  private async verifyDownload(rawFile: string) {
    if (!(await Bun.file(rawFile).exists()))
      throw new Error("File not downloaded");
  }

  private async trimAndConvert(rawFile: string) {
    const args = [];
    if (this.options.start) {
      args.push("-ss", this.options.start);
    }
    if (this.options.end) {
      args.push("-to", this.options.end);
    }
    args.push("-i", rawFile, "-c:a", "libopus", "-vn", this.trimmedFile);
    await this.ffmpeg(...args);
  }

  private async ffmpeg(...args: string[]) {
    args = ["ffmpeg", "-hide_banner", "-y", ...args];
    console.log(args.join(" "));
    const proc = Bun.spawn(args, { stderr: "pipe" });
    return await proc.stderr.text();
  }

  private async loudnorm(loudness?: LoudnormResults) {
    // Build command
    let cmd = ["-i", this.trimmedFile];

    // Build filter
    let filter = "loudnorm=I=-23:LRA=7:tp=-2";
    if (loudness) {
      filter += `:measured_I=${loudness.input_i}:measured_LRA=${loudness.input_lra}:measured_tp=${loudness.input_tp}:measured_thresh=${loudness.input_thresh}`;
    }
    filter += ":print_format=json";
    cmd.push("-af", filter);

    // Add options
    if (loudness) {
      cmd.push(this.file);
    } else {
      cmd.push("-f", "null", "-");
    }

    // Run
    const result = await this.ffmpeg(...cmd);

    // Parse results
    const loudnormStr = result
      .split("[Parsed_loudnorm_0")[1]
      ?.match(/{[\s\S]*}/)?.[0];
    if (!loudnormStr) {
      console.error(result);
      throw new Error("Could not parse results");
    }
    const loudnorm = JSON.parse(loudnormStr);
    for (const field in loudnorm) {
      if (field !== "normalization_type") {
        loudnorm[field] = Number(loudnorm[field]);
      }
    }

    return loudnorm as LoudnormResults;
  }

  private async ffprobe() {
    const proc = Bun.spawn([
      "ffprobe",
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      this.file,
    ]);
    const stats = (await proc.stdout.json())["format"];
    return {
      duration: parseFloat(stats["duration"]),
      size: parseInt(stats["size"]),
      bitRate: parseInt(stats["bit_rate"]),
    };
  }

  private async waveform() {
    return await this.ffmpeg(
      "-i",
      this.file,
      "-filter_complex",
      "compand,showwavespic=s=512x128:colors=white",
      "-frames:v",
      "1",
      "-c:v",
      "png",
      "-f",
      "image2",
      this.waveformFile
    );
  }
}
