import { $ } from "bun";
import { env } from "../services/env_service";
import { CopyObjectCommand, S3Client } from "@aws-sdk/client-s3";

export class BackupDatabaseTask {
  private s3Client = new S3Client({
    endpoint: env.s3Endpoint,
    region: "us-east-1",
    credentials: {
      accessKeyId: env.s3AccessKeyId,
      secretAccessKey: env.s3SecretAccessKey,
    },
  });

  #backupFile?: string;

  async perform() {
    console.log("Start database backup");

    console.log("Creating backup file");
    this.backupFile; // create timestamp when dumping
    const dump = await $`sqlite3 memebot.sqlite .dump`.arrayBuffer();

    console.log("Compressing backup");
    const compressed = await $`brotli - < ${dump}`.arrayBuffer();

    console.log("Uploading backup");
    await Bun.s3.write(this.backupFile, compressed, {
      acl: "bucket-owner-full-control",
    });

    console.log("Copying to latest backup file");
    const command = new CopyObjectCommand({
      Bucket: env.s3Bucket,
      CopySource: `${env.s3Bucket}/${this.backupFile}`,
      Key: `backup/backup.sql.br`,
      ACL: "bucket-owner-full-control",
    });
    await this.s3Client.send(command);

    console.log("Successfully backed up database");
  }

  private get backupFile() {
    return (this.#backupFile ||= `backup/${new Date().toISOString()}.sql.br`);
  }
}
