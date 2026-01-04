import { S3Client as BunS3Client, type S3Options } from "bun";
import { S3Client as AWSS3Client, CopyObjectCommand } from "@aws-sdk/client-s3";
import { env } from "./env_service";

class S3Service {
  public public = new S3Client({ bucket: env.s3BucketPublic });
  public private = new S3Client();
}

class S3Client extends BunS3Client {
  private _awsClient?: AWSS3Client;

  constructor(private options?: S3Options) {
    super(options);
  }

  private get awsClient() {
    return (this._awsClient ||= new AWSS3Client({
      region: this.options?.region ?? "auto",
      endpoint: this.options?.endpoint ?? env.s3Endpoint,
      credentials: {
        accessKeyId: this.options?.accessKeyId ?? env.s3AccessKeyId,
        secretAccessKey: this.options?.secretAccessKey ?? env.s3SecretAccessKey,
      },
    }));
  }

  async copy(source: string, destination: string) {
    const bucket = this.options?.bucket ?? env.s3Bucket;
    const command = new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${source}`,
      Key: destination,
    });
    await this.awsClient.send(command);
  }

  listAll(options?: Bun.S3ListObjectsOptions) {
    return new PromisePool(this.listAllItems(options));
  }

  private async *listAllItems(options?: Bun.S3ListObjectsOptions) {
    let continuationToken: string | undefined;
    let done = false;
    let index = 0;
    while (!done) {
      const { nextContinuationToken, contents, isTruncated } = await this.list({
        ...options,
        continuationToken,
      });
      done = !isTruncated;
      continuationToken = nextContinuationToken;
      if (!contents) throw new Error("Missing contents");
      for (const value of contents) {
        yield { value, index: index++ };
      }
    }
  }
}

class PromisePool<T> {
  constructor(private generator: AsyncGenerator<{ value: T; index: number }>) {}

  private async consume(
    callback: (value: T, index: number) => Promise<void> | void
  ) {
    for await (const { value, index } of this.generator) {
      await callback(value, index);
    }
  }

  async forEach(callback: (value: T, index: number) => Promise<void> | void) {
    const workers = Array.from(range(10)).map(() => this.consume(callback));
    return await Promise.all(workers);
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

export const s3 = new S3Service();
