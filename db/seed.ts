import { $ } from "bun";
import { env } from "../app/services/env_service";

const AWS_ENV = {
  AWS_ACCESS_KEY_ID: env.s3AccessKeyId,
  AWS_SECRET_ACCESS_KEY: env.s3SecretAccessKey,
  AWS_ENDPOINT_URL: env.s3Endpoint,
};

console.log("Downloading backup");
let buffer = await Bun.s3.file("backup/backup.sql.br").arrayBuffer();

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
