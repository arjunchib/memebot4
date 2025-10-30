import { $ } from "bun";

if (!Bun.env.S3_ACCESS_KEY_ID) throw new Error("Missing S3_ACCESS_KEY_ID");
if (!Bun.env.S3_SECRET_ACCESS_KEY)
  throw new Error("Missing S3_SECRET_ACCESS_KEY");
if (!Bun.env.S3_ENDPOINT) throw new Error("Missing S3_ENDPOINT");
if (!Bun.env.SEED_BUCKET) throw new Error("Missing SEED_BUCKET");

const AWS_ENV = {
  AWS_ACCESS_KEY_ID: Bun.env.S3_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: Bun.env.S3_SECRET_ACCESS_KEY,
  AWS_ENDPOINT_URL: Bun.env.S3_ENDPOINT,
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
await $`aws s3 sync s3://${Bun.env.SEED_BUCKET}/audio s3://${Bun.env.S3_BUCKET}/audio --delete --acl public-read`.env(
  AWS_ENV
);

console.log("Sync waveform files");
await $`aws s3 sync s3://${Bun.env.SEED_BUCKET}/waveform s3://${Bun.env.S3_BUCKET}/waveform --delete --acl public-read`.env(
  AWS_ENV
);
