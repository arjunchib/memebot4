import { $ } from "bun";
import { s3 } from "../services/s3_service";

export class BackupDatabaseTask {
  #backupFile?: string;

  async perform() {
    console.log("Start database backup");

    console.log("Creating backup file");
    this.backupFile; // create timestamp when dumping
    const dump = await $`sqlite3 memebot.sqlite .dump`.arrayBuffer();

    console.log("Compressing backup");
    const compressed = await $`brotli - < ${dump}`.arrayBuffer();

    console.log("Uploading backup");
    await s3.private.write(this.backupFile, compressed);

    console.log("Copying to latest backup file");
    await s3.private.copy(this.backupFile, `backup/backup.sql.br`);

    console.log("Successfully backed up database");
  }

  private get backupFile() {
    return (this.#backupFile ||= `backup/${new Date().toISOString()}.sql.br`);
  }
}
