import { S3Client, PutObjectAclCommand } from "@aws-sdk/client-s3";

const prefix = "audio/";

if (!Bun.env.S3_ACCESS_KEY_ID) throw new Error("Missing S3_ACCESS_KEY_ID");
if (!Bun.env.S3_SECRET_ACCESS_KEY)
  throw new Error("Missing S3_SECRET_ACCESS_KEY");
if (!Bun.env.S3_ENDPOINT) throw new Error("Missing S3_ENDPOINT");

const s3Client = new S3Client({
  endpoint: Bun.env.S3_ENDPOINT,
  region: "us-east-1",
  credentials: {
    accessKeyId: Bun.env.S3_ACCESS_KEY_ID,
    secretAccessKey: Bun.env.S3_SECRET_ACCESS_KEY,
  },
});

async function putObjectAcl(objectKey: string) {
  const command = new PutObjectAclCommand({
    Bucket: Bun.env.S3_BUCKET,
    Key: objectKey,
    ACL: "public-read", // Example: set ACL to public-read
  });

  try {
    const response = await s3Client.send(command);
    console.log("Object updated successfully with ACL:", response);
  } catch (error) {
    console.error("Error updating object with ACL:", error);
  }
}

async function* objectGenerator() {
  let continuationToken: string | undefined;
  let done = false;
  while (!done) {
    const { nextContinuationToken, contents, isTruncated } = await Bun.s3.list({
      prefix,
      continuationToken,
    });
    done = !isTruncated;
    continuationToken = nextContinuationToken;
    if (!contents) throw new Error("Missing contents");
    for (const item of contents) {
      yield item;
    }
  }
}

const producer = objectGenerator();

let count = 0;

async function consumer() {
  for await (const { key } of producer) {
    await putObjectAcl(key);
    console.log(`${++count}: ${key}`);
  }
}

function range(end: number): Generator<number>;
function range(start: number, end: number): Generator<number>;
function* range(startOrEnd: number, end?: number) {
  if (!end) {
    end = startOrEnd;
    startOrEnd = 0;
  }
  for (let i = startOrEnd; i < end; i++) {
    yield i;
  }
}

const consumers = Array.from(range(10)).map(() => consumer());

await Promise.all(consumers);

console.log("Finished!");
