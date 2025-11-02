import { readdir, unlink, stat } from "fs/promises";

const MS_IN_DAY =
  1000 * // ms
  60 * // secs
  60 * // mins
  24; // hrs

export class CleanupAudioFilesTask {
  private now = Date.now();
  private oneDayAgo = this.now - MS_IN_DAY;

  async perform() {
    console.log("Running cleanup audio files task");
    const files = await readdir("./audio");
    const results = await Promise.allSettled(
      files.map((file) => this.worker(`./audio/${file}`))
    );
    results.forEach((r) => {
      if (r.status === "rejected") console.error(r.reason);
    });
    const successfullyRemoved = results.filter(
      (r) => r.status === "fulfilled" && r.value
    );
    const errored = results.filter((r) => r.status === "rejected");
    console.log(`Successfully removed ${successfullyRemoved.length} file(s)`);
    console.log(`Errored on ${errored.length} file(s)`);
  }

  private async worker(file: string) {
    const { mtimeMs } = await stat(file);
    if (mtimeMs < this.oneDayAgo) {
      await unlink(file);
      return true;
    }
    return false;
  }
}
