import { $, S3Client } from "bun";
import { env } from "../app/services/env_service";

// Don't run the seed file until we fix this
throw new Error("Not implemented yet!");

if (!env.seedBucket) {
  // Abort if seed value is not set.
  // Don't set this value in prod,
  // since we never want to seed on prod!
  throw new Error("SEED_BUCKET value not set!");
}

const AWS_ENV = {
  AWS_ACCESS_KEY_ID: env.s3AccessKeyId,
  AWS_SECRET_ACCESS_KEY: env.s3SecretAccessKey,
  AWS_ENDPOINT_URL: env.s3Endpoint,
};

const s3 = new S3Client({ bucket: env.seedBucket });

console.log("Downloading backup");
let buffer = await s3.file("backup/backup.sql.br").arrayBuffer();

console.log("Decompressing backup");
buffer = await $`brotli -d - < ${buffer}`.arrayBuffer();

console.log("Delete current database");
await $`rm memebot.sqlite*`;

console.log("Seed new db");
await $`sqlite3 memebot.sqlite < ${buffer}`;

console.log("Sync audio files");
await $`aws s3 sync s3://${env.seedBucket}/audio s3://${env.s3Bucket}/audio --delete --acl public-read`.env(
  AWS_ENV
);

console.log("Sync waveform files");
await $`aws s3 sync s3://${env.seedBucket}/waveform s3://${env.s3Bucket}/waveform --delete --acl public-read`.env(
  AWS_ENV
);
