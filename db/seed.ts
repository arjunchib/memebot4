import { $, S3Client } from "bun";
import { env } from "../app/services/env_service";

if (!env.seedBucketPrivate || !env.seedBucketPublic) {
  throw new Error("SEED_BUCKET_PRIVATE and SEED_BUCKET_PUBLIC must be set!");
}

const AWS_ENV = {
  AWS_ACCESS_KEY_ID: env.s3AccessKeyId,
  AWS_SECRET_ACCESS_KEY: env.s3SecretAccessKey,
  AWS_ENDPOINT_URL: env.s3Endpoint,
};

const s3 = new S3Client({ bucket: env.seedBucketPrivate });

console.log("Downloading backup");
const compressed = await s3.file("backup/backup.sql.br").arrayBuffer();

console.log("Decompressing backup");
const sql = await $`brotli -d - < ${compressed}`.arrayBuffer();

console.log("Delete current database");
await $`rm memebot.sqlite*`;

console.log("Seed new db");
await $`sqlite3 memebot.sqlite < ${sql}`;

console.log("Sync audio files");
await $`aws s3 sync s3://${env.seedBucketPublic}/audio s3://${env.s3BucketPublic}/audio --delete --acl public-read`.env(
  AWS_ENV
);

console.log("Sync waveform files");
await $`aws s3 sync s3://${env.seedBucketPublic}/waveform s3://${env.s3BucketPublic}/waveform --delete --acl public-read`.env(
  AWS_ENV
);
